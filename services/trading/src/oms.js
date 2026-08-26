"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderManagementService = exports.OrderManagementService = void 0;
const common_1 = require("@syncnode/common");
const database_1 = require("@syncnode/database");
const ledger_1 = require("@syncnode/ledger");
const matching_engine_1 = require("@syncnode/matching-engine");
const risk_1 = require("@syncnode/risk");
class OrderManagementService {
    logger = new common_1.Logger('OrderManagementService');
    /**
     * Submit an order through full lifecycle: Validation -> Balance Reservation -> Risk Checks -> Matching -> Ledger Settlement.
     */
    submitOrder(params) {
        const market = common_1.MARKET_REGISTRY[params.symbol];
        if (!market) {
            throw new Error(`Invalid trading pair: ${params.symbol}`);
        }
        const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const timeInForce = params.timeInForce || common_1.TimeInForce.GTC;
        const stp = params.selfTradePrevention || common_1.SelfTradePrevention.CANCEL_MAKER;
        // Calculate required lock amount
        const isBuy = params.side === common_1.OrderSide.BUY;
        const lockedAsset = isBuy ? market.quoteAsset : market.baseAsset;
        let lockedAmount;
        if (isBuy) {
            if (params.type === common_1.OrderType.LIMIT) {
                if (!params.price)
                    throw new Error('Limit buy order must specify price');
                lockedAmount = new common_1.Decimal(params.quantity).times(params.price).toFixed(market.priceDecimals);
            }
            else {
                // Market Buy: Estimate lock based on best ask price or mark price
                const bestAsk = matching_engine_1.matchingEngine.getOrderBook(params.symbol).getBestAsk();
                if (!bestAsk)
                    throw new Error('Cannot place market buy on empty ask order book');
                // Add 1% slippage buffer for market order reservation
                lockedAmount = new common_1.Decimal(params.quantity).times(bestAsk.price).times(1.01).toFixed(market.priceDecimals);
            }
        }
        else {
            // Sell Order: Locks the Base Asset quantity
            lockedAmount = new common_1.Decimal(params.quantity).toFixed(market.qtyDecimals);
        }
        const order = {
            id: orderId,
            clientOrderId: params.clientOrderId,
            userId: params.userId,
            symbol: params.symbol,
            side: params.side,
            type: params.type,
            timeInForce,
            price: params.price ? new common_1.Decimal(params.price).toFixed(market.priceDecimals) : undefined,
            stopPrice: params.stopPrice ? new common_1.Decimal(params.stopPrice).toFixed(market.priceDecimals) : undefined,
            quantity: new common_1.Decimal(params.quantity).toFixed(market.qtyDecimals),
            filledQuantity: '0',
            remainingQuantity: new common_1.Decimal(params.quantity).toFixed(market.qtyDecimals),
            cumulativeQuoteQuantity: '0',
            status: common_1.OrderStatus.NEW,
            selfTradePrevention: stp,
            lockedAmount,
            lockedAsset,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        // 1. Pre-Trade Risk Checks
        const bestBid = matching_engine_1.matchingEngine.getOrderBook(params.symbol).getBestBid();
        const markPrice = bestBid ? bestBid.price : (params.price || undefined);
        risk_1.riskEngine.evaluateOrderRisk(order, markPrice);
        // 2. Lock User Balances in Ledger
        ledger_1.ledgerService.recordTransaction(common_1.TransactionType.ORDER_LOCK, order.id, `lock_${order.id}`, `Lock ${lockedAmount} ${lockedAsset} for order ${order.id}`, [
            {
                userId: order.userId,
                accountType: common_1.AccountType.USER_AVAILABLE,
                asset: lockedAsset,
                direction: common_1.EntryDirection.DEBIT,
                amount: lockedAmount
            },
            {
                userId: order.userId,
                accountType: common_1.AccountType.USER_LOCKED,
                asset: lockedAsset,
                direction: common_1.EntryDirection.CREDIT,
                amount: lockedAmount
            }
        ]);
        order.status = common_1.OrderStatus.OPEN;
        database_1.db.orders.set(order.id, order);
        // 3. Dispatch to Matching Engine
        const matchResult = matching_engine_1.matchingEngine.processOrder(order);
        const trades = [];
        // 4. Process Match Executions & Post-Match Ledger Settlement
        for (const exec of matchResult.executions) {
            const trade = this.settleTradeExecution(exec, market);
            trades.push(trade);
        }
        // 5. Handle Cancellations (STP, IOC, FOK, or rejected orders)
        for (const cancelled of matchResult.cancelledOrders) {
            this.unlockRemainingOrderBalance(cancelled, market);
        }
        // If order is completely filled or cancelled, unlock any excess quote reservation for limit buyers
        if (order.status === common_1.OrderStatus.FILLED && isBuy && order.type === common_1.OrderType.LIMIT) {
            const actualQuoteSpent = new common_1.Decimal(order.cumulativeQuoteQuantity);
            const totalLocked = new common_1.Decimal(order.lockedAmount);
            const refund = totalLocked.minus(actualQuoteSpent);
            if (refund.isPositive()) {
                ledger_1.ledgerService.recordTransaction(common_1.TransactionType.ORDER_UNLOCK, order.id, `refund_${order.id}`, `Refund price improvement excess lock ${refund.toString()} ${market.quoteAsset}`, [
                    {
                        userId: order.userId,
                        accountType: common_1.AccountType.USER_LOCKED,
                        asset: market.quoteAsset,
                        direction: common_1.EntryDirection.DEBIT,
                        amount: refund.toString()
                    },
                    {
                        userId: order.userId,
                        accountType: common_1.AccountType.USER_AVAILABLE,
                        asset: market.quoteAsset,
                        direction: common_1.EntryDirection.CREDIT,
                        amount: refund.toString()
                    }
                ]);
            }
        }
        database_1.db.emitEvent('order.updated', { order, trades });
        return { order, trades };
    }
    /**
     * Settle a single trade fill atomically across buyer, seller, and fee accounts.
     */
    settleTradeExecution(exec, market) {
        const tradeId = `trd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const isBuyerTaker = exec.takerOrder.side === common_1.OrderSide.BUY;
        const buyerOrder = isBuyerTaker ? exec.takerOrder : exec.makerOrder;
        const sellerOrder = isBuyerTaker ? exec.makerOrder : exec.takerOrder;
        const baseAsset = market.baseAsset;
        const quoteAsset = market.quoteAsset;
        const tradeQty = exec.tradeQuantity;
        const quoteQty = exec.quoteQuantity;
        // Fee calculation: Buyer pays fee in Base Asset (or Quote), Seller pays fee in Quote Asset
        const buyerFeeRate = isBuyerTaker ? market.takerFeeRate : market.makerFeeRate;
        const sellerFeeRate = isBuyerTaker ? market.makerFeeRate : market.takerFeeRate;
        const buyerFee = new common_1.Decimal(tradeQty).times(buyerFeeRate).toFixed(market.qtyDecimals);
        const sellerFee = new common_1.Decimal(quoteQty).times(sellerFeeRate).toFixed(market.priceDecimals);
        const netBaseToBuyer = new common_1.Decimal(tradeQty).minus(buyerFee).toFixed(market.qtyDecimals);
        const netQuoteToSeller = new common_1.Decimal(quoteQty).minus(sellerFee).toFixed(market.priceDecimals);
        // Atomic Double-Entry Settlement
        ledger_1.ledgerService.recordTransaction(common_1.TransactionType.TRADE_SETTLEMENT, tradeId, `settle_${tradeId}`, `Settle trade ${tradeId} ${market.symbol} qty=${tradeQty} @ price=${exec.tradePrice}`, [
            // 1. Base Asset Settlement (Seller Locked -> Buyer Available & Exchange Fee)
            {
                userId: sellerOrder.userId,
                accountType: common_1.AccountType.USER_LOCKED,
                asset: baseAsset,
                direction: common_1.EntryDirection.DEBIT,
                amount: tradeQty
            },
            {
                userId: buyerOrder.userId,
                accountType: common_1.AccountType.USER_AVAILABLE,
                asset: baseAsset,
                direction: common_1.EntryDirection.CREDIT,
                amount: netBaseToBuyer
            },
            {
                accountType: common_1.AccountType.TRADING_FEES,
                asset: baseAsset,
                direction: common_1.EntryDirection.CREDIT,
                amount: buyerFee
            },
            // 2. Quote Asset Settlement (Buyer Locked -> Seller Available & Exchange Fee)
            {
                userId: buyerOrder.userId,
                accountType: common_1.AccountType.USER_LOCKED,
                asset: quoteAsset,
                direction: common_1.EntryDirection.DEBIT,
                amount: quoteQty
            },
            {
                userId: sellerOrder.userId,
                accountType: common_1.AccountType.USER_AVAILABLE,
                asset: quoteAsset,
                direction: common_1.EntryDirection.CREDIT,
                amount: netQuoteToSeller
            },
            {
                accountType: common_1.AccountType.TRADING_FEES,
                asset: quoteAsset,
                direction: common_1.EntryDirection.CREDIT,
                amount: sellerFee
            }
        ]);
        const trade = {
            id: tradeId,
            symbol: market.symbol,
            price: exec.tradePrice,
            quantity: tradeQty,
            quoteQuantity: quoteQty,
            buyerOrderId: buyerOrder.id,
            sellerOrderId: sellerOrder.id,
            buyerUserId: buyerOrder.userId,
            sellerUserId: sellerOrder.userId,
            makerSide: exec.makerOrder.side,
            buyerFee,
            buyerFeeAsset: baseAsset,
            sellerFee,
            sellerFeeAsset: quoteAsset,
            timestamp: exec.timestamp
        };
        database_1.db.trades.set(trade.id, trade);
        return trade;
    }
    /**
     * Unlock remaining unexecuted balance when an order is cancelled.
     */
    cancelOrder(orderId, userId) {
        const order = database_1.db.orders.get(orderId);
        if (!order)
            throw new Error(`Order ${orderId} not found`);
        if (order.userId !== userId)
            throw new Error('Unauthorized to cancel this order');
        if ([common_1.OrderStatus.FILLED, common_1.OrderStatus.CANCELED, common_1.OrderStatus.REJECTED].includes(order.status)) {
            throw new Error(`Cannot cancel order in status ${order.status}`);
        }
        matching_engine_1.matchingEngine.cancelOrder(order);
        order.status = common_1.OrderStatus.CANCELED;
        order.updatedAt = Date.now();
        const market = common_1.MARKET_REGISTRY[order.symbol];
        this.unlockRemainingOrderBalance(order, market);
        database_1.db.emitEvent('order.cancelled', { orderId: order.id });
        return order;
    }
    unlockRemainingOrderBalance(order, market) {
        const isBuy = order.side === common_1.OrderSide.BUY;
        const remainingQty = new common_1.Decimal(order.remainingQuantity);
        if (remainingQty.isZero())
            return;
        let unlockAmount;
        if (isBuy) {
            if (!order.price)
                return;
            unlockAmount = remainingQty.times(order.price).toFixed(market.priceDecimals);
        }
        else {
            unlockAmount = remainingQty.toFixed(market.qtyDecimals);
        }
        if (new common_1.Decimal(unlockAmount).isPositive()) {
            ledger_1.ledgerService.recordTransaction(common_1.TransactionType.ORDER_UNLOCK, order.id, `unlock_cancel_${order.id}_${Date.now()}`, `Unlock ${unlockAmount} ${order.lockedAsset} on cancel of order ${order.id}`, [
                {
                    userId: order.userId,
                    accountType: common_1.AccountType.USER_LOCKED,
                    asset: order.lockedAsset,
                    direction: common_1.EntryDirection.DEBIT,
                    amount: unlockAmount
                },
                {
                    userId: order.userId,
                    accountType: common_1.AccountType.USER_AVAILABLE,
                    asset: order.lockedAsset,
                    direction: common_1.EntryDirection.CREDIT,
                    amount: unlockAmount
                }
            ]);
        }
    }
    getOrdersByUser(userId, symbol, openOnly = false) {
        return Array.from(database_1.db.orders.values()).filter((o) => {
            if (o.userId !== userId)
                return false;
            if (symbol && o.symbol !== symbol)
                return false;
            if (openOnly && ![common_1.OrderStatus.OPEN, common_1.OrderStatus.PARTIALLY_FILLED].includes(o.status))
                return false;
            return true;
        }).sort((a, b) => b.createdAt - a.createdAt);
    }
    getTradesForUser(userId, symbol) {
        return Array.from(database_1.db.trades.values()).filter((t) => {
            if (t.buyerUserId !== userId && t.sellerUserId !== userId)
                return false;
            if (symbol && t.symbol !== symbol)
                return false;
            return true;
        }).sort((a, b) => b.timestamp - a.timestamp);
    }
    cancelAllOrders(userId, symbol) {
        const openOrders = this.getOrdersByUser(userId, symbol, true);
        const cancelled = [];
        for (const order of openOrders) {
            try {
                const c = this.cancelOrder(order.id, userId);
                cancelled.push(c);
            }
            catch (e) { }
        }
        return cancelled;
    }
}
exports.OrderManagementService = OrderManagementService;
exports.orderManagementService = new OrderManagementService();
//# sourceMappingURL=oms.js.map