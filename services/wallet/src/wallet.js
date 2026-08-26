"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletService = exports.WalletService = void 0;
const common_1 = require("@syncnode/common");
const database_1 = require("@syncnode/database");
const ledger_1 = require("@syncnode/ledger");
const blockchain_1 = require("@syncnode/blockchain");
const risk_1 = require("@syncnode/risk");
const security_1 = require("@syncnode/security");
class WalletService {
    logger = new common_1.Logger('WalletService');
    /**
     * Derive or retrieve a deposit address for a specific user and network.
     */
    getDepositAddress(userId, asset, network) {
        const adapter = blockchain_1.BlockchainAdapterFactory.getAdapter(asset, network);
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
    processDeposit(params) {
        if (database_1.db.circuitBreakers.isDepositsPaused) {
            throw new Error('Deposits are currently suspended across the exchange');
        }
        const assetDef = common_1.ASSET_REGISTRY[params.asset];
        if (!assetDef || !assetDef.isDepositEnabled) {
            throw new Error(`Deposits are disabled for asset ${params.asset}`);
        }
        if (new common_1.Decimal(params.amount).lt(assetDef.minDeposit)) {
            throw new Error(`Deposit amount ${params.amount} is below minimum ${assetDef.minDeposit}`);
        }
        // Check if deposit with same txHash has already been processed
        const existing = Array.from(database_1.db.deposits.values()).find((d) => d.txHash === params.txHash);
        if (existing && existing.status === common_1.DepositStatus.CREDITED) {
            this.logger.info(`Deposit ${params.txHash} already credited. Skipping duplicate.`);
            return existing;
        }
        const depositId = existing?.id || `dep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const isConfirmed = params.confirmations >= assetDef.confirmationsRequired;
        const status = isConfirmed ? common_1.DepositStatus.CREDITED : common_1.DepositStatus.CONFIRMING;
        const deposit = {
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
        database_1.db.deposits.set(deposit.id, deposit);
        // If confirmed and not previously credited, perform atomic double-entry posting to ledger
        if (isConfirmed && (!existing || existing.status !== common_1.DepositStatus.CREDITED)) {
            ledger_1.ledgerService.recordTransaction(common_1.TransactionType.DEPOSIT, deposit.id, `dep_${params.txHash}`, `Deposit of ${params.amount} ${params.asset} on ${params.network} via tx ${params.txHash}`, [
                // Exchange Vault Hot Wallet gets debited (asset increases)
                {
                    accountType: common_1.AccountType.EXCHANGE_HOT_WALLET,
                    asset: params.asset,
                    direction: common_1.EntryDirection.DEBIT,
                    amount: params.amount
                },
                // User Available Balance gets credited (liability increases)
                {
                    userId: params.userId,
                    accountType: common_1.AccountType.USER_AVAILABLE,
                    asset: params.asset,
                    direction: common_1.EntryDirection.CREDIT,
                    amount: params.amount
                }
            ]);
            this.logger.info(`Credited deposit ${deposit.id}: ${params.amount} ${params.asset} to user ${params.userId}`);
            database_1.db.emitEvent('deposit.credited', { deposit });
        }
        return deposit;
    }
    /**
     * Request a new withdrawal with 2FA TOTP verification, pre-withdrawal risk scoring, and balance reservation.
     */
    async requestWithdrawal(params) {
        const user = database_1.db.users.get(params.userId);
        if (!user)
            throw new Error('User not found');
        // 1. Verify 2FA if enabled
        if (user.isTotpEnabled && user.totpSecret) {
            if (!params.totpCode || !(0, security_1.verifyTotp)(user.totpSecret, params.totpCode)) {
                throw new Error('Invalid or missing 2FA TOTP verification code');
            }
        }
        // 2. Validate destination address
        const adapter = blockchain_1.BlockchainAdapterFactory.getAdapter(params.asset, params.network);
        if (!adapter.validateAddress(params.destinationAddress)) {
            throw new Error(`Invalid destination address for ${params.asset}: ${params.destinationAddress}`);
        }
        const assetDef = common_1.ASSET_REGISTRY[params.asset];
        if (!assetDef || !assetDef.isWithdrawalEnabled) {
            throw new Error(`Withdrawals are currently disabled for ${params.asset}`);
        }
        if (new common_1.Decimal(params.amount).lt(assetDef.minWithdrawal)) {
            throw new Error(`Withdrawal amount ${params.amount} is below minimum ${assetDef.minWithdrawal}`);
        }
        const fee = assetDef.withdrawalFee;
        const netAmount = new common_1.Decimal(params.amount).minus(fee);
        if (!netAmount.isPositive()) {
            throw new Error(`Withdrawal amount must exceed network fee of ${fee} ${params.asset}`);
        }
        // 3. Pre-Withdrawal Risk Evaluation
        const { riskScore, requiresManualReview } = risk_1.riskEngine.evaluateWithdrawalRisk(params.userId, params.asset, params.amount);
        const withdrawalId = `wdr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const status = requiresManualReview ? common_1.WithdrawalStatus.RISK_REVIEW : common_1.WithdrawalStatus.APPROVED;
        // 4. Reserve Funds in Ledger (USER_AVAILABLE -> USER_WITHDRAWAL_PENDING)
        ledger_1.ledgerService.recordTransaction(common_1.TransactionType.WITHDRAWAL_LOCK, withdrawalId, `wdr_lock_${withdrawalId}`, `Lock ${params.amount} ${params.asset} for withdrawal ${withdrawalId}`, [
            {
                userId: params.userId,
                accountType: common_1.AccountType.USER_AVAILABLE,
                asset: params.asset,
                direction: common_1.EntryDirection.DEBIT,
                amount: params.amount
            },
            {
                userId: params.userId,
                accountType: common_1.AccountType.USER_WITHDRAWAL_PENDING,
                asset: params.asset,
                direction: common_1.EntryDirection.CREDIT,
                amount: params.amount
            }
        ]);
        const request = {
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
        database_1.db.withdrawals.set(request.id, request);
        // Auto-broadcast if approved
        if (status === common_1.WithdrawalStatus.APPROVED) {
            await this.executeBroadcast(request);
        }
        database_1.db.emitEvent('withdrawal.requested', { withdrawal: request });
        return request;
    }
    /**
     * Broadcast approved withdrawal to blockchain network and finalize ledger.
     */
    async executeBroadcast(request) {
        const adapter = blockchain_1.BlockchainAdapterFactory.getAdapter(request.asset, request.network);
        request.status = common_1.WithdrawalStatus.PROCESSING;
        request.updatedAt = Date.now();
        try {
            const txHash = await adapter.broadcastTransaction(request.destinationAddress, request.netAmount, request.asset);
            request.txHash = txHash;
            request.status = common_1.WithdrawalStatus.CONFIRMED;
            request.updatedAt = Date.now();
            // Finalize double-entry ledger entries
            // USER_WITHDRAWAL_PENDING is debited
            // EXCHANGE_HOT_WALLET is credited (assets reduce by netAmount)
            // WITHDRAWAL_FEES is credited (exchange revenue increases by fee)
            ledger_1.ledgerService.recordTransaction(common_1.TransactionType.WITHDRAWAL_FINALIZE, request.id, `wdr_fin_${request.id}`, `Finalize withdrawal ${request.id} (${request.amount} ${request.asset}) to ${request.destinationAddress}`, [
                {
                    userId: request.userId,
                    accountType: common_1.AccountType.USER_WITHDRAWAL_PENDING,
                    asset: request.asset,
                    direction: common_1.EntryDirection.DEBIT,
                    amount: request.amount
                },
                {
                    accountType: common_1.AccountType.EXCHANGE_HOT_WALLET,
                    asset: request.asset,
                    direction: common_1.EntryDirection.CREDIT,
                    amount: request.netAmount
                },
                {
                    accountType: common_1.AccountType.WITHDRAWAL_FEES,
                    asset: request.asset,
                    direction: common_1.EntryDirection.CREDIT,
                    amount: request.fee
                }
            ]);
            this.logger.info(`Withdrawal ${request.id} broadcasted with TX ${txHash}`);
            database_1.db.emitEvent('withdrawal.confirmed', { withdrawal: request });
        }
        catch (err) {
            this.logger.error(`Failed to broadcast withdrawal ${request.id}`, err);
            request.status = common_1.WithdrawalStatus.RISK_REVIEW;
            request.updatedAt = Date.now();
        }
    }
    /**
     * Approve a manual risk-held withdrawal by compliance officer.
     */
    async approveWithdrawal(withdrawalId, adminUserId) {
        const request = database_1.db.withdrawals.get(withdrawalId);
        if (!request)
            throw new Error(`Withdrawal ${withdrawalId} not found`);
        if (request.status !== common_1.WithdrawalStatus.RISK_REVIEW) {
            throw new Error(`Cannot approve withdrawal with status ${request.status}`);
        }
        request.approvedBy = adminUserId;
        request.status = common_1.WithdrawalStatus.APPROVED;
        request.updatedAt = Date.now();
        database_1.db.logAudit({
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
    rejectWithdrawal(withdrawalId, adminUserId, reason) {
        const request = database_1.db.withdrawals.get(withdrawalId);
        if (!request)
            throw new Error(`Withdrawal ${withdrawalId} not found`);
        if (![common_1.WithdrawalStatus.REQUESTED, common_1.WithdrawalStatus.RISK_REVIEW].includes(request.status)) {
            throw new Error(`Cannot reject withdrawal with status ${request.status}`);
        }
        request.status = common_1.WithdrawalStatus.REJECTED;
        request.updatedAt = Date.now();
        // Refund locked balance in ledger
        ledger_1.ledgerService.recordTransaction(common_1.TransactionType.WITHDRAWAL_CANCEL, request.id, `wdr_refund_${request.id}`, `Refund rejected withdrawal ${request.id} (${request.amount} ${request.asset})`, [
            {
                userId: request.userId,
                accountType: common_1.AccountType.USER_WITHDRAWAL_PENDING,
                asset: request.asset,
                direction: common_1.EntryDirection.DEBIT,
                amount: request.amount
            },
            {
                userId: request.userId,
                accountType: common_1.AccountType.USER_AVAILABLE,
                asset: request.asset,
                direction: common_1.EntryDirection.CREDIT,
                amount: request.amount
            }
        ]);
        database_1.db.logAudit({
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
    transferInternal(params) {
        const sender = database_1.db.users.get(params.senderUserId);
        if (!sender)
            throw new Error('Sender user not found');
        if (sender.isSuspended)
            throw new Error('Your account is suspended from transferring funds');
        const cleanRecipient = params.recipientIdentifier.trim();
        if (!cleanRecipient)
            throw new Error('Recipient email or User ID is required');
        // Resolve recipient user
        let recipientUser = database_1.db.users.get(cleanRecipient);
        if (!recipientUser) {
            const resolvedUserId = database_1.db.usersByEmail.get(cleanRecipient.toLowerCase());
            if (resolvedUserId) {
                recipientUser = database_1.db.users.get(resolvedUserId);
            }
        }
        if (!recipientUser) {
            throw new Error(`Recipient "${cleanRecipient}" not found on Syncnode platform`);
        }
        if (recipientUser.id === sender.id) {
            throw new Error('Cannot transfer funds to yourself');
        }
        const amt = new common_1.Decimal(params.amount);
        if (!amt.isPositive() || amt.isZero()) {
            throw new Error('Transfer amount must be greater than zero');
        }
        // Check sender balance
        const senderBalance = ledger_1.ledgerService.getUserBalances(sender.id).find((b) => b.asset === params.asset);
        const available = new common_1.Decimal(senderBalance?.available || '0');
        if (available.lt(amt)) {
            throw new Error(`Insufficient ${params.asset} balance. Available: ${available.toString()}, Required: ${amt.toString()}`);
        }
        const transferId = `trf_int_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        // Atomic Double-Entry Ledger Posting:
        // Debit sender's USER_AVAILABLE (liability decreases)
        // Credit recipient's USER_AVAILABLE (liability increases)
        ledger_1.ledgerService.recordTransaction(common_1.TransactionType.INTERNAL_TRANSFER, transferId, `idemp_${transferId}`, `Internal transfer of ${params.amount} ${params.asset} from ${sender.email} to ${recipientUser.email}${params.note ? ` (${params.note})` : ''}`, [
            {
                userId: sender.id,
                accountType: common_1.AccountType.USER_AVAILABLE,
                asset: params.asset,
                direction: common_1.EntryDirection.DEBIT,
                amount: params.amount
            },
            {
                userId: recipientUser.id,
                accountType: common_1.AccountType.USER_AVAILABLE,
                asset: params.asset,
                direction: common_1.EntryDirection.CREDIT,
                amount: params.amount
            }
        ]);
        const record = {
            id: transferId,
            type: common_1.TransferType.INTERNAL,
            senderUserId: sender.id,
            senderEmail: sender.email,
            recipientIdentifier: cleanRecipient,
            recipientUserId: recipientUser.id,
            recipientEmail: recipientUser.email,
            asset: params.asset,
            amount: params.amount,
            fee: '0.00',
            netAmount: params.amount,
            status: common_1.TransferStatus.COMPLETED,
            note: params.note || 'Internal Syncnode transfer',
            referenceId: `REF-${Date.now().toString(36).toUpperCase()}`,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        database_1.db.transfers.set(record.id, record);
        database_1.db.logAudit({
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
        database_1.db.emitEvent('transfer.completed', { transfer: record });
        this.logger.info(`Internal transfer ${transferId}: ${params.amount} ${params.asset} from ${sender.id} to ${recipientUser.id}`);
        return record;
    }
    /**
     * Process fiat money deposit (e.g. Bank Wire, Card top-up) and credit USDT equivalent.
     */
    processFiatDeposit(params) {
        const user = database_1.db.users.get(params.userId);
        if (!user)
            throw new Error('User not found');
        const amt = new common_1.Decimal(params.amount);
        if (!amt.isPositive() || amt.isZero())
            throw new Error('Deposit amount must be positive');
        const currency = params.currency || 'USD';
        const method = params.paymentMethod || 'Bank Wire Transfer';
        const depositId = `dep_fiat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const txHash = params.referenceCode || `FIAT-REF-${Date.now().toString(36).toUpperCase()}`;
        // Post to ledger: Credit USDT 1:1 for USD fiat deposit
        ledger_1.ledgerService.recordTransaction(common_1.TransactionType.FIAT_DEPOSIT, depositId, `fiat_dep_${txHash}`, `Fiat ${method} deposit of ${params.amount} ${currency} (credited as USDT)`, [
            {
                accountType: common_1.AccountType.EXCHANGE_HOT_WALLET,
                asset: common_1.AssetSymbol.USDT,
                direction: common_1.EntryDirection.DEBIT,
                amount: params.amount
            },
            {
                userId: user.id,
                accountType: common_1.AccountType.USER_AVAILABLE,
                asset: common_1.AssetSymbol.USDT,
                direction: common_1.EntryDirection.CREDIT,
                amount: params.amount
            }
        ]);
        const deposit = {
            id: depositId,
            userId: user.id,
            asset: common_1.AssetSymbol.USDT,
            network: `Fiat-${currency} (${method})`,
            address: `SYNC-BANK-VAULT-${currency}`,
            txHash,
            amount: params.amount,
            confirmations: 1,
            requiredConfirmations: 1,
            status: common_1.DepositStatus.CREDITED,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        database_1.db.deposits.set(deposit.id, deposit);
        const transfer = {
            id: `trf_fiat_${depositId}`,
            type: common_1.TransferType.INTERNAL,
            senderUserId: 'BANK_GATEWAY',
            senderEmail: `${method.toLowerCase()}@syncnode.institutional`,
            recipientIdentifier: user.email,
            recipientUserId: user.id,
            recipientEmail: user.email,
            asset: common_1.AssetSymbol.USDT,
            amount: params.amount,
            fee: '0.00',
            netAmount: params.amount,
            status: common_1.TransferStatus.COMPLETED,
            note: `Fiat ${currency} received via ${method}`,
            referenceId: txHash,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        database_1.db.transfers.set(transfer.id, transfer);
        return { deposit, transfer };
    }
    /**
     * Process a fiat payout / bank withdrawal.
     */
    async processFiatWithdrawal(params) {
        const user = database_1.db.users.get(params.userId);
        if (!user)
            throw new Error('User not found');
        if (user.isTotpEnabled && user.totpSecret) {
            if (!params.totpCode || !(0, security_1.verifyTotp)(user.totpSecret, params.totpCode)) {
                throw new Error('Invalid or missing 2FA TOTP code');
            }
        }
        const amt = new common_1.Decimal(params.amount);
        if (!amt.isPositive() || amt.lt('10.00')) {
            throw new Error('Minimum fiat withdrawal amount is 10.00 USD');
        }
        const senderBalance = ledger_1.ledgerService.getUserBalances(user.id).find((b) => b.asset === common_1.AssetSymbol.USDT);
        const available = new common_1.Decimal(senderBalance?.available || '0');
        if (available.lt(amt)) {
            throw new Error(`Insufficient USDT balance for fiat withdrawal. Available: ${available.toString()}`);
        }
        const fee = '2.50';
        const netAmount = amt.minus(fee).toFixed(2);
        const transferId = `trf_fiat_out_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const referenceId = `PAYOUT-${Date.now().toString(36).toUpperCase()}`;
        ledger_1.ledgerService.recordTransaction(common_1.TransactionType.FIAT_WITHDRAWAL, transferId, `fiat_wdr_${transferId}`, `Fiat bank payout of ${params.amount} USD to ${params.bankDetails.bankName} (${params.bankDetails.iban || params.bankDetails.accountNumber})`, [
            {
                userId: user.id,
                accountType: common_1.AccountType.USER_AVAILABLE,
                asset: common_1.AssetSymbol.USDT,
                direction: common_1.EntryDirection.DEBIT,
                amount: params.amount
            },
            {
                accountType: common_1.AccountType.EXCHANGE_HOT_WALLET,
                asset: common_1.AssetSymbol.USDT,
                direction: common_1.EntryDirection.CREDIT,
                amount: netAmount
            },
            {
                accountType: common_1.AccountType.WITHDRAWAL_FEES,
                asset: common_1.AssetSymbol.USDT,
                direction: common_1.EntryDirection.CREDIT,
                amount: fee
            }
        ]);
        const transfer = {
            id: transferId,
            type: common_1.TransferType.EXTERNAL_FIAT,
            senderUserId: user.id,
            senderEmail: user.email,
            recipientIdentifier: `${params.bankDetails.bankName} - ${params.bankDetails.iban || params.bankDetails.accountNumber}`,
            asset: common_1.AssetSymbol.USDT,
            amount: params.amount,
            fee,
            netAmount,
            status: common_1.TransferStatus.COMPLETED,
            note: `Bank Wire Payout to ${params.bankDetails.accountName}`,
            referenceId,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        database_1.db.transfers.set(transfer.id, transfer);
        return transfer;
    }
    /**
     * Get all transfers for a user (sent and received).
     */
    getUserTransfers(userId) {
        return Array.from(database_1.db.transfers.values())
            .filter((t) => t.senderUserId === userId || t.recipientUserId === userId)
            .sort((a, b) => b.createdAt - a.createdAt);
    }
    /**
     * Get all deposits for a user.
     */
    getUserDeposits(userId) {
        return Array.from(database_1.db.deposits.values())
            .filter((d) => d.userId === userId)
            .sort((a, b) => b.createdAt - a.createdAt);
    }
    /**
     * Get transfer details by ID.
     */
    getTransferById(transferId) {
        return database_1.db.transfers.get(transferId);
    }
}
exports.WalletService = WalletService;
exports.walletService = new WalletService();
//# sourceMappingURL=wallet.js.map