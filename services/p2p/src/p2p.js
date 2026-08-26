"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.p2pService = exports.P2PService = void 0;
const common_1 = require("@syncnode/common");
const database_1 = require("@syncnode/database");
const ledger_1 = require("@syncnode/ledger");
class P2PService {
    logger = new common_1.Logger('P2PService');
    constructor() {
        this.seedP2PAds();
    }
    seedP2PAds() {
        // Seed verified institutional liquidity maker advertisements
        const initialAds = [
            {
                id: 'p2pad_usdt_usd_1',
                merchantId: 'merchant_apex_liquidity',
                merchantName: 'ApexGlobal (99.8% completion)',
                type: common_1.P2POrderType.SELL, // Sells USDT to user
                asset: common_1.AssetSymbol.USDT,
                fiatCurrency: 'USD',
                price: '1.00',
                totalCryptoAmount: '50000.00',
                availableCryptoAmount: '50000.00',
                minFiatLimit: '50.00',
                maxFiatLimit: '10000.00',
                paymentMethods: ['Bank Wire', 'Zelle', 'Revolut'],
                terms: 'Instant release upon proof of payment receipt. Fast & secure.',
                isActive: true,
                createdAt: Date.now()
            },
            {
                id: 'p2pad_btc_usd_1',
                merchantId: 'merchant_sat_vault',
                merchantName: 'SatoshiVault (100% completion)',
                type: common_1.P2POrderType.SELL,
                asset: common_1.AssetSymbol.BTC,
                fiatCurrency: 'USD',
                price: '94300.00',
                totalCryptoAmount: '5.00000000',
                availableCryptoAmount: '5.00000000',
                minFiatLimit: '100.00',
                maxFiatLimit: '50000.00',
                paymentMethods: ['Bank Wire', 'Wise', 'SEPA'],
                terms: 'KYC verified buyers only. 15 minute payment window.',
                isActive: true,
                createdAt: Date.now()
            },
            {
                id: 'p2pad_eth_eur_1',
                merchantId: 'merchant_euro_crypto',
                merchantName: 'EuroCryptoDirect (99.5%)',
                type: common_1.P2POrderType.SELL,
                asset: common_1.AssetSymbol.ETH,
                fiatCurrency: 'EUR',
                price: '3150.00',
                totalCryptoAmount: '25.00000',
                availableCryptoAmount: '25.00000',
                minFiatLimit: '50.00',
                maxFiatLimit: '20000.00',
                paymentMethods: ['SEPA Instant', 'Revolut'],
                terms: 'Strictly matching IBAN names only.',
                isActive: true,
                createdAt: Date.now()
            }
        ];
        for (const ad of initialAds) {
            database_1.db.p2pAds.set(ad.id, ad);
        }
    }
    getAds(asset, fiatCurrency, type) {
        return Array.from(database_1.db.p2pAds.values()).filter((ad) => {
            if (!ad.isActive)
                return false;
            if (asset && ad.asset !== asset)
                return false;
            if (fiatCurrency && ad.fiatCurrency !== fiatCurrency)
                return false;
            if (type && ad.type !== type)
                return false;
            return true;
        });
    }
    createAd(params) {
        const id = `p2pad_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const ad = {
            id,
            ...params,
            availableCryptoAmount: params.totalCryptoAmount,
            isActive: true,
            createdAt: Date.now()
        };
        database_1.db.p2pAds.set(ad.id, ad);
        return ad;
    }
    /**
     * Initiate a P2P Trade Order and lock cryptocurrency in Escrow.
     */
    initiateTrade(params) {
        const ad = database_1.db.p2pAds.get(params.adId);
        if (!ad || !ad.isActive)
            throw new Error('P2P Advertisement is no longer available');
        const cryptoAmt = new common_1.Decimal(params.cryptoAmount);
        if (cryptoAmt.gt(ad.availableCryptoAmount)) {
            throw new Error(`Requested amount exceeds available advertisement capacity of ${ad.availableCryptoAmount}`);
        }
        const fiatAmount = cryptoAmt.times(ad.price).toFixed(2);
        if (new common_1.Decimal(fiatAmount).lt(ad.minFiatLimit) || new common_1.Decimal(fiatAmount).gt(ad.maxFiatLimit)) {
            throw new Error(`Fiat amount ${fiatAmount} ${ad.fiatCurrency} outside limit [${ad.minFiatLimit}, ${ad.maxFiatLimit}]`);
        }
        // Determine seller and buyer
        const isMerchantSeller = ad.type === common_1.P2POrderType.SELL;
        const sellerUserId = isMerchantSeller ? ad.merchantId : params.buyerUserId;
        const buyerUserId = isMerchantSeller ? params.buyerUserId : ad.merchantId;
        const tradeId = `p2ptrd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        // If seller is a regular user (not merchant system mock), lock their crypto in Escrow
        if (!sellerUserId.startsWith('merchant_')) {
            ledger_1.ledgerService.recordTransaction(common_1.TransactionType.P2P_ESCROW_LOCK, tradeId, `p2p_lock_${tradeId}`, `Lock ${params.cryptoAmount} ${ad.asset} in P2P Escrow for trade ${tradeId}`, [
                {
                    userId: sellerUserId,
                    accountType: common_1.AccountType.USER_AVAILABLE,
                    asset: ad.asset,
                    direction: common_1.EntryDirection.DEBIT,
                    amount: params.cryptoAmount
                },
                {
                    userId: sellerUserId,
                    accountType: common_1.AccountType.USER_P2P_ESCROW,
                    asset: ad.asset,
                    direction: common_1.EntryDirection.CREDIT,
                    amount: params.cryptoAmount
                }
            ]);
        }
        // Deduct available crypto from Ad
        ad.availableCryptoAmount = new common_1.Decimal(ad.availableCryptoAmount).minus(params.cryptoAmount).toString();
        const trade = {
            id: tradeId,
            adId: ad.id,
            buyerUserId,
            sellerUserId,
            asset: ad.asset,
            cryptoAmount: params.cryptoAmount,
            fiatAmount,
            fiatCurrency: ad.fiatCurrency,
            price: ad.price,
            paymentMethod: params.paymentMethod,
            status: common_1.P2PEscrowStatus.ESCROW_LOCKED,
            escrowLockedAt: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        database_1.db.p2pTrades.set(trade.id, trade);
        database_1.db.emitEvent('p2p.trade.created', { trade });
        return trade;
    }
    /**
     * Buyer marks fiat payment as sent.
     */
    markFiatPaid(tradeId, buyerUserId) {
        const trade = database_1.db.p2pTrades.get(tradeId);
        if (!trade)
            throw new Error('Trade not found');
        if (trade.buyerUserId !== buyerUserId)
            throw new Error('Unauthorized');
        if (trade.status !== common_1.P2PEscrowStatus.ESCROW_LOCKED) {
            throw new Error(`Cannot mark paid in status ${trade.status}`);
        }
        trade.status = common_1.P2PEscrowStatus.FIAT_MARKED_PAID;
        trade.fiatPaidAt = Date.now();
        trade.updatedAt = Date.now();
        database_1.db.emitEvent('p2p.trade.paid', { trade });
        return trade;
    }
    /**
     * Seller confirms receipt of fiat payment and releases crypto escrow to buyer.
     */
    releaseEscrow(tradeId, sellerUserId) {
        const trade = database_1.db.p2pTrades.get(tradeId);
        if (!trade)
            throw new Error('Trade not found');
        if (trade.sellerUserId !== sellerUserId && !sellerUserId.startsWith('admin_') && !trade.sellerUserId.startsWith('merchant_')) {
            throw new Error('Unauthorized to release this escrow');
        }
        if (trade.status !== common_1.P2PEscrowStatus.FIAT_MARKED_PAID && !sellerUserId.startsWith('admin_')) {
            throw new Error('Buyer has not yet confirmed fiat payment');
        }
        trade.status = common_1.P2PEscrowStatus.RELEASED;
        trade.releasedAt = Date.now();
        trade.updatedAt = Date.now();
        // Release funds from Seller's Escrow to Buyer's Available Balance
        if (!trade.sellerUserId.startsWith('merchant_')) {
            ledger_1.ledgerService.recordTransaction(common_1.TransactionType.P2P_ESCROW_RELEASE, trade.id, `p2p_rel_${trade.id}`, `Release P2P Escrow ${trade.cryptoAmount} ${trade.asset} to buyer ${trade.buyerUserId}`, [
                {
                    userId: trade.sellerUserId,
                    accountType: common_1.AccountType.USER_P2P_ESCROW,
                    asset: trade.asset,
                    direction: common_1.EntryDirection.DEBIT,
                    amount: trade.cryptoAmount
                },
                {
                    userId: trade.buyerUserId,
                    accountType: common_1.AccountType.USER_AVAILABLE,
                    asset: trade.asset,
                    direction: common_1.EntryDirection.CREDIT,
                    amount: trade.cryptoAmount
                }
            ]);
        }
        else {
            // Merchant liquidity provider release -> Credit buyer available balance from hot wallet
            ledger_1.ledgerService.recordTransaction(common_1.TransactionType.P2P_ESCROW_RELEASE, trade.id, `p2p_rel_mch_${trade.id}`, `Credit buyer ${trade.buyerUserId} for P2P purchase of ${trade.cryptoAmount} ${trade.asset}`, [
                {
                    accountType: common_1.AccountType.EXCHANGE_HOT_WALLET,
                    asset: trade.asset,
                    direction: common_1.EntryDirection.DEBIT,
                    amount: trade.cryptoAmount
                },
                {
                    userId: trade.buyerUserId,
                    accountType: common_1.AccountType.USER_AVAILABLE,
                    asset: trade.asset,
                    direction: common_1.EntryDirection.CREDIT,
                    amount: trade.cryptoAmount
                }
            ]);
        }
        database_1.db.emitEvent('p2p.trade.released', { trade });
        return trade;
    }
    openDispute(tradeId, userId, reason) {
        const trade = database_1.db.p2pTrades.get(tradeId);
        if (!trade)
            throw new Error('Trade not found');
        if (trade.buyerUserId !== userId && trade.sellerUserId !== userId)
            throw new Error('Unauthorized');
        trade.status = common_1.P2PEscrowStatus.DISPUTED;
        trade.disputeReason = reason;
        trade.updatedAt = Date.now();
        database_1.db.logAudit({
            actorId: userId,
            actorType: 'USER',
            action: 'P2P_TRADE_DISPUTE_OPENED',
            targetId: tradeId,
            metadata: { reason }
        });
        return trade;
    }
    getTradesByUser(userId) {
        return Array.from(database_1.db.p2pTrades.values())
            .filter((t) => t.buyerUserId === userId || t.sellerUserId === userId)
            .sort((a, b) => b.createdAt - a.createdAt);
    }
    cancelTrade(tradeId, userId) {
        const trade = database_1.db.p2pTrades.get(tradeId);
        if (!trade)
            throw new Error('Trade not found');
        if (trade.buyerUserId !== userId && trade.sellerUserId !== userId && !userId.startsWith('admin_')) {
            throw new Error('Unauthorized to cancel this trade');
        }
        if (trade.status !== common_1.P2PEscrowStatus.ESCROW_LOCKED) {
            throw new Error(`Cannot cancel trade in status ${trade.status}`);
        }
        trade.status = common_1.P2PEscrowStatus.CANCELLED;
        trade.updatedAt = Date.now();
        // If seller is a regular user, unlock their escrow balance back to available
        if (!trade.sellerUserId.startsWith('merchant_')) {
            ledger_1.ledgerService.recordTransaction(common_1.TransactionType.P2P_ESCROW_RELEASE, trade.id, `p2p_cancel_${trade.id}`, `Unlock cancelled P2P escrow ${trade.cryptoAmount} ${trade.asset} to seller ${trade.sellerUserId}`, [
                {
                    userId: trade.sellerUserId,
                    accountType: common_1.AccountType.USER_P2P_ESCROW,
                    asset: trade.asset,
                    direction: common_1.EntryDirection.DEBIT,
                    amount: trade.cryptoAmount
                },
                {
                    userId: trade.sellerUserId,
                    accountType: common_1.AccountType.USER_AVAILABLE,
                    asset: trade.asset,
                    direction: common_1.EntryDirection.CREDIT,
                    amount: trade.cryptoAmount
                }
            ]);
        }
        // Return crypto capacity to Ad
        const ad = database_1.db.p2pAds.get(trade.adId);
        if (ad) {
            ad.availableCryptoAmount = new common_1.Decimal(ad.availableCryptoAmount).plus(trade.cryptoAmount).toString();
        }
        database_1.db.emitEvent('p2p.trade.cancelled', { trade });
        return trade;
    }
}
exports.P2PService = P2PService;
exports.p2pService = new P2PService();
//# sourceMappingURL=p2p.js.map