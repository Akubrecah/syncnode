import { Order, Trade, OrderSide, OrderType, TimeInForce, SelfTradePrevention } from '@syncnode/common';
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
export declare class OrderManagementService {
    private readonly logger;
    /**
     * Submit an order through full lifecycle: Validation -> Balance Reservation -> Risk Checks -> Matching -> Ledger Settlement.
     */
    submitOrder(params: CreateOrderParams): {
        order: Order;
        trades: Trade[];
    };
    /**
     * Settle a single trade fill atomically across buyer, seller, and fee accounts.
     */
    private settleTradeExecution;
    /**
     * Unlock remaining unexecuted balance when an order is cancelled.
     */
    cancelOrder(orderId: string, userId: string): Order;
    private unlockRemainingOrderBalance;
    getOrdersByUser(userId: string, symbol?: string, openOnly?: boolean): Order[];
    getTradesForUser(userId: string, symbol?: string): Trade[];
    cancelAllOrders(userId: string, symbol?: string): Order[];
}
export declare const orderManagementService: OrderManagementService;
