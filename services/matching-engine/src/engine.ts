import {
  Order,
  OrderSide,
  OrderType,
  OrderStatus,
  MARKET_REGISTRY,
  MarketPair,
  Logger
} from '@syncnode/common';
import { OrderBook, MatchingResult } from './orderbook.js';

export class MatchingEngineManager {
  private readonly logger = new Logger('MatchingEngineManager');
  private orderBooks: Map<string, OrderBook> = new Map();

  constructor() {
    this.initializeMarkets();
  }

  private initializeMarkets(): void {
    for (const [symbol, market] of Object.entries(MARKET_REGISTRY)) {
      this.orderBooks.set(symbol, new OrderBook(market));
      this.logger.info(`Initialized order book for market ${symbol}`);
    }
  }

  public getOrderBook(symbol: string): OrderBook {
    const book = this.orderBooks.get(symbol);
    if (!book) {
      throw new Error(`Order book for market ${symbol} not found`);
    }
    return book;
  }

  public processOrder(order: Order): MatchingResult {
    const book = this.getOrderBook(order.symbol);
    return book.matchOrder(order);
  }

  public cancelOrder(order: Order): Order | undefined {
    if (!order.price) return undefined;
    const book = this.getOrderBook(order.symbol);
    return book.cancelOrder(order.id, order.side, order.price);
  }

  public getDepth(symbol: string, limit = 20) {
    return this.getOrderBook(symbol).getDepth(limit);
  }
}

export const matchingEngine = new MatchingEngineManager();
