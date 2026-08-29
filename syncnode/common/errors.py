class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str = "APP_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code

    def to_dict(self):
        return {
            "success": False,
            "error": self.message,
            "code": self.code
        }


class FinancialInvariantError(AppError):
    def __init__(self, message: str):
        super().__init__(message, status_code=500, code="FINANCIAL_INVARIANT_VIOLATION")


class InsufficientFundsError(AppError):
    def __init__(self, message: str = "Insufficient available balance"):
        super().__init__(message, status_code=400, code="INSUFFICIENT_FUNDS")


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=401, code="UNAUTHORIZED")


class ForbiddenError(AppError):
    def __init__(self, message: str = "Forbidden action"):
        super().__init__(message, status_code=403, code="FORBIDDEN")


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404, code="NOT_FOUND")


class ValidationError(AppError):
    def __init__(self, message: str):
        super().__init__(message, status_code=422, code="VALIDATION_ERROR")


class MarketHaltedError(AppError):
    def __init__(self, market: str):
        super().__init__(f"Trading on market {market} is currently halted by circuit breaker", status_code=503, code="MARKET_HALTED")


class TooManyRequestsError(AppError):
    def __init__(self, message: str = "Rate limit exceeded. Please try again later."):
        super().__init__(message, status_code=429, code="TOO_MANY_REQUESTS")
