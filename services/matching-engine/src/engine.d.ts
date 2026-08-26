import { Order } from '@syncnode/common';
import { OrderBook, MatchingResult } from './orderbook.js';
export declare class MatchingEngineManager {
    private readonly logger;
    private orderBooks;
    constructor();
    private initializeMarkets;
    getOrderBook(symbol: string): OrderBook;
    processOrder(order: Order): MatchingResult;
    cancelOrder(order: Order): Order | undefined;
    getDepth(symbol: string, limit?: number): {
        bids: [string, string][];
        asks: [string, string][];
        timestamp: number;
    };
}
export declare const matchingEngine: MatchingEngineManager;
