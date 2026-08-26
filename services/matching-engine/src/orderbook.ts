import {
  Order,
  OrderSide,
  OrderType,
  TimeInForce,
  OrderStatus,
  SelfTradePrevention,
  Decimal,
  MarketPair
} from '@syncnode/common';

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

export class OrderBook {
  public readonly symbol: string;
  public readonly market: MarketPair;

  // Bids: Sorted Descending (highest price first)
  // Asks: Sorted Ascending (lowest price first)
  public bids: Map<string, PriceLevel> = new Map();
  public asks: Map<string, PriceLevel> = new Map();

  private sequence = 0;

  constructor(market: MarketPair) {
    this.symbol = market.symbol;
    this.market = market;
  }

  public getNextSequence(): number {
    return ++this.sequence;
  }

  public getSortedBidPrices(): string[] {
    return Array.from(this.bids.keys()).sort((a, b) => (new Decimal(b).gt(new Decimal(a)) ? 1 : -1));
  }

  public getSortedAskPrices(): string[] {
    return Array.from(this.asks.keys()).sort((a, b) => (new Decimal(a).gt(new Decimal(b)) ? 1 : -1));
  }

  public getBestBid(): PriceLevel | undefined {
    const prices = this.getSortedBidPrices();
    if (prices.length === 0) return undefined;
    return this.bids.get(prices[0]);
  }

  public getBestAsk(): PriceLevel | undefined {
    const prices = this.getSortedAskPrices();
    if (prices.length === 0) return undefined;
    return this.asks.get(prices[0]);
  }

  /**
   * Add a Limit Order to the order book.
   */
  public addLimitOrder(order: Order): void {
    if (!order.price) throw new Error('Limit order must specify a price');
    const priceStr = new Decimal(order.price).toFixed(this.market.priceDecimals);
    const bookMap = order.side === OrderSide.BUY ? this.bids : this.asks;

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
    level.totalQuantity = new Decimal(level.totalQuantity).plus(order.remainingQuantity).toString();
    order.status = OrderStatus.OPEN;
  }

  /**
   * Remove or cancel an order from the book.
   */
  public cancelOrder(orderId: string, side: OrderSide, price: string): Order | undefined {
    const priceStr = new Decimal(price).toFixed(this.market.priceDecimals);
    const bookMap = side === OrderSide.BUY ? this.bids : this.asks;
    const level = bookMap.get(priceStr);
    if (!level) return undefined;

    const idx = level.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return undefined;

    const [order] = level.orders.splice(idx, 1);
    level.totalQuantity = new Decimal(level.totalQuantity).minus(order.remainingQuantity).toString();

    if (level.orders.length === 0) {
      bookMap.delete(priceStr);
    }

    order.status = OrderStatus.CANCELED;
    order.updatedAt = Date.now();
    return order;
  }

  /**
   * Process and match an incoming taker order against the opposing side of the order book.
   */
  public matchOrder(takerOrder: Order): MatchingResult {
    const executions: MatchExecution[] = [];
    const cancelledOrders: Order[] = [];
    const isBuy = takerOrder.side === OrderSide.BUY;

    let remainingTakerQty = new Decimal(takerOrder.remainingQuantity);
    const takerPrice = takerOrder.price ? new Decimal(takerOrder.price) : undefined;

    // FOK (Fill or Kill) Pre-check: Verify total liquidity is sufficient before executing
    if (takerOrder.timeInForce === TimeInForce.FOK) {
      let availableLiquidity = Decimal.ZERO;
      const sortedPrices = isBuy ? this.getSortedAskPrices() : this.getSortedBidPrices();

      for (const pStr of sortedPrices) {
        const p = new Decimal(pStr);
        if (isBuy && takerPrice && p.gt(takerPrice)) break;
        if (!isBuy && takerPrice && p.lt(takerPrice)) break;

        const level = (isBuy ? this.asks : this.bids).get(pStr)!;
        availableLiquidity = availableLiquidity.plus(level.totalQuantity);
        if (availableLiquidity.gte(remainingTakerQty)) break;
      }

      if (availableLiquidity.lt(remainingTakerQty)) {
        takerOrder.status = OrderStatus.REJECTED;
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
    if (takerOrder.timeInForce === TimeInForce.POST_ONLY && takerPrice) {
      const bestOpposite = isBuy ? this.getBestAsk() : this.getBestBid();
      if (bestOpposite) {
        const bestOppositePrice = new Decimal(bestOpposite.price);
        const wouldMatch = isBuy ? takerPrice.gte(bestOppositePrice) : takerPrice.lte(bestOppositePrice);
        if (wouldMatch) {
          takerOrder.status = OrderStatus.REJECTED;
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
      if (sortedPrices.length === 0) break;

      const bestPriceStr = sortedPrices[0];
      const bestPrice = new Decimal(bestPriceStr);

      // Check price limit condition
      if (isBuy && takerPrice && bestPrice.gt(takerPrice)) {
        break; // Best ask is higher than buyer's limit price
      }
      if (!isBuy && takerPrice && bestPrice.lt(takerPrice)) {
        break; // Best bid is lower than seller's limit price
      }

      const bookMap = isBuy ? this.asks : this.bids;
      const level = bookMap.get(bestPriceStr)!;

      while (level.orders.length > 0 && remainingTakerQty.isPositive()) {
        const makerOrder = level.orders[0];

        // Self-Trade Prevention (STP)
        if (makerOrder.userId === takerOrder.userId) {
          if (takerOrder.selfTradePrevention === SelfTradePrevention.CANCEL_MAKER) {
            level.orders.shift();
            level.totalQuantity = new Decimal(level.totalQuantity).minus(makerOrder.remainingQuantity).toString();
            makerOrder.status = OrderStatus.CANCELED;
            makerOrder.updatedAt = Date.now();
            cancelledOrders.push(makerOrder);
            continue;
          } else if (takerOrder.selfTradePrevention === SelfTradePrevention.CANCEL_TAKER) {
            takerOrder.status = OrderStatus.CANCELED;
            takerOrder.updatedAt = Date.now();
            cancelledOrders.push(takerOrder);
            remainingTakerQty = Decimal.ZERO;
            break;
          } else if (takerOrder.selfTradePrevention === SelfTradePrevention.CANCEL_BOTH) {
            level.orders.shift();
            level.totalQuantity = new Decimal(level.totalQuantity).minus(makerOrder.remainingQuantity).toString();
            makerOrder.status = OrderStatus.CANCELED;
            makerOrder.updatedAt = Date.now();
            cancelledOrders.push(makerOrder);

            takerOrder.status = OrderStatus.CANCELED;
            takerOrder.updatedAt = Date.now();
            cancelledOrders.push(takerOrder);
            remainingTakerQty = Decimal.ZERO;
            break;
          }
        }

        const makerRemaining = new Decimal(makerOrder.remainingQuantity);
        const matchQty = makerRemaining.lte(remainingTakerQty) ? makerRemaining : remainingTakerQty;
        const matchPrice = bestPriceStr;
        const quoteQty = matchQty.times(matchPrice).toFixed(this.market.priceDecimals);

        // Update Maker Order
        makerOrder.filledQuantity = new Decimal(makerOrder.filledQuantity).plus(matchQty).toString();
        makerOrder.remainingQuantity = new Decimal(makerOrder.remainingQuantity).minus(matchQty).toString();
        makerOrder.cumulativeQuoteQuantity = new Decimal(makerOrder.cumulativeQuoteQuantity).plus(quoteQty).toString();
        makerOrder.updatedAt = Date.now();

        // Update Taker Order
        takerOrder.filledQuantity = new Decimal(takerOrder.filledQuantity).plus(matchQty).toString();
        takerOrder.remainingQuantity = new Decimal(takerOrder.remainingQuantity).minus(matchQty).toString();
        takerOrder.cumulativeQuoteQuantity = new Decimal(takerOrder.cumulativeQuoteQuantity).plus(quoteQty).toString();
        takerOrder.updatedAt = Date.now();

        remainingTakerQty = remainingTakerQty.minus(matchQty);
        level.totalQuantity = new Decimal(level.totalQuantity).minus(matchQty).toString();

        if (new Decimal(makerOrder.remainingQuantity).isZero()) {
          makerOrder.status = OrderStatus.FILLED;
          level.orders.shift();
        } else {
          makerOrder.status = OrderStatus.PARTIALLY_FILLED;
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

    const isFullyFilled = new Decimal(takerOrder.remainingQuantity).isZero();
    if (isFullyFilled) {
      takerOrder.status = OrderStatus.FILLED;
    } else if (new Decimal(takerOrder.filledQuantity).isPositive()) {
      takerOrder.status = OrderStatus.PARTIALLY_FILLED;
    }

    // Handle IOC (Immediate-Or-Cancel) remainder cancellation
    if (takerOrder.timeInForce === TimeInForce.IOC && !isFullyFilled) {
      takerOrder.status = OrderStatus.CANCELED;
      cancelledOrders.push(takerOrder);
    }
    // Handle Unfilled Limit Orders (GTC / POST_ONLY) -> Rest on the Order Book
    else if (
      !isFullyFilled &&
      takerOrder.type === OrderType.LIMIT &&
      takerOrder.status !== OrderStatus.CANCELED
    ) {
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
  public getDepth(limit = 20): { bids: [string, string][]; asks: [string, string][]; timestamp: number } {
    const bids: [string, string][] = [];
    const asks: [string, string][] = [];

    const bidPrices = this.getSortedBidPrices().slice(0, limit);
    for (const p of bidPrices) {
      const level = this.bids.get(p)!;
      bids.push([level.price, level.totalQuantity]);
    }

    const askPrices = this.getSortedAskPrices().slice(0, limit);
    for (const p of askPrices) {
      const level = this.asks.get(p)!;
      asks.push([level.price, level.totalQuantity]);
    }

    return {
      bids,
      asks,
      timestamp: Date.now()
    };
  }
}
