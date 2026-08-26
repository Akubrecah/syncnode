"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskEngine = exports.RiskEngine = void 0;
const common_1 = require("@syncnode/common");
const database_1 = require("@syncnode/database");
const ledger_1 = require("@syncnode/ledger");
class RiskEngine {
    logger = new common_1.Logger('RiskEngine');
    orderVelocityMap = new Map(); // userId -> timestamps
    /**
     * Pre-Trade Risk Check.
     * Enforces circuit breakers, price bands, minimum/maximum notionals, and velocity caps.
     */
    evaluateOrderRisk(order, markPrice) {
        // 1. Circuit Breaker Checks
        if (database_1.db.circuitBreakers.isGlobalTradingHalted) {
            throw new common_1.RiskCheckError('Global trading is currently halted by exchange circuit breakers');
        }
        if (database_1.db.circuitBreakers.haltedMarkets[order.symbol]) {
            throw new common_1.MarketHaltedError(order.symbol);
        }
        // 2. User Account Status Checks
        const user = database_1.db.users.get(order.userId);
        if (user?.isSuspended) {
            throw new common_1.RiskCheckError('User account is currently suspended from trading');
        }
        // 3. Market Configuration Validation
        const market = common_1.MARKET_REGISTRY[order.symbol];
        if (!market || !market.isTradingEnabled) {
            throw new common_1.RiskCheckError(`Market ${order.symbol} is not active for trading`);
        }
        const qty = new common_1.Decimal(order.quantity);
        if (qty.lt(market.minQty)) {
            throw new common_1.RiskCheckError(`Order quantity ${order.quantity} is below minimum ${market.minQty}`);
        }
        if (qty.gt(market.maxQty)) {
            throw new common_1.RiskCheckError(`Order quantity ${order.quantity} exceeds maximum allowed ${market.maxQty}`);
        }
        // 4. Notional Value and Price Band Checks for Limit Orders
        if (order.type === common_1.OrderType.LIMIT) {
            if (!order.price) {
                throw new common_1.RiskCheckError('Limit order must contain a valid price');
            }
            const price = new common_1.Decimal(order.price);
            if (!price.isPositive()) {
                throw new common_1.RiskCheckError('Price must be greater than zero');
            }
            const notional = qty.times(price);
            if (notional.lt(market.minNotional)) {
                throw new common_1.RiskCheckError(`Order notional value ${notional.toString()} is below minimum ${market.minNotional}`);
            }
            // Price Collar Protection (+/- 10% from mark price to avoid fat-finger errs)
            if (markPrice) {
                const mark = new common_1.Decimal(markPrice);
                const bandRatio = new common_1.Decimal(market.priceBandPercent).dividedBy(100);
                const minAllowedPrice = mark.times(common_1.Decimal.ONE.minus(bandRatio));
                const maxAllowedPrice = mark.times(common_1.Decimal.ONE.plus(bandRatio));
                if (price.lt(minAllowedPrice) || price.gt(maxAllowedPrice)) {
                    throw new common_1.RiskCheckError(`Order price ${order.price} exceeds allowable price collar [${minAllowedPrice.toFixed(market.priceDecimals)}, ${maxAllowedPrice.toFixed(market.priceDecimals)}] based on mark price ${markPrice}`);
                }
            }
        }
        // 5. Velocity Check (Max 30 orders per 5 seconds)
        const now = Date.now();
        const timestamps = this.orderVelocityMap.get(order.userId) || [];
        const recent = timestamps.filter((t) => now - t < 5000);
        if (recent.length >= 30) {
            throw new common_1.RiskCheckError('Order placement rate limit exceeded (maximum 30 orders / 5s)');
        }
        recent.push(now);
        this.orderVelocityMap.set(order.userId, recent);
        // 6. Pre-trade Balance Reservation Verification
        const balance = ledger_1.ledgerService.getUserAssetBalance(order.userId, order.lockedAsset);
        const required = new common_1.Decimal(order.lockedAmount);
        const available = new common_1.Decimal(balance.available);
        if (available.lt(required)) {
            throw new common_1.RiskCheckError(`Insufficient available ${order.lockedAsset} balance: required ${order.lockedAmount}, available ${balance.available}`);
        }
    }
    /**
     * Pre-Withdrawal Risk Check.
     */
    evaluateWithdrawalRisk(userId, asset, amount) {
        if (database_1.db.circuitBreakers.isWithdrawalsPaused) {
            throw new common_1.RiskCheckError('Withdrawals are currently paused across the exchange');
        }
        const user = database_1.db.users.get(userId);
        if (user?.isSuspended || user?.isWithdrawalSuspended) {
            throw new common_1.RiskCheckError('Withdrawals are suspended for this account');
        }
        let riskScore = 10;
        const numAmt = new common_1.Decimal(amount).toNumber();
        // Larger transactions receive higher risk scoring for tiered manual compliance review
        if (asset === 'BTC' && numAmt >= 1.0)
            riskScore += 50;
        if (asset === 'ETH' && numAmt >= 10.0)
            riskScore += 50;
        if ((asset === 'USDT' || asset === 'USDC') && numAmt >= 10000)
            riskScore += 50;
        const requiresManualReview = riskScore >= 60;
        return { riskScore, requiresManualReview };
    }
    /**
     * Emergency Circuit Breaker Management.
     */
    setGlobalTradingHalt(halt, adminUserId) {
        database_1.db.circuitBreakers.isGlobalTradingHalted = halt;
        database_1.db.logAudit({
            actorId: adminUserId,
            actorType: 'ADMIN',
            action: halt ? 'EMERGENCY_GLOBAL_TRADING_HALT_TRIGGERED' : 'EMERGENCY_GLOBAL_TRADING_HALT_RESUMED',
            metadata: { isGlobalTradingHalted: halt }
        });
        this.logger.warn(`Global trading halt updated: ${halt} by admin ${adminUserId}`);
    }
    setMarketHalt(symbol, halt, adminUserId) {
        database_1.db.circuitBreakers.haltedMarkets[symbol] = halt;
        database_1.db.logAudit({
            actorId: adminUserId,
            actorType: 'ADMIN',
            action: halt ? 'EMERGENCY_MARKET_HALT_TRIGGERED' : 'EMERGENCY_MARKET_HALT_RESUMED',
            metadata: { symbol, halted: halt }
        });
        this.logger.warn(`Market ${symbol} halt updated: ${halt} by admin ${adminUserId}`);
    }
    setWithdrawalPause(pause, adminUserId) {
        database_1.db.circuitBreakers.isWithdrawalsPaused = pause;
        database_1.db.logAudit({
            actorId: adminUserId,
            actorType: 'ADMIN',
            action: pause ? 'EMERGENCY_WITHDRAWALS_PAUSED' : 'EMERGENCY_WITHDRAWALS_RESUMED',
            metadata: { isWithdrawalsPaused: pause }
        });
        this.logger.warn(`Withdrawals pause updated: ${pause} by admin ${adminUserId}`);
    }
}
exports.RiskEngine = RiskEngine;
exports.riskEngine = new RiskEngine();
//# sourceMappingURL=risk.js.map