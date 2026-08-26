"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const common_1 = require("@syncnode/common");
const database_1 = require("@syncnode/database");
const ledger_1 = require("@syncnode/ledger");
(0, node_test_1.describe)('Financial Invariants & Double-Entry Ledger Verification', () => {
    (0, node_test_1.beforeEach)(() => {
        database_1.db.reset();
    });
    (0, node_test_1.it)('should enforce strict debits == credits balance per asset', () => {
        const userId = 'usr_test_1';
        // 1. Valid balanced deposit: Debit Vault, Credit User
        const tx = ledger_1.ledgerService.recordTransaction(common_1.TransactionType.DEPOSIT, 'dep_1', 'idemp_dep_1', 'Test Deposit 1 BTC', [
            {
                accountType: common_1.AccountType.EXCHANGE_HOT_WALLET,
                asset: common_1.AssetSymbol.BTC,
                direction: common_1.EntryDirection.DEBIT,
                amount: '1.00000000'
            },
            {
                userId,
                accountType: common_1.AccountType.USER_AVAILABLE,
                asset: common_1.AssetSymbol.BTC,
                direction: common_1.EntryDirection.CREDIT,
                amount: '1.00000000'
            }
        ]);
        strict_1.default.ok(tx.id);
        const balance = ledger_1.ledgerService.getUserAssetBalance(userId, common_1.AssetSymbol.BTC);
        strict_1.default.ok(common_1.Decimal.from(balance.available).eq('1.00000000'));
        strict_1.default.ok(common_1.Decimal.from(balance.total).eq('1.00000000'));
    });
    (0, node_test_1.it)('should reject unbalanced transactions with FinancialInvariantError', () => {
        const userId = 'usr_test_2';
        strict_1.default.throws(() => {
            ledger_1.ledgerService.recordTransaction(common_1.TransactionType.ADMIN_ADJUSTMENT, 'adj_unbalanced', 'idemp_unbalanced', 'Unbalanced creation of funds', [
                {
                    accountType: common_1.AccountType.EXCHANGE_HOT_WALLET,
                    asset: common_1.AssetSymbol.USDT,
                    direction: common_1.EntryDirection.DEBIT,
                    amount: '1000.00'
                },
                {
                    userId,
                    accountType: common_1.AccountType.USER_AVAILABLE,
                    asset: common_1.AssetSymbol.USDT,
                    direction: common_1.EntryDirection.CREDIT,
                    amount: '500.00' // Unbalanced!
                }
            ]);
        }, common_1.FinancialInvariantError, 'Should throw error when Debits != Credits');
    });
    (0, node_test_1.it)('should prevent negative balances during debit operations', () => {
        const userId = 'usr_test_poor';
        strict_1.default.throws(() => {
            ledger_1.ledgerService.recordTransaction(common_1.TransactionType.ORDER_LOCK, 'ord_overflow', 'idemp_overflow', 'Attempt lock on zero balance', [
                {
                    userId,
                    accountType: common_1.AccountType.USER_AVAILABLE,
                    asset: common_1.AssetSymbol.USDT,
                    direction: common_1.EntryDirection.DEBIT,
                    amount: '5000.00'
                },
                {
                    userId,
                    accountType: common_1.AccountType.USER_LOCKED,
                    asset: common_1.AssetSymbol.USDT,
                    direction: common_1.EntryDirection.CREDIT,
                    amount: '5000.00'
                }
            ]);
        }, common_1.InsufficientBalanceError, 'Should reject spending more than available balance');
    });
    (0, node_test_1.it)('should maintain 100% solvency in Proof of Reserves', () => {
        const userA = 'usr_solvency_a';
        const userB = 'usr_solvency_b';
        // Deposit 5 BTC for User A
        ledger_1.ledgerService.recordTransaction(common_1.TransactionType.DEPOSIT, 'dep_a', 'idemp_dep_a', 'User A deposit 5 BTC', [
            { accountType: common_1.AccountType.EXCHANGE_HOT_WALLET, asset: common_1.AssetSymbol.BTC, direction: common_1.EntryDirection.DEBIT, amount: '5.00000000' },
            { userId: userA, accountType: common_1.AccountType.USER_AVAILABLE, asset: common_1.AssetSymbol.BTC, direction: common_1.EntryDirection.CREDIT, amount: '5.00000000' }
        ]);
        // Deposit 10 BTC for User B
        ledger_1.ledgerService.recordTransaction(common_1.TransactionType.DEPOSIT, 'dep_b', 'idemp_dep_b', 'User B deposit 10 BTC', [
            { accountType: common_1.AccountType.EXCHANGE_HOT_WALLET, asset: common_1.AssetSymbol.BTC, direction: common_1.EntryDirection.DEBIT, amount: '10.00000000' },
            { userId: userB, accountType: common_1.AccountType.USER_AVAILABLE, asset: common_1.AssetSymbol.BTC, direction: common_1.EntryDirection.CREDIT, amount: '10.00000000' }
        ]);
        const audit = ledger_1.ledgerService.performProofOfReservesAudit();
        strict_1.default.equal(audit.isSolvent, true);
        strict_1.default.ok(common_1.Decimal.from(audit.assets['BTC'].totalAssets).eq('15.00000000'));
        strict_1.default.ok(common_1.Decimal.from(audit.assets['BTC'].totalLiabilities).eq('15.00000000'));
        strict_1.default.equal(audit.assets['BTC'].ratio, '100.00%');
    });
});
//# sourceMappingURL=ledger-invariants.test.js.map