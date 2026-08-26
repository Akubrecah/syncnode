import {
  Order,
  OrderSide,
  OrderType,
  MARKET_REGISTRY,
  Decimal,
  RiskCheckError,
  MarketHaltedError,
  Logger
} from '@syncnode/common';
import { db } from '@syncnode/database';
import { ledgerService } from '@syncnode/ledger';

export class RiskEngine {
  private readonly logger = new Logger('RiskEngine');
  private orderVelocityMap = new Map<string, number[]>(); // userId -> timestamps

  /**
   * Pre-Trade Risk Check.
   * Enforces circuit breakers, price bands, minimum/maximum notionals, and velocity caps.
   */
  public evaluateOrderRisk(order: Order, markPrice?: string): void {
    // 1. Circuit Breaker Checks
    if (db.circuitBreakers.isGlobalTradingHalted) {
      throw new RiskCheckError('Global trading is currently halted by exchange circuit breakers');
    }
    if (db.circuitBreakers.haltedMarkets[order.symbol]) {
      throw new MarketHaltedError(order.symbol);
    }

    // 2. User Account Status Checks
    const user = db.users.get(order.userId);
    if (user?.isSuspended) {
      throw new RiskCheckError('User account is currently suspended from trading');
    }

    // 3. Market Configuration Validation
    const market = MARKET_REGISTRY[order.symbol];
    if (!market || !market.isTradingEnabled) {
      throw new RiskCheckError(`Market ${order.symbol} is not active for trading`);
    }

    const qty = new Decimal(order.quantity);
    if (qty.lt(market.minQty)) {
      throw new RiskCheckError(`Order quantity ${order.quantity} is below minimum ${market.minQty}`);
    }
    if (qty.gt(market.maxQty)) {
      throw new RiskCheckError(`Order quantity ${order.quantity} exceeds maximum allowed ${market.maxQty}`);
    }

    // 4. Notional Value and Price Band Checks for Limit Orders
    if (order.type === OrderType.LIMIT) {
      if (!order.price) {
        throw new RiskCheckError('Limit order must contain a valid price');
      }
      const price = new Decimal(order.price);
      if (!price.isPositive()) {
        throw new RiskCheckError('Price must be greater than zero');
      }

      const notional = qty.times(price);
      if (notional.lt(market.minNotional)) {
        throw new RiskCheckError(`Order notional value ${notional.toString()} is below minimum ${market.minNotional}`);
      }

      // Price Collar Protection (+/- 10% from mark price to avoid fat-finger errs)
      if (markPrice) {
        const mark = new Decimal(markPrice);
        const bandRatio = new Decimal(market.priceBandPercent).dividedBy(100);
        const minAllowedPrice = mark.times(Decimal.ONE.minus(bandRatio));
        const maxAllowedPrice = mark.times(Decimal.ONE.plus(bandRatio));

        if (price.lt(minAllowedPrice) || price.gt(maxAllowedPrice)) {
          throw new RiskCheckError(
            `Order price ${order.price} exceeds allowable price collar [${minAllowedPrice.toFixed(market.priceDecimals)}, ${maxAllowedPrice.toFixed(market.priceDecimals)}] based on mark price ${markPrice}`
          );
        }
      }
    }

    // 5. Velocity Check (Max 30 orders per 5 seconds)
    const now = Date.now();
    const timestamps = this.orderVelocityMap.get(order.userId) || [];
    const recent = timestamps.filter((t) => now - t < 5000);
    if (recent.length >= 30) {
      throw new RiskCheckError('Order placement rate limit exceeded (maximum 30 orders / 5s)');
    }
    recent.push(now);
    this.orderVelocityMap.set(order.userId, recent);

    // 6. Pre-trade Balance Reservation Verification
    const balance = ledgerService.getUserAssetBalance(order.userId, order.lockedAsset);
    const required = new Decimal(order.lockedAmount);
    const available = new Decimal(balance.available);

    if (available.lt(required)) {
      throw new RiskCheckError(
        `Insufficient available ${order.lockedAsset} balance: required ${order.lockedAmount}, available ${balance.available}`
      );
    }
  }

  /**
   * Pre-Withdrawal Risk Check.
   */
  public evaluateWithdrawalRisk(userId: string, asset: string, amount: string): { riskScore: number; requiresManualReview: boolean } {
    if (db.circuitBreakers.isWithdrawalsPaused) {
      throw new RiskCheckError('Withdrawals are currently paused across the exchange');
    }

    const user = db.users.get(userId);
    if (user?.isSuspended || user?.isWithdrawalSuspended) {
      throw new RiskCheckError('Withdrawals are suspended for this account');
    }

    let riskScore = 10;
    const numAmt = new Decimal(amount).toNumber();

    // Larger transactions receive higher risk scoring for tiered manual compliance review
    if (asset === 'BTC' && numAmt >= 1.0) riskScore += 50;
    if (asset === 'ETH' && numAmt >= 10.0) riskScore += 50;
    if ((asset === 'USDT' || asset === 'USDC') && numAmt >= 10000) riskScore += 50;

    const requiresManualReview = riskScore >= 60;
    return { riskScore, requiresManualReview };
  }

  /**
   * Emergency Circuit Breaker Management.
   */
  public setGlobalTradingHalt(halt: boolean, adminUserId: string, reason?: string): void {
    db.circuitBreakers.isGlobalTradingHalted = halt;
    db.logAudit({
      actorId: adminUserId,
      actorType: 'ADMIN',
      action: halt ? 'EMERGENCY_GLOBAL_TRADING_HALT_TRIGGERED' : 'EMERGENCY_GLOBAL_TRADING_HALT_RESUMED',
      metadata: { isGlobalTradingHalted: halt, reason: reason || 'unspecified' }
    });
    this.logger.warn(`Global trading halt updated: ${halt} by admin ${adminUserId} (reason: ${reason || 'unspecified'})`);
  }

  public setMarketHalt(symbol: string, halt: boolean, adminUserId: string, reason?: string): void {
    db.circuitBreakers.haltedMarkets[symbol] = halt;
    db.logAudit({
      actorId: adminUserId,
      actorType: 'ADMIN',
      action: halt ? 'EMERGENCY_MARKET_HALT_TRIGGERED' : 'EMERGENCY_MARKET_HALT_RESUMED',
      metadata: { symbol, halted: halt, reason: reason || 'unspecified' }
    });
    this.logger.warn(`Market ${symbol} halt updated: ${halt} by admin ${adminUserId} (reason: ${reason || 'unspecified'})`);
  }

  public setWithdrawalPause(pause: boolean, adminUserId: string, reason?: string): void {
    db.circuitBreakers.isWithdrawalsPaused = pause;
    db.logAudit({
      actorId: adminUserId,
      actorType: 'ADMIN',
      action: pause ? 'EMERGENCY_WITHDRAWALS_PAUSED' : 'EMERGENCY_WITHDRAWALS_RESUMED',
      metadata: { isWithdrawalsPaused: pause, reason: reason || 'unspecified' }
    });
    this.logger.warn(`Withdrawals pause updated: ${pause} by admin ${adminUserId} (reason: ${reason || 'unspecified'})`);
  }

  public setDepositsPause(pause: boolean, adminUserId: string, reason?: string): void {
    db.circuitBreakers.isDepositsPaused = pause;
    db.logAudit({
      actorId: adminUserId,
      actorType: 'ADMIN',
      action: pause ? 'EMERGENCY_DEPOSITS_PAUSED' : 'EMERGENCY_DEPOSITS_RESUMED',
      metadata: { isDepositsPaused: pause, reason: reason || 'unspecified' }
    });
    this.logger.warn(`Deposits pause updated: ${pause} by admin ${adminUserId} (reason: ${reason || 'unspecified'})`);
  }

  public setEmergencyMaintenance(enabled: boolean, adminUserId: string, reason?: string): void {
    db.circuitBreakers.emergencyMaintenance = enabled;
    db.logAudit({
      actorId: adminUserId,
      actorType: 'ADMIN',
      action: enabled ? 'EMERGENCY_MAINTENANCE_ENABLED' : 'EMERGENCY_MAINTENANCE_DISABLED',
      metadata: { emergencyMaintenance: enabled, reason: reason || 'unspecified' }
    });
    this.logger.warn(`Emergency maintenance mode updated: ${enabled} by admin ${adminUserId} (reason: ${reason || 'unspecified'})`);
  }
}

export const riskEngine = new RiskEngine();
