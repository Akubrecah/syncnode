import {
  AssetSymbol,
  AccountType,
  TransactionType,
  EntryDirection,
  JournalEntry,
  LedgerTransaction,
  UserBalance,
  Decimal,
  FinancialInvariantError,
  InsufficientBalanceError,
  Logger
} from '@syncnode/common';
import { db } from '@syncnode/database';

export interface EntrySpec {
  userId?: string;
  accountType: AccountType;
  asset: AssetSymbol;
  direction: EntryDirection;
  amount: string;
}

export class LedgerService {
  private readonly logger = new Logger('LedgerService');

  /**
   * Fetch or initialize an account balance in the ledger.
   */
  public getOrCreateAccount(userId: string | undefined, type: AccountType, asset: AssetSymbol) {
    const accountId = db.getAccountId(userId, type, asset);
    let account = db.accounts.get(accountId);
    if (!account) {
      account = {
        id: accountId,
        userId,
        type,
        asset,
        balance: '0'
      };
      db.accounts.set(accountId, account);
    }
    return account;
  }

  /**
   * Execute an atomic, multi-entry double-entry ledger transaction.
   * Enforces mathematical invariant: Debits == Credits per asset.
   */
  public recordTransaction(
    type: TransactionType,
    referenceId: string,
    idempotencyKey: string,
    description: string,
    entriesSpec: EntrySpec[]
  ): LedgerTransaction {
    // 1. Idempotency Check
    if (db.idempotencyKeys.has(idempotencyKey)) {
      const existing = Array.from(db.ledgerTransactions.values()).find(
        (t) => t.idempotencyKey === idempotencyKey
      );
      if (existing) {
        this.logger.info(`Idempotent transaction replayed: ${idempotencyKey}`);
        return existing;
      }
    }

    if (entriesSpec.length < 2) {
      throw new FinancialInvariantError('A double-entry transaction must have at least 2 entries');
    }

    // 2. Validate Debits == Credits per asset
    const assetTotals = new Map<AssetSymbol, { debit: Decimal; credit: Decimal }>();

    for (const spec of entriesSpec) {
      const amount = new Decimal(spec.amount);
      if (!amount.isPositive()) {
        throw new FinancialInvariantError(`Transaction entry amount must be positive, got ${spec.amount}`);
      }

      if (!assetTotals.has(spec.asset)) {
        assetTotals.set(spec.asset, { debit: Decimal.ZERO, credit: Decimal.ZERO });
      }
      const totals = assetTotals.get(spec.asset)!;

      if (spec.direction === EntryDirection.DEBIT) {
        totals.debit = totals.debit.plus(amount);
      } else {
        totals.credit = totals.credit.plus(amount);
      }
    }

    for (const [asset, totals] of assetTotals.entries()) {
      if (!totals.debit.eq(totals.credit)) {
        throw new FinancialInvariantError(
          `Unbalanced ledger entry for asset ${asset}: Debit=${totals.debit.toString()} != Credit=${totals.credit.toString()}`
        );
      }
    }

    // 3. Pre-flight check for liability accounts to ensure no negative balances
    for (const spec of entriesSpec) {
      // In standard exchange accounting:
      // For Liability accounts (User balances):
      // DEBIT decreases user liability (reduces balance)
      // CREDIT increases user liability (increases balance)
      // If debiting a user account, ensure they have sufficient balance.
      if (
        spec.direction === EntryDirection.DEBIT &&
        [
          AccountType.USER_AVAILABLE,
          AccountType.USER_LOCKED,
          AccountType.USER_WITHDRAWAL_PENDING,
          AccountType.USER_P2P_ESCROW
        ].includes(spec.accountType)
      ) {
        const account = this.getOrCreateAccount(spec.userId, spec.accountType, spec.asset);
        const current = new Decimal(account.balance);
        const debitAmt = new Decimal(spec.amount);
        if (current.lt(debitAmt)) {
          throw new InsufficientBalanceError(spec.asset, debitAmt.toString(), current.toString());
        }
      }
    }

    // 4. Apply State Changes Atomically
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const journalEntries: JournalEntry[] = [];

    for (const spec of entriesSpec) {
      const account = this.getOrCreateAccount(spec.userId, spec.accountType, spec.asset);
      const current = new Decimal(account.balance);
      const amount = new Decimal(spec.amount);

      let newBalance: Decimal;
      // Asset accounts (Vaults): DEBIT increases, CREDIT decreases
      if (
        spec.accountType === AccountType.EXCHANGE_HOT_WALLET ||
        spec.accountType === AccountType.EXCHANGE_COLD_STORAGE
      ) {
        if (spec.direction === EntryDirection.DEBIT) {
          newBalance = current.plus(amount);
        } else {
          newBalance = current.minus(amount);
        }
      } else {
        // Liability & Revenue accounts: CREDIT increases, DEBIT decreases
        if (spec.direction === EntryDirection.CREDIT) {
          newBalance = current.plus(amount);
        } else {
          newBalance = current.minus(amount);
        }
      }

      account.balance = newBalance.toString();

      const entry: JournalEntry = {
        id: `je_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        accountId: account.id,
        userId: spec.userId,
        accountType: spec.accountType,
        asset: spec.asset,
        direction: spec.direction,
        amount: spec.amount,
        createdAt: Date.now()
      };

      db.journalEntries.set(entry.id, entry);
      journalEntries.push(entry);
    }

    const tx: LedgerTransaction = {
      id: txId,
      type,
      referenceId,
      idempotencyKey,
      description,
      entries: journalEntries,
      createdAt: Date.now()
    };

    db.ledgerTransactions.set(txId, tx);
    db.idempotencyKeys.add(idempotencyKey);

    return tx;
  }

  /**
   * Retrieve structured multi-asset balances for a user.
   */
  public getUserBalances(userId: string): UserBalance[] {
    const assets = Object.values(AssetSymbol);
    const result: UserBalance[] = [];

    for (const asset of assets) {
      const availAcc = this.getOrCreateAccount(userId, AccountType.USER_AVAILABLE, asset);
      const lockedAcc = this.getOrCreateAccount(userId, AccountType.USER_LOCKED, asset);
      const pendAcc = this.getOrCreateAccount(userId, AccountType.USER_WITHDRAWAL_PENDING, asset);
      const p2pAcc = this.getOrCreateAccount(userId, AccountType.USER_P2P_ESCROW, asset);

      const available = new Decimal(availAcc.balance);
      const locked = new Decimal(lockedAcc.balance);
      const pending = new Decimal(pendAcc.balance);
      const p2p = new Decimal(p2pAcc.balance);
      const total = available.plus(locked).plus(pending).plus(p2p);

      result.push({
        asset,
        available: available.toString(),
        locked: locked.toString(),
        pendingWithdrawal: pending.toString(),
        p2pEscrow: p2p.toString(),
        total: total.toString()
      });
    }

    return result;
  }

  /**
   * Get single asset balance for a user.
   */
  public getUserAssetBalance(userId: string, asset: AssetSymbol): UserBalance {
    const availAcc = this.getOrCreateAccount(userId, AccountType.USER_AVAILABLE, asset);
    const lockedAcc = this.getOrCreateAccount(userId, AccountType.USER_LOCKED, asset);
    const pendAcc = this.getOrCreateAccount(userId, AccountType.USER_WITHDRAWAL_PENDING, asset);
    const p2pAcc = this.getOrCreateAccount(userId, AccountType.USER_P2P_ESCROW, asset);

    const available = new Decimal(availAcc.balance);
    const locked = new Decimal(lockedAcc.balance);
    const pending = new Decimal(pendAcc.balance);
    const p2p = new Decimal(p2pAcc.balance);
    const total = available.plus(locked).plus(pending).plus(p2p);

    return {
      asset,
      available: available.toString(),
      locked: locked.toString(),
      pendingWithdrawal: pending.toString(),
      p2pEscrow: p2p.toString(),
      total: total.toString()
    };
  }

  /**
   * Proof of Solvency & Reserves Mathematical Audit.
   * Compares Total Vault Assets vs Total Customer Liabilities & Exchange Equity.
   */
  public performProofOfReservesAudit(): {
    isSolvent: boolean;
    assets: Record<string, { totalAssets: string; totalLiabilities: string; surplus: string; ratio: string }>;
    timestamp: number;
  } {
    const assets = Object.values(AssetSymbol);
    const report: Record<string, { totalAssets: string; totalLiabilities: string; surplus: string; ratio: string }> = {};
    let overallSolvent = true;

    for (const asset of assets) {
      let vaultAssets = Decimal.ZERO;
      let userLiabilities = Decimal.ZERO;

      for (const account of db.accounts.values()) {
        if (account.asset !== asset) continue;
        const bal = new Decimal(account.balance);

        if (
          account.type === AccountType.EXCHANGE_HOT_WALLET ||
          account.type === AccountType.EXCHANGE_COLD_STORAGE
        ) {
          vaultAssets = vaultAssets.plus(bal);
        } else if (
          account.type === AccountType.USER_AVAILABLE ||
          account.type === AccountType.USER_LOCKED ||
          account.type === AccountType.USER_WITHDRAWAL_PENDING ||
          account.type === AccountType.USER_P2P_ESCROW
        ) {
          userLiabilities = userLiabilities.plus(bal);
        }
      }

      const surplus = vaultAssets.minus(userLiabilities);
      const isSolventForAsset = vaultAssets.gte(userLiabilities);
      if (!isSolventForAsset) overallSolvent = false;

      const ratio = userLiabilities.isZero()
        ? '100.00%'
        : `${vaultAssets.dividedBy(userLiabilities).times(100).toFixed(2)}%`;

      report[asset] = {
        totalAssets: vaultAssets.toString(),
        totalLiabilities: userLiabilities.toString(),
        surplus: surplus.toString(),
        ratio
      };
    }

    return {
      isSolvent: overallSolvent,
      assets: report,
      timestamp: Date.now()
    };
  }

  /**
   * Full treasury summary per asset, broken down by account type.
   * All figures originate from the double-entry ledger (authoritative).
   * Values are expressed in native asset units only - no fiat valuation is
   * fabricated without a trusted pricing source.
   */
  public getTreasurySummary(): {
    assets: Record<string, {
      hotWallet: string;
      coldStorage: string;
      totalExchangeAssets: string;
      liabilities: {
        available: string;
        locked: string;
        pendingWithdrawal: string;
        p2pEscrow: string;
        total: string;
      };
      revenue: { tradingFees: string; withdrawalFees: string };
      reserveRatio: string;
      isSolvent: boolean;
      withdrawalCapacityRatio: string;
    }>;
    timestamp: number;
  } {
    const assets = Object.values(AssetSymbol);
    const report: Record<string, any> = {};

    for (const asset of assets) {
      let hotWallet = Decimal.ZERO;
      let coldStorage = Decimal.ZERO;
      let available = Decimal.ZERO;
      let locked = Decimal.ZERO;
      let pendingWithdrawal = Decimal.ZERO;
      let p2pEscrow = Decimal.ZERO;
      let tradingFees = Decimal.ZERO;
      let withdrawalFees = Decimal.ZERO;

      for (const account of db.accounts.values()) {
        if (account.asset !== asset) continue;
        const bal = new Decimal(account.balance);

        switch (account.type) {
          case AccountType.EXCHANGE_HOT_WALLET:
            hotWallet = hotWallet.plus(bal);
            break;
          case AccountType.EXCHANGE_COLD_STORAGE:
            coldStorage = coldStorage.plus(bal);
            break;
          case AccountType.USER_AVAILABLE:
            available = available.plus(bal);
            break;
          case AccountType.USER_LOCKED:
            locked = locked.plus(bal);
            break;
          case AccountType.USER_WITHDRAWAL_PENDING:
            pendingWithdrawal = pendingWithdrawal.plus(bal);
            break;
          case AccountType.USER_P2P_ESCROW:
            p2pEscrow = p2pEscrow.plus(bal);
            break;
          case AccountType.TRADING_FEES:
            tradingFees = tradingFees.plus(bal);
            break;
          case AccountType.WITHDRAWAL_FEES:
            withdrawalFees = withdrawalFees.plus(bal);
            break;
          default:
            break;
        }
      }

      const totalExchangeAssets = hotWallet.plus(coldStorage);
      const totalLiabilities = available.plus(locked).plus(pendingWithdrawal).plus(p2pEscrow);

      // Withdrawal capacity: liquid hot-wallet coverage over outstanding
      // pending withdrawals plus a same-asset buffer reference. Expressed as
      // ratio of hot wallet to pending withdrawals when withdrawals exist.
      const withdrawalCapacityRatio = pendingWithdrawal.isZero()
        ? 'INFINITE'
        : `${hotWallet.dividedBy(pendingWithdrawal).toFixed(4)}x`;

      report[asset] = {
        hotWallet: hotWallet.toString(),
        coldStorage: coldStorage.toString(),
        totalExchangeAssets: totalExchangeAssets.toString(),
        liabilities: {
          available: available.toString(),
          locked: locked.toString(),
          pendingWithdrawal: pendingWithdrawal.toString(),
          p2pEscrow: p2pEscrow.toString(),
          total: totalLiabilities.toString()
        },
        revenue: {
          tradingFees: tradingFees.toString(),
          withdrawalFees: withdrawalFees.toString()
        },
        reserveRatio: totalLiabilities.isZero()
          ? '100.00%'
          : `${totalExchangeAssets.dividedBy(totalLiabilities).times(100).toFixed(2)}%`,
        isSolvent: totalExchangeAssets.gte(totalLiabilities),
        withdrawalCapacityRatio
      };
    }

    return { assets: report, timestamp: Date.now() };
  }
}

export const ledgerService = new LedgerService();
