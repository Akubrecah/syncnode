import { Order, OrderSide, MarketPair } from '@syncnode/common';
export interface MatchExecution {
    makerOrder: Order;
    takerOrder: Order;
    tradePrice: string;
    tradeQuantity: string;
    quoteQuantity: string;
    timestamp: number;
}
export interface MatchingResult {
    takerOrder: Order;
    executions: MatchExecution[];
    cancelledOrders: Order[];
    isFullyFilled: boolean;
    rejectedReason?: string;
}
export interface PriceLevel {
    price: string;
    totalQuantity: string;
    orders: Order[];
}
export declare class OrderBook {
    readonly symbol: string;
    readonly market: MarketPair;
    bids: Map<string, PriceLevel>;
    asks: Map<string, PriceLevel>;
    private sequence;
    constructor(market: MarketPair);
    getNextSequence(): number;
    getSortedBidPrices(): string[];
    getSortedAskPrices(): string[];
    getBestBid(): PriceLevel | undefined;
    getBestAsk(): PriceLevel | undefined;
    /**
     * Add a Limit Order to the order book.
     */
    addLimitOrder(order: Order): void;
    /**
     * Remove or cancel an order from the book.
     */
    cancelOrder(orderId: string, side: OrderSide, price: string): Order | undefined;
    /**
     * Process and match an incoming taker order against the opposing side of the order book.
     */
    matchOrder(takerOrder: Order): MatchingResult;
    /**
     * Get L2 Depth Snapshot (Aggregated price levels).
     */
    getDepth(limit?: number): {
        bids: [string, string][];
        asks: [string, string][];
        timestamp: number;
    };
}
