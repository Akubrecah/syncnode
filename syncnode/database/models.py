from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from syncnode.common.types import (
    AssetSymbol,
    AccountType,
    OrderSide,
    OrderType,
    TimeInForce,
    OrderStatus,
    SelfTradePrevention,
    KycTier,
    KycStatus,
    AdminRole,
    P2PTradeStatus
)


class UserModel(BaseModel):
    id: str
    email: str
    password_hash: str
    full_name: Optional[str] = None
    country: Optional[str] = None
    investment_goals: Optional[str] = None
    risk_tolerance: Optional[str] = None
    preferred_industry: Optional[str] = None
    is_totp_enabled: bool = False
    totp_secret: Optional[str] = None
    kyc_tier: KycTier = KycTier.TIER_0_UNVERIFIED
    kyc_status: KycStatus = KycStatus.NOT_SUBMITTED
    admin_roles: List[AdminRole] = Field(default_factory=list)
    is_suspended: bool = False
    is_withdrawal_suspended: bool = False
    created_at: int
    updated_at: int


class AccountModel(BaseModel):
    id: str
    user_id: Optional[str] = None
    type: AccountType
    asset: AssetSymbol
    balance: str = "0.00000000"
    created_at: int
    updated_at: int


class JournalEntryModel(BaseModel):
    id: str
    transaction_id: str
    account_id: str
    asset: AssetSymbol
    debit: str = "0.00000000"
    credit: str = "0.00000000"
    created_at: int


class LedgerTransactionModel(BaseModel):
    id: str
    idempotency_key: str
    description: str
    entries: List[JournalEntryModel]
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: int


class OrderModel(BaseModel):
    id: str
    client_order_id: Optional[str] = None
    user_id: str
    market: str
    side: OrderSide
    type: OrderType
    time_in_force: TimeInForce = TimeInForce.GTC
    price: str
    quantity: str
    filled_quantity: str = "0.00000000"
    remaining_quantity: str
    status: OrderStatus = OrderStatus.NEW
    self_trade_prevention: SelfTradePrevention = SelfTradePrevention.CANCEL_MAKER
    created_at: int
    updated_at: int


class TradeModel(BaseModel):
    id: str
    market: str
    buyer_user_id: str
    seller_user_id: str
    maker_order_id: str
    taker_order_id: str
    price: str
    quantity: str
    quote_volume: str
    taker_side: OrderSide
    buyer_fee: str = "0.00000000"
    seller_fee: str = "0.00000000"
    created_at: int


class DepositModel(BaseModel):
    id: str
    user_id: str
    asset: AssetSymbol
    amount: str
    tx_hash: str
    status: str = "CONFIRMED"
    created_at: int


class WithdrawalModel(BaseModel):
    id: str
    user_id: str
    asset: AssetSymbol
    amount: str
    fee: str = "0.00000000"
    destination_address: str
    tx_hash: Optional[str] = None
    status: str = "PENDING_APPROVAL"  # PENDING_APPROVAL, APPROVED, REJECTED, COMPLETED, CANCELLED
    rejection_reason: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[int] = None
    created_at: int


class DepositAddressModel(BaseModel):
    asset: str
    network: str
    address: str
    memo: Optional[str] = None
    qr_code_url: Optional[str] = None
    min_deposit: Optional[str] = "0.0001"
    confirmations_required: Optional[int] = 1
    updated_at: Optional[int] = None


class InvestmentPlanModel(BaseModel):
    id: str
    name: str
    badge: str = "POPULAR"
    min_deposit_usd: str
    max_deposit_usd: str
    return_rate_percent: str
    duration_days: int
    daily_yield_percent: str
    description: str
    is_active: bool = True
    total_staked_usd: str = "0.00"
    investors_count: int = 0


class UserInvestmentModel(BaseModel):
    id: str
    user_id: str
    plan_id: str
    plan_name: str
    invested_amount_usd: str
    expected_return_usd: str
    daily_yield_usd: str
    accrued_profit_usd: str = "0.00"
    status: str = "ACTIVE"  # ACTIVE, COMPLETED, CANCELLED
    duration_days: int = 30
    created_at: int
    end_at: int
    last_payout_at: Optional[int] = None


class TransferModel(BaseModel):
    id: str
    from_user_id: str
    to_user_id: str
    asset: AssetSymbol
    amount: str
    status: str = "COMPLETED"
    created_at: int


class P2PAdModel(BaseModel):
    id: str
    user_id: str
    merchant_name: str
    type: str  # BUY or SELL
    asset: AssetSymbol
    fiat_currency: str
    price: str
    available_amount: str
    min_limit: str
    max_limit: str
    payment_methods: List[str]
    is_active: bool = True
    created_at: int


class P2PTradeModel(BaseModel):
    id: str
    ad_id: str
    buyer_user_id: str
    seller_user_id: str
    asset: AssetSymbol
    fiat_currency: str
    crypto_amount: str
    fiat_amount: str
    price: str
    payment_method: str
    status: P2PTradeStatus = P2PTradeStatus.ESCROW_LOCKED
    escrow_locked_at: int
    paid_at: Optional[int] = None
    released_at: Optional[int] = None
    cancelled_at: Optional[int] = None


class ApiKeyModel(BaseModel):
    id: str
    user_id: str
    key: str
    secret_hash: str
    label: str
    permissions: List[str]
    is_active: bool = True
    created_at: int


class AuditLogModel(BaseModel):
    id: str
    user_id: Optional[str] = None
    admin_id: Optional[str] = None
    action: str
    ip_address: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    created_at: int


class CircuitBreakerModel(BaseModel):
    is_global_trading_halted: bool = False
    halted_markets: Dict[str, bool] = Field(default_factory=dict)
    is_withdrawals_paused: bool = False
    is_deposits_paused: bool = False
    emergency_maintenance: bool = False
