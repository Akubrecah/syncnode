"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchingEngine = exports.MatchingEngineManager = void 0;
const common_1 = require("@syncnode/common");
const orderbook_js_1 = require("./orderbook.js");
class MatchingEngineManager {
    logger = new common_1.Logger('MatchingEngineManager');
    orderBooks = new Map();
    constructor() {
        this.initializeMarkets();
    }
    initializeMarkets() {
        for (const [symbol, market] of Object.entries(common_1.MARKET_REGISTRY)) {
            this.orderBooks.set(symbol, new orderbook_js_1.OrderBook(market));
            this.logger.info(`Initialized order book for market ${symbol}`);
        }
    }
    getOrderBook(symbol) {
        const book = this.orderBooks.get(symbol);
        if (!book) {
            throw new Error(`Order book for market ${symbol} not found`);
        }
        return book;
    }
    processOrder(order) {
        const book = this.getOrderBook(order.symbol);
        return book.matchOrder(order);
    }
    cancelOrder(order) {
        if (!order.price)
            return undefined;
        const book = this.getOrderBook(order.symbol);
        return book.cancelOrder(order.id, order.side, order.price);
    }
    getDepth(symbol, limit = 20) {
        return this.getOrderBook(symbol).getDepth(limit);
    }
}
exports.MatchingEngineManager = MatchingEngineManager;
exports.matchingEngine = new MatchingEngineManager();
//# sourceMappingURL=engine.js.map