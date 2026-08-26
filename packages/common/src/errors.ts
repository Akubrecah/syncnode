export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class FinancialInvariantError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(`CRITICAL FINANCIAL INVARIANT VIOLATION: ${message}`, 500, 'FINANCIAL_INVARIANT_VIOLATION', details);
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(asset: string, required: string, available: string) {
    super(`Insufficient ${asset} balance: required ${required}, available ${available}`, 400, 'INSUFFICIENT_BALANCE', {
      asset,
      required,
      available
    });
  }
}

export class RiskCheckError extends AppError {
  constructor(reason: string, details?: Record<string, any>) {
    super(`Risk check rejected: ${reason}`, 403, 'RISK_CHECK_REJECTED', details);
  }
}

export class MarketHaltedError extends AppError {
  constructor(symbol: string) {
    super(`Trading in market ${symbol} is currently halted by circuit breakers`, 503, 'MARKET_HALTED', { symbol });
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Invalid authentication credentials') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions for this operation') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds = 60) {
    super(`Rate limit exceeded. Retry after ${retryAfterSeconds}s`, 429, 'RATE_LIMIT_EXCEEDED', {
      retryAfterSeconds
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with ID ${id} not found`, 404, 'NOT_FOUND', { resource, id });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 409, 'CONFLICT', details);
  }
}
