"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledgerService = exports.LedgerService = void 0;
const common_1 = require("@syncnode/common");
const database_1 = require("@syncnode/database");
class LedgerService {
    logger = new common_1.Logger('LedgerService');
    /**
     * Fetch or initialize an account balance in the ledger.
     */
    getOrCreateAccount(userId, type, asset) {
        const accountId = database_1.db.getAccountId(userId, type, asset);
        let account = database_1.db.accounts.get(accountId);
        if (!account) {
            account = {
                id: accountId,
                userId,
                type,
                asset,
                balance: '0'
            };
            database_1.db.accounts.set(accountId, account);
        }
        return account;
    }
    /**
     * Execute an atomic, multi-entry double-entry ledger transaction.
     * Enforces mathematical invariant: Debits == Credits per asset.
     */
    recordTransaction(type, referenceId, idempotencyKey, description, entriesSpec) {
        // 1. Idempotency Check
        if (database_1.db.idempotencyKeys.has(idempotencyKey)) {
            const existing = Array.from(database_1.db.ledgerTransactions.values()).find((t) => t.idempotencyKey === idempotencyKey);
            if (existing) {
                this.logger.info(`Idempotent transaction replayed: ${idempotencyKey}`);
                return existing;
            }
        }
        if (entriesSpec.length < 2) {
            throw new common_1.FinancialInvariantError('A double-entry transaction must have at least 2 entries');
        }
        // 2. Validate Debits == Credits per asset
        const assetTotals = new Map();
        for (const spec of entriesSpec) {
            const amount = new common_1.Decimal(spec.amount);
            if (!amount.isPositive()) {
                throw new common_1.FinancialInvariantError(`Transaction entry amount must be positive, got ${spec.amount}`);
            }
            if (!assetTotals.has(spec.asset)) {
                assetTotals.set(spec.asset, { debit: common_1.Decimal.ZERO, credit: common_1.Decimal.ZERO });
            }
            const totals = assetTotals.get(spec.asset);
            if (spec.direction === common_1.EntryDirection.DEBIT) {
                totals.debit = totals.debit.plus(amount);
            }
            else {
                totals.credit = totals.credit.plus(amount);
            }
        }
        for (const [asset, totals] of assetTotals.entries()) {
            if (!totals.debit.eq(totals.credit)) {
                throw new common_1.FinancialInvariantError(`Unbalanced ledger entry for asset ${asset}: Debit=${totals.debit.toString()} != Credit=${totals.credit.toString()}`);
            }
        }
        // 3. Pre-flight check for liability accounts to ensure no negative balances
        for (const spec of entriesSpec) {
            // In standard exchange accounting:
            // For Liability accounts (User balances):
            // DEBIT decreases user liability (reduces balance)
            // CREDIT increases user liability (increases balance)
            // If debiting a user account, ensure they have sufficient balance.
            if (spec.direction === common_1.EntryDirection.DEBIT &&
                [
                    common_1.AccountType.USER_AVAILABLE,
                    common_1.AccountType.USER_LOCKED,
                    common_1.AccountType.USER_WITHDRAWAL_PENDING,
                    common_1.AccountType.USER_P2P_ESCROW
                ].includes(spec.accountType)) {
                const account = this.getOrCreateAccount(spec.userId, spec.accountType, spec.asset);
                const current = new common_1.Decimal(account.balance);
                const debitAmt = new common_1.Decimal(spec.amount);
                if (current.lt(debitAmt)) {
                    throw new common_1.InsufficientBalanceError(spec.asset, debitAmt.toString(), current.toString());
                }
            }
        }
        // 4. Apply State Changes Atomically
        const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const journalEntries = [];
        for (const spec of entriesSpec) {
            const account = this.getOrCreateAccount(spec.userId, spec.accountType, spec.asset);
            const current = new common_1.Decimal(account.balance);
            const amount = new common_1.Decimal(spec.amount);
            let newBalance;
            // Asset accounts (Vaults): DEBIT increases, CREDIT decreases
            if (spec.accountType === common_1.AccountType.EXCHANGE_HOT_WALLET ||
                spec.accountType === common_1.AccountType.EXCHANGE_COLD_STORAGE) {
                if (spec.direction === common_1.EntryDirection.DEBIT) {
                    newBalance = current.plus(amount);
                }
                else {
                    newBalance = current.minus(amount);
                }
            }
            else {
                // Liability & Revenue accounts: CREDIT increases, DEBIT decreases
                if (spec.direction === common_1.EntryDirection.CREDIT) {
                    newBalance = current.plus(amount);
                }
                else {
                    newBalance = current.minus(amount);
                }
            }
            account.balance = newBalance.toString();
            const entry = {
                id: `je_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                accountId: account.id,
                userId: spec.userId,
                accountType: spec.accountType,
                asset: spec.asset,
                direction: spec.direction,
                amount: spec.amount,
                createdAt: Date.now()
            };
            database_1.db.journalEntries.set(entry.id, entry);
            journalEntries.push(entry);
        }
        const tx = {
            id: txId,
            type,
            referenceId,
            idempotencyKey,
            description,
            entries: journalEntries,
            createdAt: Date.now()
        };
        database_1.db.ledgerTransactions.set(txId, tx);
        database_1.db.idempotencyKeys.add(idempotencyKey);
        return tx;
    }
    /**
     * Retrieve structured multi-asset balances for a user.
     */
    getUserBalances(userId) {
        const assets = Object.values(common_1.AssetSymbol);
        const result = [];
        for (const asset of assets) {
            const availAcc = this.getOrCreateAccount(userId, common_1.AccountType.USER_AVAILABLE, asset);
            const lockedAcc = this.getOrCreateAccount(userId, common_1.AccountType.USER_LOCKED, asset);
            const pendAcc = this.getOrCreateAccount(userId, common_1.AccountType.USER_WITHDRAWAL_PENDING, asset);
            const p2pAcc = this.getOrCreateAccount(userId, common_1.AccountType.USER_P2P_ESCROW, asset);
            const available = new common_1.Decimal(availAcc.balance);
            const locked = new common_1.Decimal(lockedAcc.balance);
            const pending = new common_1.Decimal(pendAcc.balance);
            const p2p = new common_1.Decimal(p2pAcc.balance);
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
    getUserAssetBalance(userId, asset) {
        const availAcc = this.getOrCreateAccount(userId, common_1.AccountType.USER_AVAILABLE, asset);
        const lockedAcc = this.getOrCreateAccount(userId, common_1.AccountType.USER_LOCKED, asset);
        const pendAcc = this.getOrCreateAccount(userId, common_1.AccountType.USER_WITHDRAWAL_PENDING, asset);
        const p2pAcc = this.getOrCreateAccount(userId, common_1.AccountType.USER_P2P_ESCROW, asset);
        const available = new common_1.Decimal(availAcc.balance);
        const locked = new common_1.Decimal(lockedAcc.balance);
        const pending = new common_1.Decimal(pendAcc.balance);
        const p2p = new common_1.Decimal(p2pAcc.balance);
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
    performProofOfReservesAudit() {
        const assets = Object.values(common_1.AssetSymbol);
        const report = {};
        let overallSolvent = true;
        for (const asset of assets) {
            let vaultAssets = common_1.Decimal.ZERO;
            let userLiabilities = common_1.Decimal.ZERO;
            for (const account of database_1.db.accounts.values()) {
                if (account.asset !== asset)
                    continue;
                const bal = new common_1.Decimal(account.balance);
                if (account.type === common_1.AccountType.EXCHANGE_HOT_WALLET ||
                    account.type === common_1.AccountType.EXCHANGE_COLD_STORAGE) {
                    vaultAssets = vaultAssets.plus(bal);
                }
                else if (account.type === common_1.AccountType.USER_AVAILABLE ||
                    account.type === common_1.AccountType.USER_LOCKED ||
                    account.type === common_1.AccountType.USER_WITHDRAWAL_PENDING ||
                    account.type === common_1.AccountType.USER_P2P_ESCROW) {
                    userLiabilities = userLiabilities.plus(bal);
                }
            }
            const surplus = vaultAssets.minus(userLiabilities);
            const isSolventForAsset = vaultAssets.gte(userLiabilities);
            if (!isSolventForAsset)
                overallSolvent = false;
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
}
exports.LedgerService = LedgerService;
exports.ledgerService = new LedgerService();
//# sourceMappingURL=ledger.js.map