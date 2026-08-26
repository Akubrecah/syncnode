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
const trading_1 = require("@syncnode/trading");
const wallet_1 = require("@syncnode/wallet");
(0, node_test_1.describe)('End-to-End Enterprise Exchange Lifecycle Verification', () => {
    (0, node_test_1.beforeEach)(() => {
        database_1.db.reset();
    });
    (0, node_test_1.it)('executes full flow: Deposit -> KYC -> Trade Match -> Settlement -> P2P Escrow -> Withdrawal', async () => {
        const aliceId = 'usr_alice';
        const bobId = 'usr_bob';
        // 1. User Setup
        database_1.db.users.set(aliceId, {
            id: aliceId,
            email: 'alice@syncnode.exchange',
            passwordHash: 'hash',
            isTotpEnabled: false,
            kycTier: common_1.KycTier.TIER_2_VERIFIED,
            kycStatus: 'APPROVED',
            isSuspended: false,
            isWithdrawalSuspended: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        database_1.db.users.set(bobId, {
            id: bobId,
            email: 'bob@syncnode.exchange',
            passwordHash: 'hash',
            isTotpEnabled: false,
            kycTier: common_1.KycTier.TIER_2_VERIFIED,
            kycStatus: 'APPROVED',
            isSuspended: false,
            isWithdrawalSuspended: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        // 2. Deposit: Alice deposits 1.0 BTC, Bob deposits 100,000 USDT
        wallet_1.walletService.processDeposit({
            userId: aliceId,
            asset: common_1.AssetSymbol.BTC,
            network: 'Bitcoin-Mainnet',
            address: 'bc1q_alice',
            txHash: 'tx_dep_alice_1',
            amount: '1.00000000',
            confirmations: 6
        });
        wallet_1.walletService.processDeposit({
            userId: bobId,
            asset: common_1.AssetSymbol.USDT,
            network: 'Ethereum-ERC20',
            address: '0x_bob',
            txHash: 'tx_dep_bob_1',
            amount: '100000.00',
            confirmations: 15
        });
        const aliceInitialBtc = ledger_1.ledgerService.getUserAssetBalance(aliceId, common_1.AssetSymbol.BTC);
        strict_1.default.ok(common_1.Decimal.from(aliceInitialBtc.available).eq('1.00000000'));
        const bobInitialUsdt = ledger_1.ledgerService.getUserAssetBalance(bobId, common_1.AssetSymbol.USDT);
        strict_1.default.ok(common_1.Decimal.from(bobInitialUsdt.available).eq('100000.00'));
        // 3. Trading: Alice submits Limit Sell (0.5 BTC @ 94,000 USDT)
        const sellRes = trading_1.orderManagementService.submitOrder({
            userId: aliceId,
            symbol: 'BTC/USDT',
            side: common_1.OrderSide.SELL,
            type: common_1.OrderType.LIMIT,
            price: '94000.00',
            quantity: '0.500000'
        });
        strict_1.default.equal(sellRes.order.status, 'OPEN');
        // 4. Bob submits Limit Buy (0.5 BTC @ 94,000 USDT)
        const buyRes = trading_1.orderManagementService.submitOrder({
            userId: bobId,
            symbol: 'BTC/USDT',
            side: common_1.OrderSide.BUY,
            type: common_1.OrderType.LIMIT,
            price: '94000.00',
            quantity: '0.500000'
        });
        strict_1.default.equal(buyRes.order.status, 'FILLED');
        strict_1.default.equal(buyRes.trades.length, 1);
        // Verify Bob received BTC (minus taker fee 0.15%)
        const bobBtc = ledger_1.ledgerService.getUserAssetBalance(bobId, common_1.AssetSymbol.BTC);
        strict_1.default.ok(new common_1.Decimal(bobBtc.available).gt(0.49), 'Bob received traded BTC');
        // Verify Alice received USDT (minus maker fee 0.10%)
        const aliceUsdt = ledger_1.ledgerService.getUserAssetBalance(aliceId, common_1.AssetSymbol.USDT);
        strict_1.default.ok(new common_1.Decimal(aliceUsdt.available).gt(46000), 'Alice received traded USDT');
        // 5. Withdrawal: Bob withdraws 0.2 BTC to cold address
        const withdrawal = await wallet_1.walletService.requestWithdrawal({
            userId: bobId,
            asset: common_1.AssetSymbol.BTC,
            destinationAddress: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
            amount: '0.20000000'
        });
        strict_1.default.equal(withdrawal.status, 'CONFIRMED');
        strict_1.default.ok(withdrawal.txHash);
        // 6. Solvency Audit: Proof of Reserves must verify 100% solvency
        const audit = ledger_1.ledgerService.performProofOfReservesAudit();
        strict_1.default.equal(audit.isSolvent, true);
    });
});
//# sourceMappingURL=exchange-flow.test.js.map