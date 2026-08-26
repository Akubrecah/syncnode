import { Order } from '@syncnode/common';
export declare class RiskEngine {
    private readonly logger;
    private orderVelocityMap;
    /**
     * Pre-Trade Risk Check.
     * Enforces circuit breakers, price bands, minimum/maximum notionals, and velocity caps.
     */
    evaluateOrderRisk(order: Order, markPrice?: string): void;
    /**
     * Pre-Withdrawal Risk Check.
     */
    evaluateWithdrawalRisk(userId: string, asset: string, amount: string): {
        riskScore: number;
        requiresManualReview: boolean;
    };
    /**
     * Emergency Circuit Breaker Management.
     */
    setGlobalTradingHalt(halt: boolean, adminUserId: string): void;
    setMarketHalt(symbol: string, halt: boolean, adminUserId: string): void;
    setWithdrawalPause(pause: boolean, adminUserId: string): void;
}
export declare const riskEngine: RiskEngine;
