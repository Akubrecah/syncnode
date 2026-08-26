export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly details?: Record<string, any>;
    constructor(message: string, statusCode?: number, code?: string, details?: Record<string, any>);
}
export declare class FinancialInvariantError extends AppError {
    constructor(message: string, details?: Record<string, any>);
}
export declare class InsufficientBalanceError extends AppError {
    constructor(asset: string, required: string, available: string);
}
export declare class RiskCheckError extends AppError {
    constructor(reason: string, details?: Record<string, any>);
}
export declare class MarketHaltedError extends AppError {
    constructor(symbol: string);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
export declare class RateLimitError extends AppError {
    constructor(retryAfterSeconds?: number);
}
export declare class NotFoundError extends AppError {
    constructor(resource: string, id: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string, details?: Record<string, any>);
}
