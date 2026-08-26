import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  Order,
  OrderSide,
  OrderType,
  TimeInForce,
  OrderStatus,
  SelfTradePrevention,
  AssetSymbol,
  MARKET_REGISTRY,
  Decimal
} from '@syncnode/common';
import { OrderBook } from '../../services/matching-engine/src/orderbook.js';

describe('Deterministic Matching Engine & LOB Verification', () => {
  let orderBook: OrderBook;

  beforeEach(() => {
    orderBook = new OrderBook(MARKET_REGISTRY['BTC/USDT']);
  });

  it('should match orders according to deterministic Price-Time priority', () => {
    // 1. Add Maker Sell Orders
    const sell1: Order = {
      id: 'ord_sell_1',
      userId: 'seller_1',
      symbol: 'BTC/USDT',
      side: OrderSide.SELL,
      type: OrderType.LIMIT,
      timeInForce: TimeInForce.GTC,
      price: '94000.00',
      quantity: '1.000000',
      filledQuantity: '0',
      remainingQuantity: '1.000000',
      cumulativeQuoteQuantity: '0',
      status: OrderStatus.OPEN,
      selfTradePrevention: SelfTradePrevention.CANCEL_MAKER,
      lockedAmount: '1.000000',
      lockedAsset: AssetSymbol.BTC,
      createdAt: 1000,
      updatedAt: 1000
    };

    const sell2: Order = {
      id: 'ord_sell_2',
      userId: 'seller_2',
      symbol: 'BTC/USDT',
      side: OrderSide.SELL,
      type: OrderType.LIMIT,
      timeInForce: TimeInForce.GTC,
      price: '94000.00', // Same price, submitted later (time priority test)
      quantity: '1.500000',
      filledQuantity: '0',
      remainingQuantity: '1.500000',
      cumulativeQuoteQuantity: '0',
      status: OrderStatus.OPEN,
      selfTradePrevention: SelfTradePrevention.CANCEL_MAKER,
      lockedAmount: '1.500000',
      lockedAsset: AssetSymbol.BTC,
      createdAt: 2000,
      updatedAt: 2000
    };

    orderBook.addLimitOrder(sell1);
    orderBook.addLimitOrder(sell2);

    // 2. Incoming Taker Buy Order matching first seller completely and second seller partially
    const buyTaker: Order = {
      id: 'ord_buy_taker',
      userId: 'buyer_1',
      symbol: 'BTC/USDT',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      timeInForce: TimeInForce.GTC,
      price: '94000.00',
      quantity: '1.800000',
      filledQuantity: '0',
      remainingQuantity: '1.800000',
      cumulativeQuoteQuantity: '0',
      status: OrderStatus.NEW,
      selfTradePrevention: SelfTradePrevention.CANCEL_MAKER,
      lockedAmount: '169200.00',
      lockedAsset: AssetSymbol.USDT,
      createdAt: 3000,
      updatedAt: 3000
    };

    const result = orderBook.matchOrder(buyTaker);

    assert.equal(result.executions.length, 2);
    // First fill with seller_1 (1.0 BTC)
    assert.equal(result.executions[0].makerOrder.id, 'ord_sell_1');
    assert.ok(Decimal.from(result.executions[0].tradeQuantity).eq('1.000000'));
    assert.equal(sell1.status, OrderStatus.FILLED);

    // Second fill with seller_2 (0.8 BTC)
    assert.equal(result.executions[1].makerOrder.id, 'ord_sell_2');
    assert.ok(Decimal.from(result.executions[1].tradeQuantity).eq('0.800000'));
    assert.equal(sell2.status, OrderStatus.PARTIALLY_FILLED);
    assert.ok(Decimal.from(sell2.remainingQuantity).eq('0.700000'));

    // Taker is fully filled
    assert.equal(result.isFullyFilled, true);
    assert.equal(buyTaker.status, OrderStatus.FILLED);
  });

  it('should enforce Post-Only order cancellation when crossing existing book', () => {
    // Resting ask at 94,000
    const sell: Order = {
      id: 'ord_sell_rest',
      userId: 'seller_1',
      symbol: 'BTC/USDT',
      side: OrderSide.SELL,
      type: OrderType.LIMIT,
      timeInForce: TimeInForce.GTC,
      price: '94000.00',
      quantity: '1.000000',
      filledQuantity: '0',
      remainingQuantity: '1.000000',
      cumulativeQuoteQuantity: '0',
      status: OrderStatus.OPEN,
      selfTradePrevention: SelfTradePrevention.CANCEL_MAKER,
      lockedAmount: '1.000000',
      lockedAsset: AssetSymbol.BTC,
      createdAt: 1000,
      updatedAt: 1000
    };
    orderBook.addLimitOrder(sell);

    // Incoming Post-Only Buy at 94,000 (would execute immediately as taker)
    const postOnlyBuy: Order = {
      id: 'ord_post_only_cross',
      userId: 'buyer_1',
      symbol: 'BTC/USDT',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      timeInForce: TimeInForce.POST_ONLY,
      price: '94000.00',
      quantity: '0.500000',
      filledQuantity: '0',
      remainingQuantity: '0.500000',
      cumulativeQuoteQuantity: '0',
      status: OrderStatus.NEW,
      selfTradePrevention: SelfTradePrevention.CANCEL_MAKER,
      lockedAmount: '47000.00',
      lockedAsset: AssetSymbol.USDT,
      createdAt: 2000,
      updatedAt: 2000
    };

    const result = orderBook.matchOrder(postOnlyBuy);
    assert.equal(result.executions.length, 0);
    assert.equal(postOnlyBuy.status, OrderStatus.REJECTED);
  });

  it('should enforce Self-Trade Prevention (STP) CANCEL_MAKER', () => {
    const restingOrder: Order = {
      id: 'ord_user1_sell',
      userId: 'same_user_123',
      symbol: 'BTC/USDT',
      side: OrderSide.SELL,
      type: OrderType.LIMIT,
      timeInForce: TimeInForce.GTC,
      price: '94000.00',
      quantity: '1.000000',
      filledQuantity: '0',
      remainingQuantity: '1.000000',
      cumulativeQuoteQuantity: '0',
      status: OrderStatus.OPEN,
      selfTradePrevention: SelfTradePrevention.CANCEL_MAKER,
      lockedAmount: '1.000000',
      lockedAsset: AssetSymbol.BTC,
      createdAt: 1000,
      updatedAt: 1000
    };
    orderBook.addLimitOrder(restingOrder);

    const incomingOrder: Order = {
      id: 'ord_user1_buy',
      userId: 'same_user_123', // Same user!
      symbol: 'BTC/USDT',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      timeInForce: TimeInForce.GTC,
      price: '94000.00',
      quantity: '1.000000',
      filledQuantity: '0',
      remainingQuantity: '1.000000',
      cumulativeQuoteQuantity: '0',
      status: OrderStatus.NEW,
      selfTradePrevention: SelfTradePrevention.CANCEL_MAKER,
      lockedAmount: '94000.00',
      lockedAsset: AssetSymbol.USDT,
      createdAt: 2000,
      updatedAt: 2000
    };

    const result = orderBook.matchOrder(incomingOrder);
    assert.equal(result.executions.length, 0, 'No self-trade executed');
    assert.equal(result.cancelledOrders.length, 1);
    assert.equal(result.cancelledOrders[0].id, 'ord_user1_sell');
    assert.equal(restingOrder.status, OrderStatus.CANCELED);
  });
});
