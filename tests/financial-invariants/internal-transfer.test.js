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
const wallet_1 = require("@syncnode/wallet");
const market_data_1 = require("@syncnode/market-data");

(0, node_test_1.describe)('Transfer & Live Market Data Verification', () => {
    (0, node_test_1.beforeEach)(() => {
        database_1.db.reset();
    });

    (0, node_test_1.it)('should execute instant zero-fee internal transfer between users and preserve ledger balance invariant', () => {
        const sender = {
            id: 'usr_alice',
            email: 'alice@institution.com',
            passwordHash: 'hash',
            isTotpEnabled: false,
            kycTier: 2,
            kycStatus: 'APPROVED',
            isSuspended: false,
            isWithdrawalSuspended: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        const recipient = {
            id: 'usr_bob',
            email: 'bob@hedgefund.com',
            passwordHash: 'hash',
            isTotpEnabled: false,
            kycTier: 2,
            kycStatus: 'APPROVED',
            isSuspended: false,
            isWithdrawalSuspended: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        database_1.db.users.set(sender.id, sender);
        database_1.db.usersByEmail.set(sender.email.toLowerCase(), sender.id);
        database_1.db.users.set(recipient.id, recipient);
        database_1.db.usersByEmail.set(recipient.email.toLowerCase(), recipient.id);

        // Credit Alice with 5000 USDT
        wallet_1.walletService.processDeposit({
            userId: sender.id,
            asset: common_1.AssetSymbol.USDT,
            network: 'Ethereum-ERC20',
            address: '0xalice',
            txHash: 'tx_alice_init',
            amount: '5000.00',
            confirmations: 15
        });

        // Alice transfers 1250 USDT to Bob via Bob's email
        const transfer = wallet_1.walletService.transferInternal({
            senderUserId: sender.id,
            recipientIdentifier: 'bob@hedgefund.com',
            asset: common_1.AssetSymbol.USDT,
            amount: '1250.00',
            note: 'Prime settlement payment'
        });

        strict_1.default.equal(transfer.status, common_1.TransferStatus.COMPLETED);
        strict_1.default.equal(transfer.amount, '1250.00');
        strict_1.default.equal(transfer.fee, '0.00');
        strict_1.default.equal(transfer.recipientUserId, recipient.id);

        // Check balances
        const aliceBalance = ledger_1.ledgerService.getUserAssetBalance(sender.id, common_1.AssetSymbol.USDT);
        const bobBalance = ledger_1.ledgerService.getUserAssetBalance(recipient.id, common_1.AssetSymbol.USDT);

        strict_1.default.ok(common_1.Decimal.from(aliceBalance.available).eq('3750'));
        strict_1.default.ok(common_1.Decimal.from(bobBalance.available).eq('1250'));

        // Total liabilities should exactly equal 5000 USDT in vault reserves
        const audit = ledger_1.ledgerService.performProofOfReservesAudit();
        strict_1.default.equal(audit.isSolvent, true);
    });

    (0, node_test_1.it)('should reject internal transfer if balance is insufficient or transferring to self', () => {
        const sender = {
            id: 'usr_alice2',
            email: 'alice2@test.com',
            passwordHash: 'hash',
            isTotpEnabled: false,
            kycTier: 2,
            kycStatus: 'APPROVED',
            isSuspended: false,
            isWithdrawalSuspended: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        database_1.db.users.set(sender.id, sender);
        database_1.db.usersByEmail.set(sender.email.toLowerCase(), sender.id);

        // Self transfer should throw
        strict_1.default.throws(() => {
            wallet_1.walletService.transferInternal({
                senderUserId: sender.id,
                recipientIdentifier: sender.email,
                asset: common_1.AssetSymbol.BTC,
                amount: '1.0'
            });
        }, /Cannot transfer funds to yourself/);

        // Non-existent user should throw
        strict_1.default.throws(() => {
            wallet_1.walletService.transferInternal({
                senderUserId: sender.id,
                recipientIdentifier: 'unknown@user.com',
                asset: common_1.AssetSymbol.BTC,
                amount: '1.0'
            });
        }, /Recipient "unknown@user.com" not found/);
    });

    (0, node_test_1.it)('should pull live market data and populate real-time ticker feeds', async () => {
        const liveFeeds = await market_data_1.marketDataService.pullLiveMarketData();
        strict_1.default.ok(liveFeeds.length >= 4);

        const btcFeed = liveFeeds.find((f) => f.symbol === 'BTC/USDT');
        strict_1.default.ok(btcFeed);
        strict_1.default.ok(parseFloat(btcFeed.lastPrice) > 10000);
        strict_1.default.ok(btcFeed.isLive);

        const status = market_data_1.marketDataService.getLiveFeedStatus();
        strict_1.default.equal(status.isLive, true);
    });
});