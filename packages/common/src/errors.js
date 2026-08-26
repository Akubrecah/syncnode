"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.NotFoundError = exports.RateLimitError = exports.AuthorizationError = exports.AuthenticationError = exports.MarketHaltedError = exports.RiskCheckError = exports.InsufficientBalanceError = exports.FinancialInvariantError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode = 400, code = 'BAD_REQUEST', details) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class FinancialInvariantError extends AppError {
    constructor(message, details) {
        super(`CRITICAL FINANCIAL INVARIANT VIOLATION: ${message}`, 500, 'FINANCIAL_INVARIANT_VIOLATION', details);
    }
}
exports.FinancialInvariantError = FinancialInvariantError;
class InsufficientBalanceError extends AppError {
    constructor(asset, required, available) {
        super(`Insufficient ${asset} balance: required ${required}, available ${available}`, 400, 'INSUFFICIENT_BALANCE', {
            asset,
            required,
            available
        });
    }
}
exports.InsufficientBalanceError = InsufficientBalanceError;
class RiskCheckError extends AppError {
    constructor(reason, details) {
        super(`Risk check rejected: ${reason}`, 403, 'RISK_CHECK_REJECTED', details);
    }
}
exports.RiskCheckError = RiskCheckError;
class MarketHaltedError extends AppError {
    constructor(symbol) {
        super(`Trading in market ${symbol} is currently halted by circuit breakers`, 503, 'MARKET_HALTED', { symbol });
    }
}
exports.MarketHaltedError = MarketHaltedError;
class AuthenticationError extends AppError {
    constructor(message = 'Invalid authentication credentials') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions for this operation') {
        super(message, 403, 'FORBIDDEN');
    }
}
exports.AuthorizationError = AuthorizationError;
class RateLimitError extends AppError {
    constructor(retryAfterSeconds = 60) {
        super(`Rate limit exceeded. Retry after ${retryAfterSeconds}s`, 429, 'RATE_LIMIT_EXCEEDED', {
            retryAfterSeconds
        });
    }
}
exports.RateLimitError = RateLimitError;
class NotFoundError extends AppError {
    constructor(resource, id) {
        super(`${resource} with ID ${id} not found`, 404, 'NOT_FOUND', { resource, id });
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message, details) {
        super(message, 409, 'CONFLICT', details);
    }
}
exports.ConflictError = ConflictError;
//# sourceMappingURL=errors.js.map