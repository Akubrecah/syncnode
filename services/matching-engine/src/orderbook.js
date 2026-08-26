"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderBook = void 0;
const common_1 = require("@syncnode/common");
class OrderBook {
    symbol;
    market;
    // Bids: Sorted Descending (highest price first)
    // Asks: Sorted Ascending (lowest price first)
    bids = new Map();
    asks = new Map();
    sequence = 0;
    constructor(market) {
        this.symbol = market.symbol;
        this.market = market;
    }
    getNextSequence() {
        return ++this.sequence;
    }
    getSortedBidPrices() {
        return Array.from(this.bids.keys()).sort((a, b) => (new common_1.Decimal(b).gt(new common_1.Decimal(a)) ? 1 : -1));
    }
    getSortedAskPrices() {
        return Array.from(this.asks.keys()).sort((a, b) => (new common_1.Decimal(a).gt(new common_1.Decimal(b)) ? 1 : -1));
    }
    getBestBid() {
        const prices = this.getSortedBidPrices();
        if (prices.length === 0)
            return undefined;
        return this.bids.get(prices[0]);
    }
    getBestAsk() {
        const prices = this.getSortedAskPrices();
        if (prices.length === 0)
            return undefined;
        return this.asks.get(prices[0]);
    }
    /**
     * Add a Limit Order to the order book.
     */
    addLimitOrder(order) {
        if (!order.price)
            throw new Error('Limit order must specify a price');
        const priceStr = new common_1.Decimal(order.price).toFixed(this.market.priceDecimals);
        const bookMap = order.side === common_1.OrderSide.BUY ? this.bids : this.asks;
        let level = bookMap.get(priceStr);
        if (!level) {
            level = {
                price: priceStr,
                totalQuantity: '0',
                orders: []
            };
            bookMap.set(priceStr, level);
        }
        level.orders.push(order);
        level.totalQuantity = new common_1.Decimal(level.totalQuantity).plus(order.remainingQuantity).toString();
        order.status = common_1.OrderStatus.OPEN;
    }
    /**
     * Remove or cancel an order from the book.
     */
    cancelOrder(orderId, side, price) {
        const priceStr = new common_1.Decimal(price).toFixed(this.market.priceDecimals);
        const bookMap = side === common_1.OrderSide.BUY ? this.bids : this.asks;
        const level = bookMap.get(priceStr);
        if (!level)
            return undefined;
        const idx = level.orders.findIndex((o) => o.id === orderId);
        if (idx === -1)
            return undefined;
        const [order] = level.orders.splice(idx, 1);
        level.totalQuantity = new common_1.Decimal(level.totalQuantity).minus(order.remainingQuantity).toString();
        if (level.orders.length === 0) {
            bookMap.delete(priceStr);
        }
        order.status = common_1.OrderStatus.CANCELED;
        order.updatedAt = Date.now();
        return order;
    }
    /**
     * Process and match an incoming taker order against the opposing side of the order book.
     */
    matchOrder(takerOrder) {
        const executions = [];
        const cancelledOrders = [];
        const isBuy = takerOrder.side === common_1.OrderSide.BUY;
        let remainingTakerQty = new common_1.Decimal(takerOrder.remainingQuantity);
        const takerPrice = takerOrder.price ? new common_1.Decimal(takerOrder.price) : undefined;
        // FOK (Fill or Kill) Pre-check: Verify total liquidity is sufficient before executing
        if (takerOrder.timeInForce === common_1.TimeInForce.FOK) {
            let availableLiquidity = common_1.Decimal.ZERO;
            const sortedPrices = isBuy ? this.getSortedAskPrices() : this.getSortedBidPrices();
            for (const pStr of sortedPrices) {
                const p = new common_1.Decimal(pStr);
                if (isBuy && takerPrice && p.gt(takerPrice))
                    break;
                if (!isBuy && takerPrice && p.lt(takerPrice))
                    break;
                const level = (isBuy ? this.asks : this.bids).get(pStr);
                availableLiquidity = availableLiquidity.plus(level.totalQuantity);
                if (availableLiquidity.gte(remainingTakerQty))
                    break;
            }
            if (availableLiquidity.lt(remainingTakerQty)) {
                takerOrder.status = common_1.OrderStatus.REJECTED;
                takerOrder.updatedAt = Date.now();
                return {
                    takerOrder,
                    executions: [],
                    cancelledOrders: [],
                    isFullyFilled: false,
                    rejectedReason: 'FOK order could not be immediately and completely filled'
                };
            }
        }
        // Post-Only check: If taker would match immediately with existing maker, reject it
        if (takerOrder.timeInForce === common_1.TimeInForce.POST_ONLY && takerPrice) {
            const bestOpposite = isBuy ? this.getBestAsk() : this.getBestBid();
            if (bestOpposite) {
                const bestOppositePrice = new common_1.Decimal(bestOpposite.price);
                const wouldMatch = isBuy ? takerPrice.gte(bestOppositePrice) : takerPrice.lte(bestOppositePrice);
                if (wouldMatch) {
                    takerOrder.status = common_1.OrderStatus.REJECTED;
                    takerOrder.updatedAt = Date.now();
                    return {
                        takerOrder,
                        executions: [],
                        cancelledOrders: [],
                        isFullyFilled: false,
                        rejectedReason: 'Post-Only order would cross the order book and execute as taker'
                    };
                }
            }
        }
        // Matching loop
        while (remainingTakerQty.isPositive()) {
            const sortedPrices = isBuy ? this.getSortedAskPrices() : this.getSortedBidPrices();
            if (sortedPrices.length === 0)
                break;
            const bestPriceStr = sortedPrices[0];
            const bestPrice = new common_1.Decimal(bestPriceStr);
            // Check price limit condition
            if (isBuy && takerPrice && bestPrice.gt(takerPrice)) {
                break; // Best ask is higher than buyer's limit price
            }
            if (!isBuy && takerPrice && bestPrice.lt(takerPrice)) {
                break; // Best bid is lower than seller's limit price
            }
            const bookMap = isBuy ? this.asks : this.bids;
            const level = bookMap.get(bestPriceStr);
            while (level.orders.length > 0 && remainingTakerQty.isPositive()) {
                const makerOrder = level.orders[0];
                // Self-Trade Prevention (STP)
                if (makerOrder.userId === takerOrder.userId) {
                    if (takerOrder.selfTradePrevention === common_1.SelfTradePrevention.CANCEL_MAKER) {
                        level.orders.shift();
                        level.totalQuantity = new common_1.Decimal(level.totalQuantity).minus(makerOrder.remainingQuantity).toString();
                        makerOrder.status = common_1.OrderStatus.CANCELED;
                        makerOrder.updatedAt = Date.now();
                        cancelledOrders.push(makerOrder);
                        continue;
                    }
                    else if (takerOrder.selfTradePrevention === common_1.SelfTradePrevention.CANCEL_TAKER) {
                        takerOrder.status = common_1.OrderStatus.CANCELED;
                        takerOrder.updatedAt = Date.now();
                        cancelledOrders.push(takerOrder);
                        remainingTakerQty = common_1.Decimal.ZERO;
                        break;
                    }
                    else if (takerOrder.selfTradePrevention === common_1.SelfTradePrevention.CANCEL_BOTH) {
                        level.orders.shift();
                        level.totalQuantity = new common_1.Decimal(level.totalQuantity).minus(makerOrder.remainingQuantity).toString();
                        makerOrder.status = common_1.OrderStatus.CANCELED;
                        makerOrder.updatedAt = Date.now();
                        cancelledOrders.push(makerOrder);
                        takerOrder.status = common_1.OrderStatus.CANCELED;
                        takerOrder.updatedAt = Date.now();
                        cancelledOrders.push(takerOrder);
                        remainingTakerQty = common_1.Decimal.ZERO;
                        break;
                    }
                }
                const makerRemaining = new common_1.Decimal(makerOrder.remainingQuantity);
                const matchQty = makerRemaining.lte(remainingTakerQty) ? makerRemaining : remainingTakerQty;
                const matchPrice = bestPriceStr;
                const quoteQty = matchQty.times(matchPrice).toFixed(this.market.priceDecimals);
                // Update Maker Order
                makerOrder.filledQuantity = new common_1.Decimal(makerOrder.filledQuantity).plus(matchQty).toString();
                makerOrder.remainingQuantity = new common_1.Decimal(makerOrder.remainingQuantity).minus(matchQty).toString();
                makerOrder.cumulativeQuoteQuantity = new common_1.Decimal(makerOrder.cumulativeQuoteQuantity).plus(quoteQty).toString();
                makerOrder.updatedAt = Date.now();
                // Update Taker Order
                takerOrder.filledQuantity = new common_1.Decimal(takerOrder.filledQuantity).plus(matchQty).toString();
                takerOrder.remainingQuantity = new common_1.Decimal(takerOrder.remainingQuantity).minus(matchQty).toString();
                takerOrder.cumulativeQuoteQuantity = new common_1.Decimal(takerOrder.cumulativeQuoteQuantity).plus(quoteQty).toString();
                takerOrder.updatedAt = Date.now();
                remainingTakerQty = remainingTakerQty.minus(matchQty);
                level.totalQuantity = new common_1.Decimal(level.totalQuantity).minus(matchQty).toString();
                if (new common_1.Decimal(makerOrder.remainingQuantity).isZero()) {
                    makerOrder.status = common_1.OrderStatus.FILLED;
                    level.orders.shift();
                }
                else {
                    makerOrder.status = common_1.OrderStatus.PARTIALLY_FILLED;
                }
                executions.push({
                    makerOrder,
                    takerOrder,
                    tradePrice: matchPrice,
                    tradeQuantity: matchQty.toString(),
                    quoteQuantity: quoteQty,
                    timestamp: Date.now()
                });
            }
            if (level.orders.length === 0) {
                bookMap.delete(bestPriceStr);
            }
        }
        const isFullyFilled = new common_1.Decimal(takerOrder.remainingQuantity).isZero();
        if (isFullyFilled) {
            takerOrder.status = common_1.OrderStatus.FILLED;
        }
        else if (new common_1.Decimal(takerOrder.filledQuantity).isPositive()) {
            takerOrder.status = common_1.OrderStatus.PARTIALLY_FILLED;
        }
        // Handle IOC (Immediate-Or-Cancel) remainder cancellation
        if (takerOrder.timeInForce === common_1.TimeInForce.IOC && !isFullyFilled) {
            takerOrder.status = common_1.OrderStatus.CANCELED;
            cancelledOrders.push(takerOrder);
        }
        // Handle Unfilled Limit Orders (GTC / POST_ONLY) -> Rest on the Order Book
        else if (!isFullyFilled &&
            takerOrder.type === common_1.OrderType.LIMIT &&
            takerOrder.status !== common_1.OrderStatus.CANCELED) {
            this.addLimitOrder(takerOrder);
        }
        return {
            takerOrder,
            executions,
            cancelledOrders,
            isFullyFilled
        };
    }
    /**
     * Get L2 Depth Snapshot (Aggregated price levels).
     */
    getDepth(limit = 20) {
        const bids = [];
        const asks = [];
        const bidPrices = this.getSortedBidPrices().slice(0, limit);
        for (const p of bidPrices) {
            const level = this.bids.get(p);
            bids.push([level.price, level.totalQuantity]);
        }
        const askPrices = this.getSortedAskPrices().slice(0, limit);
        for (const p of askPrices) {
            const level = this.asks.get(p);
            asks.push([level.price, level.totalQuantity]);
        }
        return {
            bids,
            asks,
            timestamp: Date.now()
        };
    }
}
exports.OrderBook = OrderBook;
//# sourceMappingURL=orderbook.js.map