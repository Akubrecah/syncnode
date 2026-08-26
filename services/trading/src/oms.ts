import {
  Order,
  Trade,
  OrderSide,
  OrderType,
  TimeInForce,
  OrderStatus,
  SelfTradePrevention,
  AssetSymbol,
  AccountType,
  TransactionType,
  EntryDirection,
  MARKET_REGISTRY,
  Decimal,
  Logger
} from '@syncnode/common';
import { db } from '@syncnode/database';
import { ledgerService } from '@syncnode/ledger';
import { matchingEngine, MatchExecution } from '@syncnode/matching-engine';
import { riskEngine } from '@syncnode/risk';

export interface CreateOrderParams {
  userId: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  timeInForce?: TimeInForce;
  price?: string;
  stopPrice?: string;
  quantity: string;
  selfTradePrevention?: SelfTradePrevention;
}

export class OrderManagementService {
  private readonly logger = new Logger('OrderManagementService');

  /**
   * Submit an order through full lifecycle: Validation -> Balance Reservation -> Risk Checks -> Matching -> Ledger Settlement.
   */
  public submitOrder(params: CreateOrderParams): { order: Order; trades: Trade[] } {
    const market = MARKET_REGISTRY[params.symbol];
    if (!market) {
      throw new Error(`Invalid trading pair: ${params.symbol}`);
    }

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timeInForce = params.timeInForce || TimeInForce.GTC;
    const stp = params.selfTradePrevention || SelfTradePrevention.CANCEL_MAKER;

    // Calculate required lock amount
    const isBuy = params.side === OrderSide.BUY;
    const lockedAsset = isBuy ? market.quoteAsset : market.baseAsset;
    let lockedAmount: string;

    if (isBuy) {
      if (params.type === OrderType.LIMIT) {
        if (!params.price) throw new Error('Limit buy order must specify price');
        lockedAmount = new Decimal(params.quantity).times(params.price).toFixed(market.priceDecimals);
      } else {
        // Market Buy: Estimate lock based on best ask price or mark price
        const bestAsk = matchingEngine.getOrderBook(params.symbol).getBestAsk();
        if (!bestAsk) throw new Error('Cannot place market buy on empty ask order book');
        // Add 1% slippage buffer for market order reservation
        lockedAmount = new Decimal(params.quantity).times(bestAsk.price).times(1.01).toFixed(market.priceDecimals);
      }
    } else {
      // Sell Order: Locks the Base Asset quantity
      lockedAmount = new Decimal(params.quantity).toFixed(market.qtyDecimals);
    }

    const order: Order = {
      id: orderId,
      clientOrderId: params.clientOrderId,
      userId: params.userId,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      timeInForce,
      price: params.price ? new Decimal(params.price).toFixed(market.priceDecimals) : undefined,
      stopPrice: params.stopPrice ? new Decimal(params.stopPrice).toFixed(market.priceDecimals) : undefined,
      quantity: new Decimal(params.quantity).toFixed(market.qtyDecimals),
      filledQuantity: '0',
      remainingQuantity: new Decimal(params.quantity).toFixed(market.qtyDecimals),
      cumulativeQuoteQuantity: '0',
      status: OrderStatus.NEW,
      selfTradePrevention: stp,
      lockedAmount,
      lockedAsset,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 1. Pre-Trade Risk Checks
    const bestBid = matchingEngine.getOrderBook(params.symbol).getBestBid();
    const markPrice = bestBid ? bestBid.price : (params.price || undefined);
    riskEngine.evaluateOrderRisk(order, markPrice);

    // 2. Lock User Balances in Ledger
    ledgerService.recordTransaction(
      TransactionType.ORDER_LOCK,
      order.id,
      `lock_${order.id}`,
      `Lock ${lockedAmount} ${lockedAsset} for order ${order.id}`,
      [
        {
          userId: order.userId,
          accountType: AccountType.USER_AVAILABLE,
          asset: lockedAsset,
          direction: EntryDirection.DEBIT,
          amount: lockedAmount
        },
        {
          userId: order.userId,
          accountType: AccountType.USER_LOCKED,
          asset: lockedAsset,
          direction: EntryDirection.CREDIT,
          amount: lockedAmount
        }
      ]
    );

    order.status = OrderStatus.OPEN;
    db.orders.set(order.id, order);

    // 3. Dispatch to Matching Engine
    const matchResult = matchingEngine.processOrder(order);
    const trades: Trade[] = [];

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
    if ((order.status as OrderStatus) === OrderStatus.FILLED && isBuy && order.type === OrderType.LIMIT) {
      const actualQuoteSpent = new Decimal(order.cumulativeQuoteQuantity);
      const totalLocked = new Decimal(order.lockedAmount);
      const refund = totalLocked.minus(actualQuoteSpent);

      if (refund.isPositive()) {
        ledgerService.recordTransaction(
          TransactionType.ORDER_UNLOCK,
          order.id,
          `refund_${order.id}`,
          `Refund price improvement excess lock ${refund.toString()} ${market.quoteAsset}`,
          [
            {
              userId: order.userId,
              accountType: AccountType.USER_LOCKED,
              asset: market.quoteAsset,
              direction: EntryDirection.DEBIT,
              amount: refund.toString()
            },
            {
              userId: order.userId,
              accountType: AccountType.USER_AVAILABLE,
              asset: market.quoteAsset,
              direction: EntryDirection.CREDIT,
              amount: refund.toString()
            }
          ]
        );
      }
    }

    db.emitEvent('order.updated', { order, trades });
    return { order, trades };
  }

  /**
   * Settle a single trade fill atomically across buyer, seller, and fee accounts.
   */
  private settleTradeExecution(exec: MatchExecution, market: any): Trade {
    const tradeId = `trd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const isBuyerTaker = exec.takerOrder.side === OrderSide.BUY;
    const buyerOrder = isBuyerTaker ? exec.takerOrder : exec.makerOrder;
    const sellerOrder = isBuyerTaker ? exec.makerOrder : exec.takerOrder;

    const baseAsset = market.baseAsset;
    const quoteAsset = market.quoteAsset;

    const tradeQty = exec.tradeQuantity;
    const quoteQty = exec.quoteQuantity;

    // Fee calculation: Buyer pays fee in Base Asset (or Quote), Seller pays fee in Quote Asset
    const buyerFeeRate = isBuyerTaker ? market.takerFeeRate : market.makerFeeRate;
    const sellerFeeRate = isBuyerTaker ? market.makerFeeRate : market.takerFeeRate;

    const buyerFee = new Decimal(tradeQty).times(buyerFeeRate).toFixed(market.qtyDecimals);
    const sellerFee = new Decimal(quoteQty).times(sellerFeeRate).toFixed(market.priceDecimals);

    const netBaseToBuyer = new Decimal(tradeQty).minus(buyerFee).toFixed(market.qtyDecimals);
    const netQuoteToSeller = new Decimal(quoteQty).minus(sellerFee).toFixed(market.priceDecimals);

    // Atomic Double-Entry Settlement
    ledgerService.recordTransaction(
      TransactionType.TRADE_SETTLEMENT,
      tradeId,
      `settle_${tradeId}`,
      `Settle trade ${tradeId} ${market.symbol} qty=${tradeQty} @ price=${exec.tradePrice}`,
      [
        // 1. Base Asset Settlement (Seller Locked -> Buyer Available & Exchange Fee)
        {
          userId: sellerOrder.userId,
          accountType: AccountType.USER_LOCKED,
          asset: baseAsset,
          direction: EntryDirection.DEBIT,
          amount: tradeQty
        },
        {
          userId: buyerOrder.userId,
          accountType: AccountType.USER_AVAILABLE,
          asset: baseAsset,
          direction: EntryDirection.CREDIT,
          amount: netBaseToBuyer
        },
        {
          accountType: AccountType.TRADING_FEES,
          asset: baseAsset,
          direction: EntryDirection.CREDIT,
          amount: buyerFee
        },

        // 2. Quote Asset Settlement (Buyer Locked -> Seller Available & Exchange Fee)
        {
          userId: buyerOrder.userId,
          accountType: AccountType.USER_LOCKED,
          asset: quoteAsset,
          direction: EntryDirection.DEBIT,
          amount: quoteQty
        },
        {
          userId: sellerOrder.userId,
          accountType: AccountType.USER_AVAILABLE,
          asset: quoteAsset,
          direction: EntryDirection.CREDIT,
          amount: netQuoteToSeller
        },
        {
          accountType: AccountType.TRADING_FEES,
          asset: quoteAsset,
          direction: EntryDirection.CREDIT,
          amount: sellerFee
        }
      ]
    );

    const trade: Trade = {
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

    db.trades.set(trade.id, trade);
    return trade;
  }

  /**
   * Unlock remaining unexecuted balance when an order is cancelled.
   */
  public cancelOrder(orderId: string, userId: string): Order {
    const order = db.orders.get(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    if (order.userId !== userId) throw new Error('Unauthorized to cancel this order');

    if ([OrderStatus.FILLED, OrderStatus.CANCELED, OrderStatus.REJECTED].includes(order.status)) {
      throw new Error(`Cannot cancel order in status ${order.status}`);
    }

    matchingEngine.cancelOrder(order);
    order.status = OrderStatus.CANCELED;
    order.updatedAt = Date.now();

    const market = MARKET_REGISTRY[order.symbol];
    this.unlockRemainingOrderBalance(order, market);

    db.emitEvent('order.cancelled', { orderId: order.id });
    return order;
  }

  private unlockRemainingOrderBalance(order: Order, market: any): void {
    const isBuy = order.side === OrderSide.BUY;
    const remainingQty = new Decimal(order.remainingQuantity);

    if (remainingQty.isZero()) return;

    let unlockAmount: string;
    if (isBuy) {
      if (!order.price) return;
      unlockAmount = remainingQty.times(order.price).toFixed(market.priceDecimals);
    } else {
      unlockAmount = remainingQty.toFixed(market.qtyDecimals);
    }

    if (new Decimal(unlockAmount).isPositive()) {
      ledgerService.recordTransaction(
        TransactionType.ORDER_UNLOCK,
        order.id,
        `unlock_cancel_${order.id}_${Date.now()}`,
        `Unlock ${unlockAmount} ${order.lockedAsset} on cancel of order ${order.id}`,
        [
          {
            userId: order.userId,
            accountType: AccountType.USER_LOCKED,
            asset: order.lockedAsset,
            direction: EntryDirection.DEBIT,
            amount: unlockAmount
          },
          {
            userId: order.userId,
            accountType: AccountType.USER_AVAILABLE,
            asset: order.lockedAsset,
            direction: EntryDirection.CREDIT,
            amount: unlockAmount
          }
        ]
      );
    }
  }

  public getOrdersByUser(userId: string, symbol?: string, openOnly = false): Order[] {
    return Array.from(db.orders.values()).filter((o) => {
      if (o.userId !== userId) return false;
      if (symbol && o.symbol !== symbol) return false;
      if (openOnly && ![OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED].includes(o.status)) return false;
      return true;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getTradesForUser(userId: string, symbol?: string): Trade[] {
    return Array.from(db.trades.values()).filter((t) => {
      if (t.buyerUserId !== userId && t.sellerUserId !== userId) return false;
      if (symbol && t.symbol !== symbol) return false;
      return true;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }

  public cancelAllOrders(userId: string, symbol?: string): Order[] {
    const openOrders = this.getOrdersByUser(userId, symbol, true);
    const cancelled: Order[] = [];
    for (const order of openOrders) {
      try {
        const c = this.cancelOrder(order.id, userId);
        cancelled.push(c);
      } catch (e: any) {
        this.logger.warn(`Failed to cancel order ${order.id} during cancelAll for user ${userId}`, {
          orderId: order.id,
          userId,
          symbol,
          error: e?.message || String(e)
        });
      }
    }
    return cancelled;
  }
}

export const orderManagementService = new OrderManagementService();
