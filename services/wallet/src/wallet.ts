import {
  AssetSymbol,
  ASSET_REGISTRY,
  DepositRecord,
  DepositStatus,
  WithdrawalRequest,
  WithdrawalStatus,
  TransferRecord,
  TransferType,
  TransferStatus,
  AccountType,
  TransactionType,
  EntryDirection,
  Decimal,
  Logger
} from '@syncnode/common';
import { db } from '@syncnode/database';
import { ledgerService } from '@syncnode/ledger';
import { BlockchainAdapterFactory } from '@syncnode/blockchain';
import { riskEngine } from '@syncnode/risk';
import { verifyTotp } from '@syncnode/security';

export class WalletService {
  private readonly logger = new Logger('WalletService');

  /**
   * Derive or retrieve a deposit address for a specific user and network.
   */
  public getDepositAddress(userId: string, asset: AssetSymbol, network?: string): { address: string; asset: AssetSymbol; network: string } {
    const adapter = BlockchainAdapterFactory.getAdapter(asset, network);
    const address = adapter.generateAddress(userId);
    return {
      address,
      asset,
      network: network || adapter.networkName
    };
  }

  /**
   * Ingest blockchain deposit detection and credit customer balance upon reaching required confirmations.
   */
  public processDeposit(params: {
    userId: string;
    asset: AssetSymbol;
    network: string;
    address: string;
    txHash: string;
    amount: string;
    confirmations: number;
  }): DepositRecord {
    if (db.circuitBreakers.isDepositsPaused) {
      throw new Error('Deposits are currently suspended across the exchange');
    }

    const assetDef = ASSET_REGISTRY[params.asset];
    if (!assetDef || !assetDef.isDepositEnabled) {
      throw new Error(`Deposits are disabled for asset ${params.asset}`);
    }

    if (new Decimal(params.amount).lt(assetDef.minDeposit)) {
      throw new Error(`Deposit amount ${params.amount} is below minimum ${assetDef.minDeposit}`);
    }

    // Check if deposit with same txHash has already been processed
    const existing = Array.from(db.deposits.values()).find((d) => d.txHash === params.txHash);
    if (existing && existing.status === DepositStatus.CREDITED) {
      this.logger.info(`Deposit ${params.txHash} already credited. Skipping duplicate.`);
      return existing;
    }

    const depositId = existing?.id || `dep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const isConfirmed = params.confirmations >= assetDef.confirmationsRequired;
    const status = isConfirmed ? DepositStatus.CREDITED : DepositStatus.CONFIRMING;

    const deposit: DepositRecord = {
      id: depositId,
      userId: params.userId,
      asset: params.asset,
      network: params.network,
      address: params.address,
      txHash: params.txHash,
      amount: params.amount,
      confirmations: params.confirmations,
      requiredConfirmations: assetDef.confirmationsRequired,
      status,
      createdAt: existing ? existing.createdAt : Date.now(),
      updatedAt: Date.now()
    };

    db.deposits.set(deposit.id, deposit);

    // If confirmed and not previously credited, perform atomic double-entry posting to ledger
    if (isConfirmed && (!existing || existing.status !== DepositStatus.CREDITED)) {
      ledgerService.recordTransaction(
        TransactionType.DEPOSIT,
        deposit.id,
        `dep_${params.txHash}`,
        `Deposit of ${params.amount} ${params.asset} on ${params.network} via tx ${params.txHash}`,
        [
          // Exchange Vault Hot Wallet gets debited (asset increases)
          {
            accountType: AccountType.EXCHANGE_HOT_WALLET,
            asset: params.asset,
            direction: EntryDirection.DEBIT,
            amount: params.amount
          },
          // User Available Balance gets credited (liability increases)
          {
            userId: params.userId,
            accountType: AccountType.USER_AVAILABLE,
            asset: params.asset,
            direction: EntryDirection.CREDIT,
            amount: params.amount
          }
        ]
      );

      this.logger.info(`Credited deposit ${deposit.id}: ${params.amount} ${params.asset} to user ${params.userId}`);
      db.emitEvent('deposit.credited', { deposit });
    }

    return deposit;
  }

  /**
   * Request a new withdrawal with 2FA TOTP verification, pre-withdrawal risk scoring, and balance reservation.
   */
  public async requestWithdrawal(params: {
    userId: string;
    asset: AssetSymbol;
    network?: string;
    destinationAddress: string;
    amount: string;
    totpCode?: string;
  }): Promise<WithdrawalRequest> {
    const user = db.users.get(params.userId);
    if (!user) throw new Error('User not found');

    // 1. Verify 2FA if enabled
    if (user.isTotpEnabled && user.totpSecret) {
      if (!params.totpCode || !verifyTotp(user.totpSecret, params.totpCode)) {
        throw new Error('Invalid or missing 2FA TOTP verification code');
      }
    }

    // 2. Validate destination address
    const adapter = BlockchainAdapterFactory.getAdapter(params.asset, params.network);
    if (!adapter.validateAddress(params.destinationAddress)) {
      throw new Error(`Invalid destination address for ${params.asset}: ${params.destinationAddress}`);
    }

    const assetDef = ASSET_REGISTRY[params.asset];
    if (!assetDef || !assetDef.isWithdrawalEnabled) {
      throw new Error(`Withdrawals are currently disabled for ${params.asset}`);
    }

    if (new Decimal(params.amount).lt(assetDef.minWithdrawal)) {
      throw new Error(`Withdrawal amount ${params.amount} is below minimum ${assetDef.minWithdrawal}`);
    }

    const fee = assetDef.withdrawalFee;
    const netAmount = new Decimal(params.amount).minus(fee);
    if (!netAmount.isPositive()) {
      throw new Error(`Withdrawal amount must exceed network fee of ${fee} ${params.asset}`);
    }

    // 3. Pre-Withdrawal Risk Evaluation
    const { riskScore, requiresManualReview } = riskEngine.evaluateWithdrawalRisk(
      params.userId,
      params.asset,
      params.amount
    );

    const withdrawalId = `wdr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const status = requiresManualReview ? WithdrawalStatus.RISK_REVIEW : WithdrawalStatus.APPROVED;

    // 4. Reserve Funds in Ledger (USER_AVAILABLE -> USER_WITHDRAWAL_PENDING)
    ledgerService.recordTransaction(
      TransactionType.WITHDRAWAL_LOCK,
      withdrawalId,
      `wdr_lock_${withdrawalId}`,
      `Lock ${params.amount} ${params.asset} for withdrawal ${withdrawalId}`,
      [
        {
          userId: params.userId,
          accountType: AccountType.USER_AVAILABLE,
          asset: params.asset,
          direction: EntryDirection.DEBIT,
          amount: params.amount
        },
        {
          userId: params.userId,
          accountType: AccountType.USER_WITHDRAWAL_PENDING,
          asset: params.asset,
          direction: EntryDirection.CREDIT,
          amount: params.amount
        }
      ]
    );

    const request: WithdrawalRequest = {
      id: withdrawalId,
      userId: params.userId,
      asset: params.asset,
      network: params.network || adapter.networkName,
      destinationAddress: params.destinationAddress,
      amount: params.amount,
      fee,
      netAmount: netAmount.toString(),
      status,
      riskScore,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    db.withdrawals.set(request.id, request);

    // Auto-broadcast if approved
    if (status === WithdrawalStatus.APPROVED) {
      await this.executeBroadcast(request);
    }

    db.emitEvent('withdrawal.requested', { withdrawal: request });
    return request;
  }

  /**
   * Broadcast approved withdrawal to blockchain network and finalize ledger.
   */
  public async executeBroadcast(request: WithdrawalRequest): Promise<void> {
    const adapter = BlockchainAdapterFactory.getAdapter(request.asset, request.network);
    request.status = WithdrawalStatus.PROCESSING;
    request.updatedAt = Date.now();

    try {
      const txHash = await adapter.broadcastTransaction(
        request.destinationAddress,
        request.netAmount,
        request.asset
      );

      request.txHash = txHash;
      request.status = WithdrawalStatus.CONFIRMED;
      request.updatedAt = Date.now();

      // Finalize double-entry ledger entries
      // USER_WITHDRAWAL_PENDING is debited
      // EXCHANGE_HOT_WALLET is credited (assets reduce by netAmount)
      // WITHDRAWAL_FEES is credited (exchange revenue increases by fee)
      ledgerService.recordTransaction(
        TransactionType.WITHDRAWAL_FINALIZE,
        request.id,
        `wdr_fin_${request.id}`,
        `Finalize withdrawal ${request.id} (${request.amount} ${request.asset}) to ${request.destinationAddress}`,
        [
          {
            userId: request.userId,
            accountType: AccountType.USER_WITHDRAWAL_PENDING,
            asset: request.asset,
            direction: EntryDirection.DEBIT,
            amount: request.amount
          },
          {
            accountType: AccountType.EXCHANGE_HOT_WALLET,
            asset: request.asset,
            direction: EntryDirection.CREDIT,
            amount: request.netAmount
          },
          {
            accountType: AccountType.WITHDRAWAL_FEES,
            asset: request.asset,
            direction: EntryDirection.CREDIT,
            amount: request.fee
          }
        ]
      );

      this.logger.info(`Withdrawal ${request.id} broadcasted with TX ${txHash}`);
      db.emitEvent('withdrawal.confirmed', { withdrawal: request });
    } catch (err: any) {
      this.logger.error(`Failed to broadcast withdrawal ${request.id}`, err);
      request.status = WithdrawalStatus.RISK_REVIEW;
      request.updatedAt = Date.now();
    }
  }

  /**
   * Approve a manual risk-held withdrawal by compliance officer.
   */
  public async approveWithdrawal(withdrawalId: string, adminUserId: string): Promise<WithdrawalRequest> {
    const request = db.withdrawals.get(withdrawalId);
    if (!request) throw new Error(`Withdrawal ${withdrawalId} not found`);
    if (request.status !== WithdrawalStatus.RISK_REVIEW) {
      throw new Error(`Cannot approve withdrawal with status ${request.status}`);
    }

    request.approvedBy = adminUserId;
    request.status = WithdrawalStatus.APPROVED;
    request.updatedAt = Date.now();

    db.logAudit({
      actorId: adminUserId,
      actorType: 'ADMIN',
      action: 'WITHDRAWAL_MANUALLY_APPROVED',
      targetId: withdrawalId,
      metadata: { amount: request.amount, asset: request.asset }
    });

    await this.executeBroadcast(request);
    return request;
  }

  /**
   * Reject withdrawal and refund locked funds back to customer available balance.
   */
  public rejectWithdrawal(withdrawalId: string, adminUserId: string, reason: string): WithdrawalRequest {
    const request = db.withdrawals.get(withdrawalId);
    if (!request) throw new Error(`Withdrawal ${withdrawalId} not found`);
    if (![WithdrawalStatus.REQUESTED, WithdrawalStatus.RISK_REVIEW].includes(request.status)) {
      throw new Error(`Cannot reject withdrawal with status ${request.status}`);
    }

    request.status = WithdrawalStatus.REJECTED;
    request.updatedAt = Date.now();

    // Refund locked balance in ledger
    ledgerService.recordTransaction(
      TransactionType.WITHDRAWAL_CANCEL,
      request.id,
      `wdr_refund_${request.id}`,
      `Refund rejected withdrawal ${request.id} (${request.amount} ${request.asset})`,
      [
        {
          userId: request.userId,
          accountType: AccountType.USER_WITHDRAWAL_PENDING,
          asset: request.asset,
          direction: EntryDirection.DEBIT,
          amount: request.amount
        },
        {
          userId: request.userId,
          accountType: AccountType.USER_AVAILABLE,
          asset: request.asset,
          direction: EntryDirection.CREDIT,
          amount: request.amount
        }
      ]
    );

    db.logAudit({
      actorId: adminUserId,
      actorType: 'ADMIN',
      action: 'WITHDRAWAL_REJECTED',
      targetId: withdrawalId,
      metadata: { reason, amount: request.amount, asset: request.asset }
    });

    return request;
  }

  /**
   * Execute an instant, zero-fee internal transfer between two platform users with atomic double-entry ledger settlement.
   */
  public transferInternal(params: {
    senderUserId: string;
    recipientIdentifier: string; // Recipient Email or User ID
    asset: AssetSymbol;
    amount: string;
    note?: string;
  }): TransferRecord {
    const sender = db.users.get(params.senderUserId);
    if (!sender) throw new Error('Sender user not found');
    if (sender.isSuspended) throw new Error('Your account is suspended from transferring funds');

    const cleanRecipient = params.recipientIdentifier.trim();
    if (!cleanRecipient) throw new Error('Recipient email or User ID is required');

    // Resolve recipient user
    let recipientUser = db.users.get(cleanRecipient);
    if (!recipientUser) {
      const resolvedUserId = db.usersByEmail.get(cleanRecipient.toLowerCase());
      if (resolvedUserId) {
        recipientUser = db.users.get(resolvedUserId);
      }
    }

    if (!recipientUser) {
      throw new Error(`Recipient "${cleanRecipient}" not found on Syncnode platform`);
    }

    if (recipientUser.id === sender.id) {
      throw new Error('Cannot transfer funds to yourself');
    }

    const amt = new Decimal(params.amount);
    if (!amt.isPositive() || amt.isZero()) {
      throw new Error('Transfer amount must be greater than zero');
    }

    // Check sender balance
    const senderBalance = ledgerService.getUserBalances(sender.id).find((b) => b.asset === params.asset);
    const available = new Decimal(senderBalance?.available || '0');
    if (available.lt(amt)) {
      throw new Error(`Insufficient ${params.asset} balance. Available: ${available.toString()}, Required: ${amt.toString()}`);
    }

    const transferId = `trf_int_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Atomic Double-Entry Ledger Posting:
    // Debit sender's USER_AVAILABLE (liability decreases)
    // Credit recipient's USER_AVAILABLE (liability increases)
    ledgerService.recordTransaction(
      TransactionType.INTERNAL_TRANSFER,
      transferId,
      `idemp_${transferId}`,
      `Internal transfer of ${params.amount} ${params.asset} from ${sender.email} to ${recipientUser.email}${params.note ? ` (${params.note})` : ''}`,
      [
        {
          userId: sender.id,
          accountType: AccountType.USER_AVAILABLE,
          asset: params.asset,
          direction: EntryDirection.DEBIT,
          amount: params.amount
        },
        {
          userId: recipientUser.id,
          accountType: AccountType.USER_AVAILABLE,
          asset: params.asset,
          direction: EntryDirection.CREDIT,
          amount: params.amount
        }
      ]
    );

    const record: TransferRecord = {
      id: transferId,
      type: TransferType.INTERNAL,
      senderUserId: sender.id,
      senderEmail: sender.email,
      recipientIdentifier: cleanRecipient,
      recipientUserId: recipientUser.id,
      recipientEmail: recipientUser.email,
      asset: params.asset,
      amount: params.amount,
      fee: '0.00',
      netAmount: params.amount,
      status: TransferStatus.COMPLETED,
      note: params.note || 'Internal Syncnode transfer',
      referenceId: `REF-${Date.now().toString(36).toUpperCase()}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    db.transfers.set(record.id, record);

    db.logAudit({
      actorId: sender.id,
      actorType: 'USER',
      action: 'INTERNAL_TRANSFER_EXECUTED',
      targetId: transferId,
      metadata: {
        recipientId: recipientUser.id,
        recipientEmail: recipientUser.email,
        amount: params.amount,
        asset: params.asset
      }
    });

    db.emitEvent('transfer.completed', { transfer: record });
    this.logger.info(`Internal transfer ${transferId}: ${params.amount} ${params.asset} from ${sender.id} to ${recipientUser.id}`);

    return record;
  }

  /**
   * Process fiat money deposit (e.g. Bank Wire, Card top-up) and credit USDT equivalent.
   */
  public processFiatDeposit(params: {
    userId: string;
    amount: string;
    currency?: string;
    paymentMethod?: string;
    referenceCode?: string;
  }): { deposit: DepositRecord; transfer: TransferRecord } {
    const user = db.users.get(params.userId);
    if (!user) throw new Error('User not found');

    const amt = new Decimal(params.amount);
    if (!amt.isPositive() || amt.isZero()) throw new Error('Deposit amount must be positive');

    const currency = params.currency || 'USD';
    const method = params.paymentMethod || 'Bank Wire Transfer';
    const depositId = `dep_fiat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const txHash = params.referenceCode || `FIAT-REF-${Date.now().toString(36).toUpperCase()}`;

    // Post to ledger: Credit USDT 1:1 for USD fiat deposit
    ledgerService.recordTransaction(
      TransactionType.FIAT_DEPOSIT,
      depositId,
      `fiat_dep_${txHash}`,
      `Fiat ${method} deposit of ${params.amount} ${currency} (credited as USDT)`,
      [
        {
          accountType: AccountType.EXCHANGE_HOT_WALLET,
          asset: AssetSymbol.USDT,
          direction: EntryDirection.DEBIT,
          amount: params.amount
        },
        {
          userId: user.id,
          accountType: AccountType.USER_AVAILABLE,
          asset: AssetSymbol.USDT,
          direction: EntryDirection.CREDIT,
          amount: params.amount
        }
      ]
    );

    const deposit: DepositRecord = {
      id: depositId,
      userId: user.id,
      asset: AssetSymbol.USDT,
      network: `Fiat-${currency} (${method})`,
      address: `SYNC-BANK-VAULT-${currency}`,
      txHash,
      amount: params.amount,
      confirmations: 1,
      requiredConfirmations: 1,
      status: DepositStatus.CREDITED,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    db.deposits.set(deposit.id, deposit);

    const transfer: TransferRecord = {
      id: `trf_fiat_${depositId}`,
      type: TransferType.INTERNAL,
      senderUserId: 'BANK_GATEWAY',
      senderEmail: `${method.toLowerCase()}@syncnode.institutional`,
      recipientIdentifier: user.email,
      recipientUserId: user.id,
      recipientEmail: user.email,
      asset: AssetSymbol.USDT,
      amount: params.amount,
      fee: '0.00',
      netAmount: params.amount,
      status: TransferStatus.COMPLETED,
      note: `Fiat ${currency} received via ${method}`,
      referenceId: txHash,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    db.transfers.set(transfer.id, transfer);

    return { deposit, transfer };
  }

  /**
   * Process a fiat payout / bank withdrawal.
   */
  public async processFiatWithdrawal(params: {
    userId: string;
    amount: string;
    currency?: string;
    bankDetails: {
      bankName: string;
      accountName: string;
      iban?: string;
      accountNumber?: string;
      routingNumber?: string;
      swiftBic?: string;
    };
    totpCode?: string;
  }): Promise<TransferRecord> {
    const user = db.users.get(params.userId);
    if (!user) throw new Error('User not found');

    if (user.isTotpEnabled && user.totpSecret) {
      if (!params.totpCode || !verifyTotp(user.totpSecret, params.totpCode)) {
        throw new Error('Invalid or missing 2FA TOTP code');
      }
    }

    const amt = new Decimal(params.amount);
    if (!amt.isPositive() || amt.lt('10.00')) {
      throw new Error('Minimum fiat withdrawal amount is 10.00 USD');
    }

    const senderBalance = ledgerService.getUserBalances(user.id).find((b) => b.asset === AssetSymbol.USDT);
    const available = new Decimal(senderBalance?.available || '0');
    if (available.lt(amt)) {
      throw new Error(`Insufficient USDT balance for fiat withdrawal. Available: ${available.toString()}`);
    }

    const fee = '2.50';
    const netAmount = amt.minus(fee).toFixed(2);
    const transferId = `trf_fiat_out_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const referenceId = `PAYOUT-${Date.now().toString(36).toUpperCase()}`;

    ledgerService.recordTransaction(
      TransactionType.FIAT_WITHDRAWAL,
      transferId,
      `fiat_wdr_${transferId}`,
      `Fiat bank payout of ${params.amount} USD to ${params.bankDetails.bankName} (${params.bankDetails.iban || params.bankDetails.accountNumber})`,
      [
        {
          userId: user.id,
          accountType: AccountType.USER_AVAILABLE,
          asset: AssetSymbol.USDT,
          direction: EntryDirection.DEBIT,
          amount: params.amount
        },
        {
          accountType: AccountType.EXCHANGE_HOT_WALLET,
          asset: AssetSymbol.USDT,
          direction: EntryDirection.CREDIT,
          amount: netAmount
        },
        {
          accountType: AccountType.WITHDRAWAL_FEES,
          asset: AssetSymbol.USDT,
          direction: EntryDirection.CREDIT,
          amount: fee
        }
      ]
    );

    const transfer: TransferRecord = {
      id: transferId,
      type: TransferType.EXTERNAL_FIAT,
      senderUserId: user.id,
      senderEmail: user.email,
      recipientIdentifier: `${params.bankDetails.bankName} - ${params.bankDetails.iban || params.bankDetails.accountNumber}`,
      asset: AssetSymbol.USDT,
      amount: params.amount,
      fee,
      netAmount,
      status: TransferStatus.COMPLETED,
      note: `Bank Wire Payout to ${params.bankDetails.accountName}`,
      referenceId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    db.transfers.set(transfer.id, transfer);
    return transfer;
  }

  /**
   * Get all transfers for a user (sent and received).
   */
  public getUserTransfers(userId: string): TransferRecord[] {
    return Array.from(db.transfers.values())
      .filter((t) => t.senderUserId === userId || t.recipientUserId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get all deposits for a user.
   */
  public getUserDeposits(userId: string): DepositRecord[] {
    return Array.from(db.deposits.values())
      .filter((d) => d.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get transfer details by ID.
   */
  public getTransferById(transferId: string): TransferRecord | undefined {
    return db.transfers.get(transferId);
  }
}

export const walletService = new WalletService();

