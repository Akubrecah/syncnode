from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class AssetSymbol(str, Enum):
    BTC = "BTC"
    ETH = "ETH"
    SOL = "SOL"
    USDT = "USDT"
    USD = "USD"
    EUR = "EUR"


class AccountType(str, Enum):
    USER_AVAILABLE = "USER_AVAILABLE"
    USER_LOCKED = "USER_LOCKED"
    EXCHANGE_VAULT = "EXCHANGE_VAULT"
    FEE_INCOME = "FEE_INCOME"
    P2P_ESCROW = "P2P_ESCROW"


class OrderSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class OrderType(str, Enum):
    LIMIT = "LIMIT"
    MARKET = "MARKET"
    POST_ONLY = "POST_ONLY"


class TimeInForce(str, Enum):
    GTC = "GTC"
    IOC = "IOC"
    FOK = "FOK"


class OrderStatus(str, Enum):
    NEW = "NEW"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"


class SelfTradePrevention(str, Enum):
    NONE = "NONE"
    CANCEL_MAKER = "CANCEL_MAKER"
    CANCEL_TAKER = "CANCEL_TAKER"


class KycTier(str, Enum):
    TIER_0_UNVERIFIED = "TIER_0_UNVERIFIED"
    TIER_1_BASIC = "TIER_1_BASIC"
    TIER_2_PRO = "TIER_2_PRO"
    TIER_3_INSTITUTIONAL = "TIER_3_INSTITUTIONAL"


class KycStatus(str, Enum):
    NOT_SUBMITTED = "NOT_SUBMITTED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AdminRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    FINANCE_ADMIN = "FINANCE_ADMIN"
    COMPLIANCE_OFFICER = "COMPLIANCE_OFFICER"
    RISK_ANALYST = "RISK_ANALYST"
    SECURITY_ADMIN = "SECURITY_ADMIN"
    SUPPORT_AGENT = "SUPPORT_AGENT"
    READ_ONLY_AUDITOR = "READ_ONLY_AUDITOR"


class P2PTradeStatus(str, Enum):
    ESCROW_LOCKED = "ESCROW_LOCKED"
    BUYER_PAID = "BUYER_PAID"
    RELEASED = "RELEASED"
    DISPUTED = "DISPUTED"
    CANCELLED = "CANCELLED"
