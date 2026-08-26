"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const common_1 = require("@syncnode/common");
const orderbook_js_1 = require("../../services/matching-engine/src/orderbook.js");
(0, node_test_1.describe)('Deterministic Matching Engine & LOB Verification', () => {
    let orderBook;
    (0, node_test_1.beforeEach)(() => {
        orderBook = new orderbook_js_1.OrderBook(common_1.MARKET_REGISTRY['BTC/USDT']);
    });
    (0, node_test_1.it)('should match orders according to deterministic Price-Time priority', () => {
        // 1. Add Maker Sell Orders
        const sell1 = {
            id: 'ord_sell_1',
            userId: 'seller_1',
            symbol: 'BTC/USDT',
            side: common_1.OrderSide.SELL,
            type: common_1.OrderType.LIMIT,
            timeInForce: common_1.TimeInForce.GTC,
            price: '94000.00',
            quantity: '1.000000',
            filledQuantity: '0',
            remainingQuantity: '1.000000',
            cumulativeQuoteQuantity: '0',
            status: common_1.OrderStatus.OPEN,
            selfTradePrevention: common_1.SelfTradePrevention.CANCEL_MAKER,
            lockedAmount: '1.000000',
            lockedAsset: common_1.AssetSymbol.BTC,
            createdAt: 1000,
            updatedAt: 1000
        };
        const sell2 = {
            id: 'ord_sell_2',
            userId: 'seller_2',
            symbol: 'BTC/USDT',
            side: common_1.OrderSide.SELL,
            type: common_1.OrderType.LIMIT,
            timeInForce: common_1.TimeInForce.GTC,
            price: '94000.00', // Same price, submitted later (time priority test)
            quantity: '1.500000',
            filledQuantity: '0',
            remainingQuantity: '1.500000',
            cumulativeQuoteQuantity: '0',
            status: common_1.OrderStatus.OPEN,
            selfTradePrevention: common_1.SelfTradePrevention.CANCEL_MAKER,
            lockedAmount: '1.500000',
            lockedAsset: common_1.AssetSymbol.BTC,
            createdAt: 2000,
            updatedAt: 2000
        };
        orderBook.addLimitOrder(sell1);
        orderBook.addLimitOrder(sell2);
        // 2. Incoming Taker Buy Order matching first seller completely and second seller partially
        const buyTaker = {
            id: 'ord_buy_taker',
            userId: 'buyer_1',
            symbol: 'BTC/USDT',
            side: common_1.OrderSide.BUY,
            type: common_1.OrderType.LIMIT,
            timeInForce: common_1.TimeInForce.GTC,
            price: '94000.00',
            quantity: '1.800000',
            filledQuantity: '0',
            remainingQuantity: '1.800000',
            cumulativeQuoteQuantity: '0',
            status: common_1.OrderStatus.NEW,
            selfTradePrevention: common_1.SelfTradePrevention.CANCEL_MAKER,
            lockedAmount: '169200.00',
            lockedAsset: common_1.AssetSymbol.USDT,
            createdAt: 3000,
            updatedAt: 3000
        };
        const result = orderBook.matchOrder(buyTaker);
        strict_1.default.equal(result.executions.length, 2);
        // First fill with seller_1 (1.0 BTC)
        strict_1.default.equal(result.executions[0].makerOrder.id, 'ord_sell_1');
        strict_1.default.ok(common_1.Decimal.from(result.executions[0].tradeQuantity).eq('1.000000'));
        strict_1.default.equal(sell1.status, common_1.OrderStatus.FILLED);
        // Second fill with seller_2 (0.8 BTC)
        strict_1.default.equal(result.executions[1].makerOrder.id, 'ord_sell_2');
        strict_1.default.ok(common_1.Decimal.from(result.executions[1].tradeQuantity).eq('0.800000'));
        strict_1.default.equal(sell2.status, common_1.OrderStatus.PARTIALLY_FILLED);
        strict_1.default.ok(common_1.Decimal.from(sell2.remainingQuantity).eq('0.700000'));
        // Taker is fully filled
        strict_1.default.equal(result.isFullyFilled, true);
        strict_1.default.equal(buyTaker.status, common_1.OrderStatus.FILLED);
    });
    (0, node_test_1.it)('should enforce Post-Only order cancellation when crossing existing book', () => {
        // Resting ask at 94,000
        const sell = {
            id: 'ord_sell_rest',
            userId: 'seller_1',
            symbol: 'BTC/USDT',
            side: common_1.OrderSide.SELL,
            type: common_1.OrderType.LIMIT,
            timeInForce: common_1.TimeInForce.GTC,
            price: '94000.00',
            quantity: '1.000000',
            filledQuantity: '0',
            remainingQuantity: '1.000000',
            cumulativeQuoteQuantity: '0',
            status: common_1.OrderStatus.OPEN,
            selfTradePrevention: common_1.SelfTradePrevention.CANCEL_MAKER,
            lockedAmount: '1.000000',
            lockedAsset: common_1.AssetSymbol.BTC,
            createdAt: 1000,
            updatedAt: 1000
        };
        orderBook.addLimitOrder(sell);
        // Incoming Post-Only Buy at 94,000 (would execute immediately as taker)
        const postOnlyBuy = {
            id: 'ord_post_only_cross',
            userId: 'buyer_1',
            symbol: 'BTC/USDT',
            side: common_1.OrderSide.BUY,
            type: common_1.OrderType.LIMIT,
            timeInForce: common_1.TimeInForce.POST_ONLY,
            price: '94000.00',
            quantity: '0.500000',
            filledQuantity: '0',
            remainingQuantity: '0.500000',
            cumulativeQuoteQuantity: '0',
            status: common_1.OrderStatus.NEW,
            selfTradePrevention: common_1.SelfTradePrevention.CANCEL_MAKER,
            lockedAmount: '47000.00',
            lockedAsset: common_1.AssetSymbol.USDT,
            createdAt: 2000,
            updatedAt: 2000
        };
        const result = orderBook.matchOrder(postOnlyBuy);
        strict_1.default.equal(result.executions.length, 0);
        strict_1.default.equal(postOnlyBuy.status, common_1.OrderStatus.REJECTED);
    });
    (0, node_test_1.it)('should enforce Self-Trade Prevention (STP) CANCEL_MAKER', () => {
        const restingOrder = {
            id: 'ord_user1_sell',
            userId: 'same_user_123',
            symbol: 'BTC/USDT',
            side: common_1.OrderSide.SELL,
            type: common_1.OrderType.LIMIT,
            timeInForce: common_1.TimeInForce.GTC,
            price: '94000.00',
            quantity: '1.000000',
            filledQuantity: '0',
            remainingQuantity: '1.000000',
            cumulativeQuoteQuantity: '0',
            status: common_1.OrderStatus.OPEN,
            selfTradePrevention: common_1.SelfTradePrevention.CANCEL_MAKER,
            lockedAmount: '1.000000',
            lockedAsset: common_1.AssetSymbol.BTC,
            createdAt: 1000,
            updatedAt: 1000
        };
        orderBook.addLimitOrder(restingOrder);
        const incomingOrder = {
            id: 'ord_user1_buy',
            userId: 'same_user_123', // Same user!
            symbol: 'BTC/USDT',
            side: common_1.OrderSide.BUY,
            type: common_1.OrderType.LIMIT,
            timeInForce: common_1.TimeInForce.GTC,
            price: '94000.00',
            quantity: '1.000000',
            filledQuantity: '0',
            remainingQuantity: '1.000000',
            cumulativeQuoteQuantity: '0',
            status: common_1.OrderStatus.NEW,
            selfTradePrevention: common_1.SelfTradePrevention.CANCEL_MAKER,
            lockedAmount: '94000.00',
            lockedAsset: common_1.AssetSymbol.USDT,
            createdAt: 2000,
            updatedAt: 2000
        };
        const result = orderBook.matchOrder(incomingOrder);
        strict_1.default.equal(result.executions.length, 0, 'No self-trade executed');
        strict_1.default.equal(result.cancelledOrders.length, 1);
        strict_1.default.equal(result.cancelledOrders[0].id, 'ord_user1_sell');
        strict_1.default.equal(restingOrder.status, common_1.OrderStatus.CANCELED);
    });
});
//# sourceMappingURL=matching-engine.test.js.map