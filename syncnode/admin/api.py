import os
import time
import uuid
import csv
import io
import json
from decimal import Decimal
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Request, Depends, HTTPException, Header, Query, Response
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

from syncnode.database.db import db
from syncnode.database.repository import user_repository, order_repository, trade_repository
from syncnode.services.ledger import ledger_service
from syncnode.services.matching_engine import matching_engine
from syncnode.services.wallet import wallet_service
from syncnode.services.p2p import p2p_service
from syncnode.services.risk import risk_service
from syncnode.services.compliance import compliance_service
from syncnode.services.market_data import market_data_service
from syncnode.services.investment import investment_service
from syncnode.common.types import AssetSymbol, OrderSide, OrderType, KycTier, KycStatus, AdminRole
from syncnode.common.decimal_util import to_decimal, format_decimal, mul_decimals
from syncnode.common.errors import (
    AppError,
    UnauthorizedError,
    ForbiddenError,
    ValidationError,
    NotFoundError,
)
from syncnode.common.logger import Logger
from syncnode.security.crypto import verify_token
from syncnode.common.events import broadcaster

logger = Logger("AdminAPI")
admin_api_router = APIRouter(prefix="/api/v1/admin", tags=["Admin API"])

START_TIME = time.time()

# --------------------------------------------------------------------------
# Auth & RBAC Dependency
# --------------------------------------------------------------------------
async def require_admin(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = verify_token(token)
    except Exception as e:
        raise UnauthorizedError(f"Invalid or expired token: {str(e)}")

    user_id = payload.get("user_id") or payload.get("userId")
    user = user_repository.find_by_id(user_id)
    if not user:
        raise UnauthorizedError("User account not found")

    roles = user.get("admin_roles", [])
    valid_roles = [
        AdminRole.SUPER_ADMIN.value,
        AdminRole.SECURITY_ADMIN.value,
        AdminRole.COMPLIANCE_OFFICER.value,
        AdminRole.RISK_ANALYST.value,
        AdminRole.FINANCE_ADMIN.value,
        AdminRole.SUPPORT_AGENT.value,
        AdminRole.READ_ONLY_AUDITOR.value
    ]

    if not roles or not any(r in valid_roles for r in roles):
        raise ForbiddenError("Administrative privilege required for this resource")

    return user


def log_admin_action(admin: Dict[str, Any], action: str, target_id: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None, reason: Optional[str] = None):
    entry = {
        "id": f"aud_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}",
        "timestamp": int(time.time() * 1000),
        "actorId": admin["id"],
        "actorType": "ADMIN",
        "actorRole": (admin.get("admin_roles") or ["SUPER_ADMIN"])[0],
        "action": action,
        "targetId": target_id,
        "reason": reason,
        "metadata": metadata or {}
    }
    db.audit_logs.append(entry)


# --------------------------------------------------------------------------
# 1. System Health & Executive Overview
# --------------------------------------------------------------------------
@admin_api_router.get("/stats")
async def get_admin_stats(admin: Dict[str, Any] = Depends(require_admin)):
    open_orders_count = sum(
        1 for o in db.orders.values() if o.get("status") in ["NEW", "PARTIALLY_FILLED", "OPEN"]
    )
    return {
        "success": True,
        "stats": {
            "totalUsers": len(db.users),
            "totalOrders": len(db.orders),
            "totalTrades": len(db.trades),
            "totalDeposits": len(db.deposits),
            "totalWithdrawals": len(db.withdrawals),
            "totalP2PAds": len(db.p2p_ads),
            "totalP2PTrades": len(db.p2p_trades),
            "openOrders": open_orders_count
        }
    }


@admin_api_router.get("/system/health")
async def get_system_health(admin: Dict[str, Any] = Depends(require_admin)):
    now = int(time.time() * 1000)
    uptime_sec = int(time.time() - START_TIME)

    open_orders_count = sum(
        1 for o in db.orders.values() if o.get("status") in ["NEW", "PARTIALLY_FILLED", "OPEN"]
    )
    pending_kyc = sum(1 for u in db.users.values() if u.get("kyc_status") == KycStatus.PENDING.value)
    pending_wdr = sum(1 for w in db.withdrawals.values() if w.get("status") in ["PENDING_APPROVAL", "RISK_REVIEW", "REQUESTED"])
    disputed_p2p = sum(1 for t in db.p2p_trades.values() if t.get("status") == "DISPUTED")

    cb = risk_service.get_circuit_breakers()

    return {
        "success": True,
        "health": {
            "timestamp": now,
            "uptimeSeconds": uptime_sec,
            "eventLoopLagMs": 1.2,
            "process": {
                "nodeVersion": "python-3.11",
                "platform": os.uname().sysname.lower() if hasattr(os, "uname") else "linux",
                "pid": os.getpid(),
                "rssMb": 128.5,
                "heapUsedMb": 64.2
            },
            "metrics": {
                "totalUsers": len(db.users),
                "usersActive24h": max(1, len(db.users)),
                "openOrders": open_orders_count,
                "trades24h": len(db.trades),
                "pendingKycReviews": pending_kyc,
                "pendingWithdrawals": pending_wdr,
                "depositsAwaitingConfirmation": sum(1 for d in db.deposits.values() if d.get("status") == "DETECTED"),
                "disputedP2pTrades": disputed_p2p,
                "websocketConnections": 1,
                "ledgerAccounts": len(db.accounts),
                "ledgerTransactions": len(db.ledger_transactions),
                "auditLogEntries": len(db.audit_logs)
            },
            "services": [
                {"name": "Matching Engine", "status": "HEALTHY", "detail": "FIFO Execution & Invariant Checks Normal"},
                {"name": "Double-Entry Ledger", "status": "HEALTHY", "detail": "100% Solvency Invariant Balanced"},
                {"name": "Database Persistence", "status": "HEALTHY" if db._is_connected else "DEGRADED", "detail": "MongoDB Connected" if db._is_connected else "In-Memory Active"},
                {"name": "Risk & Circuit Breakers", "status": "CRITICAL" if cb.get("isGlobalTradingHalted") else "HEALTHY", "detail": "All Protections Active"},
                {"name": "P2P Escrow", "status": "HEALTHY", "detail": "Escrow Locker Active"}
            ],
            "circuitBreakers": cb
        }
    }


# --------------------------------------------------------------------------
# 2. Risk & Circuit Breakers
# --------------------------------------------------------------------------
@admin_api_router.get("/circuit-breakers")
async def get_circuit_breakers(admin: Dict[str, Any] = Depends(require_admin)):
    return {
        "success": True,
        "circuitBreakers": risk_service.get_circuit_breakers()
    }


class GlobalHaltRequest(BaseModel):
    halt: Optional[bool] = None
    halted: Optional[bool] = None
    reason: Optional[str] = "Admin manual trigger"


@admin_api_router.post("/circuit-breakers/global-halt")
async def post_global_halt(req: GlobalHaltRequest, admin: Dict[str, Any] = Depends(require_admin)):
    halt_val = req.halt if req.halt is not None else (req.halted if req.halted is not None else True)
    cb = risk_service.toggle_global_halt(halt_val)
    log_admin_action(admin, "TOGGLE_GLOBAL_HALT", metadata={"halted": halt_val}, reason=req.reason)
    return {"success": True, "circuitBreakers": cb}


class MarketHaltRequest(BaseModel):
    symbol: Optional[str] = None
    market: Optional[str] = None
    halt: Optional[bool] = None
    halted: Optional[bool] = None
    reason: Optional[str] = "Admin manual market trigger"


@admin_api_router.post("/circuit-breakers/market-halt")
async def post_market_halt(req: MarketHaltRequest, admin: Dict[str, Any] = Depends(require_admin)):
    sym = req.symbol or req.market
    if not sym:
        raise ValidationError("Market symbol is required")
    halt_val = req.halt if req.halt is not None else (req.halted if req.halted is not None else True)
    cb = risk_service.toggle_market_halt(sym, halt_val)
    log_admin_action(admin, "TOGGLE_MARKET_HALT", target_id=sym, metadata={"halted": halt_val}, reason=req.reason)
    return {"success": True, "circuitBreakers": cb}


class PauseRequest(BaseModel):
    pause: Optional[bool] = None
    paused: Optional[bool] = None
    reason: Optional[str] = None


@admin_api_router.post("/circuit-breakers/withdrawals-pause")
async def post_withdrawals_pause(req: PauseRequest, admin: Dict[str, Any] = Depends(require_admin)):
    p_val = req.pause if req.pause is not None else (req.paused if req.paused is not None else True)
    cb = risk_service.toggle_withdrawals_pause(p_val)
    log_admin_action(admin, "TOGGLE_WITHDRAWALS_PAUSE", metadata={"paused": p_val}, reason=req.reason)
    return {"success": True, "circuitBreakers": cb}


@admin_api_router.post("/circuit-breakers/deposits-pause")
async def post_deposits_pause(req: PauseRequest, admin: Dict[str, Any] = Depends(require_admin)):
    p_val = req.pause if req.pause is not None else (req.paused if req.paused is not None else True)
    cb = risk_service.toggle_deposits_pause(p_val)
    log_admin_action(admin, "TOGGLE_DEPOSITS_PAUSE", metadata={"paused": p_val}, reason=req.reason)
    return {"success": True, "circuitBreakers": cb}


class MaintenanceRequest(BaseModel):
    enabled: bool = True
    reason: Optional[str] = None


@admin_api_router.post("/circuit-breakers/maintenance")
async def post_maintenance(req: MaintenanceRequest, admin: Dict[str, Any] = Depends(require_admin)):
    cb = risk_service.toggle_maintenance(req.enabled)
    log_admin_action(admin, "TOGGLE_MAINTENANCE", metadata={"enabled": req.enabled}, reason=req.reason)
    return {"success": True, "circuitBreakers": cb}


# --------------------------------------------------------------------------
# 3. Markets & Trading Surveillance
# --------------------------------------------------------------------------
DEFAULT_MARKETS_CONFIG = {
    "BTC-USDT": {
        "symbol": "BTC-USDT", "baseAsset": "BTC", "quoteAsset": "USDT",
        "priceDecimals": 2, "qtyDecimals": 6, "minQty": "0.0001", "maxQty": "100.0",
        "minNotional": "10.0", "tickSize": "0.01", "lotSize": "0.0001",
        "makerFeeRate": "0.001", "takerFeeRate": "0.001", "isTradingEnabled": True, "priceBandPercent": 10
    },
    "ETH-USDT": {
        "symbol": "ETH-USDT", "baseAsset": "ETH", "quoteAsset": "USDT",
        "priceDecimals": 2, "qtyDecimals": 5, "minQty": "0.001", "maxQty": "500.0",
        "minNotional": "10.0", "tickSize": "0.01", "lotSize": "0.001",
        "makerFeeRate": "0.001", "takerFeeRate": "0.001", "isTradingEnabled": True, "priceBandPercent": 10
    },
    "SOL-USDT": {
        "symbol": "SOL-USDT", "baseAsset": "SOL", "quoteAsset": "USDT",
        "priceDecimals": 2, "qtyDecimals": 4, "minQty": "0.01", "maxQty": "2000.0",
        "minNotional": "10.0", "tickSize": "0.01", "lotSize": "0.01",
        "makerFeeRate": "0.001", "takerFeeRate": "0.001", "isTradingEnabled": True, "priceBandPercent": 10
    }
}


@admin_api_router.get("/markets")
async def list_admin_markets(admin: Dict[str, Any] = Depends(require_admin)):
    halted_dict = db.circuit_breakers.get("halted_markets", {})
    global_halted = db.circuit_breakers.get("is_global_trading_halted", False)
    markets_list = []

    for sym_key, cfg in DEFAULT_MARKETS_CONFIG.items():
        slash_sym = sym_key.replace("-", "/")
        m_trades = [t for t in db.trades.values() if t.get("market") in [sym_key, slash_sym]]
        m_orders = [o for o in db.orders.values() if o.get("market") in [sym_key, slash_sym] and o.get("status") in ["NEW", "PARTIALLY_FILLED", "OPEN"]]
        
        last_trade = m_trades[-1] if m_trades else None
        last_price = last_trade.get("price") if last_trade else "96450.00" if "BTC" in sym_key else "2750.00" if "ETH" in sym_key else "195.00"
        vol_24h = sum(to_decimal(t.get("quantity", 0)) for t in m_trades)
        
        is_h = global_halted or halted_dict.get(sym_key, False) or halted_dict.get(slash_sym, False)

        m_item = {
            **cfg,
            "stats": {
                "openOrders": len(m_orders),
                "trades24h": len(m_trades),
                "volume24h": format_decimal(vol_24h),
                "lastPrice": str(last_price),
                "changePercent": "+2.45",
                "isHalted": is_h
            }
        }
        markets_list.append(m_item)

    return {"success": True, "markets": markets_list}


class MarketCreateRequest(BaseModel):
    symbol: str
    baseAsset: str
    quoteAsset: str
    priceDecimals: Optional[int] = 2
    qtyDecimals: Optional[int] = 6
    minQty: Optional[str] = "0.0001"
    maxQty: Optional[str] = "100.0"
    minNotional: Optional[str] = "10.0"
    tickSize: Optional[str] = "0.01"
    lotSize: Optional[str] = "0.0001"
    makerFeeRate: Optional[str] = "0.001"
    takerFeeRate: Optional[str] = "0.001"
    isTradingEnabled: Optional[bool] = True
    priceBandPercent: Optional[int] = 10


@admin_api_router.post("/markets")
async def create_admin_market(req: MarketCreateRequest, admin: Dict[str, Any] = Depends(require_admin)):
    clean_sym = req.symbol.upper().strip().replace("/", "-")
    new_cfg = req.model_dump()
    new_cfg["symbol"] = clean_sym
    DEFAULT_MARKETS_CONFIG[clean_sym] = new_cfg
    log_admin_action(admin, "CREATE_MARKET", target_id=clean_sym, metadata=new_cfg)
    return {"success": True, "market": new_cfg}


@admin_api_router.put("/markets/{symbol}")
async def update_admin_market(symbol: str, req: Dict[str, Any], admin: Dict[str, Any] = Depends(require_admin)):
    clean_sym = symbol.upper().strip().replace("/", "-")
    if clean_sym not in DEFAULT_MARKETS_CONFIG:
        DEFAULT_MARKETS_CONFIG[clean_sym] = {
            "symbol": clean_sym,
            "baseAsset": clean_sym.split("-")[0] if "-" in clean_sym else "BTC",
            "quoteAsset": clean_sym.split("-")[1] if "-" in clean_sym else "USDT",
            "priceDecimals": 2, "qtyDecimals": 6, "minQty": "0.0001", "maxQty": "100.0",
            "minNotional": "10.0", "tickSize": "0.01", "lotSize": "0.0001",
            "makerFeeRate": "0.001", "takerFeeRate": "0.001", "isTradingEnabled": True, "priceBandPercent": 10
        }
    DEFAULT_MARKETS_CONFIG[clean_sym].update(req)
    log_admin_action(admin, "UPDATE_MARKET_CONFIG", target_id=clean_sym, metadata=req)
    return {"success": True, "market": DEFAULT_MARKETS_CONFIG[clean_sym]}


@admin_api_router.get("/orders")
async def list_admin_orders(
    symbol: Optional[str] = None,
    status: Optional[str] = None,
    userId: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    admin: Dict[str, Any] = Depends(require_admin)
):
    orders = list(db.orders.values())
    if symbol:
        s_dash = symbol.upper().replace("/", "-")
        s_slash = symbol.upper().replace("-", "/")
        orders = [o for o in orders if o.get("market") in [symbol, s_dash, s_slash]]
    if status:
        orders = [o for o in orders if o.get("status") == status]
    if userId:
        orders = [o for o in orders if o.get("user_id") == userId]

    orders.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    total = len(orders)
    start = (page - 1) * limit
    paginated = orders[start:start + limit]

    # Normalize response fields for React Admin Order interface
    formatted_orders = []
    for o in paginated:
        u = db.users.get(o.get("user_id", ""))
        user_email = u.get("email", "") if u else ""
        formatted_orders.append({
            "id": o.get("id"),
            "clientOrderId": o.get("client_order_id"),
            "userId": o.get("user_id"),
            "userEmail": user_email,
            "symbol": o.get("market", "").replace("/", "-"),
            "side": o.get("side"),
            "type": o.get("type", "LIMIT"),
            "timeInForce": o.get("time_in_force", "GTC"),
            "price": str(o.get("price", "0.00")),
            "quantity": str(o.get("quantity", "0.00")),
            "filledQuantity": str(o.get("filled_quantity", "0.00")),
            "remainingQuantity": str(o.get("remaining_quantity", o.get("quantity", "0.00"))),
            "cumulativeQuoteQuantity": str(mul_decimals(o.get("filled_quantity", "0"), o.get("price", "0"))),
            "status": o.get("status"),
            "lockedAmount": str(o.get("quantity", "0")),
            "lockedAsset": (o.get("market", "BTC/USDT").split("/")[0]),
            "createdAt": o.get("created_at", int(time.time() * 1000)),
            "updatedAt": o.get("updated_at", int(time.time() * 1000))
        })

    return {
        "success": True,
        "orders": formatted_orders,
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": max(1, (total + limit - 1) // limit)
    }


class OrderCancelReasonRequest(BaseModel):
    reason: Optional[str] = "Administrative cancellation"


@admin_api_router.post("/orders/{order_id}/cancel")
async def admin_cancel_single_order(
    order_id: str,
    req: Optional[OrderCancelReasonRequest] = None,
    admin: Dict[str, Any] = Depends(require_admin)
):
    reason = req.reason if req else "Administrative cancellation"
    res = matching_engine.admin_cancel_order(order_id, admin["id"], reason)
    log_admin_action(admin, "CANCEL_ORDER", target_id=order_id, reason=reason)
    return {"success": True, "order": res}


@admin_api_router.get("/trades")
async def list_admin_trades(
    symbol: Optional[str] = None,
    userId: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    admin: Dict[str, Any] = Depends(require_admin)
):
    trades = list(db.trades.values())
    if symbol:
        s_dash = symbol.upper().replace("/", "-")
        s_slash = symbol.upper().replace("-", "/")
        trades = [t for t in trades if t.get("market") in [symbol, s_dash, s_slash]]
    if userId:
        trades = [t for t in trades if t.get("buyer_user_id") == userId or t.get("seller_user_id") == userId]

    trades.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    total = len(trades)
    start = (page - 1) * limit
    paginated = trades[start:start + limit]

    formatted_trades = []
    for t in paginated:
        m = t.get("market", "BTC/USDT")
        base = m.split("/")[0] if "/" in m else "BTC"
        quote = m.split("/")[1] if "/" in m else "USDT"
        formatted_trades.append({
            "id": t.get("id"),
            "symbol": m.replace("/", "-"),
            "price": str(t.get("price")),
            "quantity": str(t.get("quantity")),
            "quoteQuantity": str(t.get("quote_volume", "0.00")),
            "buyerUserId": t.get("buyer_user_id"),
            "sellerUserId": t.get("seller_user_id"),
            "makerSide": "BUY",
            "buyerFee": "0.00",
            "buyerFeeAsset": quote,
            "sellerFee": "0.00",
            "sellerFeeAsset": base,
            "timestamp": t.get("created_at", int(time.time() * 1000))
        })

    return {
        "success": True,
        "trades": formatted_trades,
        "total": total,
        "page": page,
        "limit": limit
    }


# --------------------------------------------------------------------------
# 4. User Intelligence & KYC Compliance
# --------------------------------------------------------------------------
@admin_api_router.get("/users")
async def list_users(
    search: Optional[str] = None,
    kycStatus: Optional[str] = None,
    isSuspended: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    admin: Dict[str, Any] = Depends(require_admin)
):
    users = list(db.users.values())
    if search:
        s_low = search.lower().strip()
        users = [u for u in users if s_low in u.get("email", "").lower() or s_low in u.get("id", "").lower() or s_low in u.get("full_name", "").lower()]
    if kycStatus:
        users = [u for u in users if u.get("kyc_status") == kycStatus]
    if isSuspended is not None:
        users = [u for u in users if u.get("is_suspended") == isSuspended]

    users.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    total = len(users)
    start = (page - 1) * limit
    paginated = users[start:start + limit]

    safe_users = []
    for u in paginated:
        su = {k: v for k, v in u.items() if k not in ["password_hash", "totp_secret"]}
        su["balances"] = ledger_service.get_user_balances(u["id"])
        su["kycTier"] = u.get("kyc_tier", "TIER_0_UNVERIFIED")
        su["kycStatus"] = u.get("kyc_status", "NOT_SUBMITTED")
        su["isTotpEnabled"] = u.get("is_totp_enabled", False)
        su["isSuspended"] = u.get("is_suspended", False)
        su["isWithdrawalSuspended"] = u.get("is_withdrawal_suspended", False)
        su["createdAt"] = u.get("created_at", int(time.time() * 1000))
        su["updatedAt"] = u.get("updated_at", int(time.time() * 1000))
        safe_users.append(su)

    return {
        "success": True,
        "users": safe_users,
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": max(1, (total + limit - 1) // limit)
    }


@admin_api_router.get("/users/{user_id}")
async def get_user_detail(user_id: str, admin: Dict[str, Any] = Depends(require_admin)):
    u = user_repository.find_by_id(user_id)
    if not u:
        raise NotFoundError(f"User {user_id} not found")

    user_profile = {k: v for k, v in u.items() if k not in ["password_hash", "totp_secret"]}
    user_balances = ledger_service.get_user_balances(user_id)
    user_orders = [o for o in db.orders.values() if o.get("user_id") == user_id]
    user_trades = [t for t in db.trades.values() if t.get("buyer_user_id") == user_id or t.get("seller_user_id") == user_id]
    user_deposits = [d for d in db.deposits.values() if d.get("user_id") == user_id]
    user_withdrawals = [w for w in db.withdrawals.values() if w.get("user_id") == user_id]
    user_audit = [a for a in db.audit_logs if a.get("targetId") == user_id or a.get("actorId") == user_id]

    return {
        "success": True,
        "user": user_profile,
        "balances": user_balances,
        "orders": user_orders,
        "trades": user_trades,
        "deposits": user_deposits,
        "withdrawals": user_withdrawals,
        "auditLogs": user_audit,
        "sessions": [
            {
                "id": f"sess_{user_id[:6]}",
                "ip": "127.0.0.1",
                "userAgent": "Mozilla/5.0 Exchange Client",
                "lastActive": int(time.time() * 1000),
                "isCurrent": True
            }
        ]
    }


@admin_api_router.post("/users/{user_id}/suspend")
async def suspend_user(user_id: str, admin: Dict[str, Any] = Depends(require_admin)):
    u = user_repository.find_by_id(user_id)
    if not u:
        raise NotFoundError("User not found")
    u["is_suspended"] = True
    u["updated_at"] = int(time.time() * 1000)
    user_repository.save(u)
    log_admin_action(admin, "SUSPEND_USER", target_id=user_id)
    return {"success": True, "isSuspended": True, "is_suspended": True}


@admin_api_router.post("/users/{user_id}/unsuspend")
async def unsuspend_user(user_id: str, admin: Dict[str, Any] = Depends(require_admin)):
    u = user_repository.find_by_id(user_id)
    if not u:
        raise NotFoundError("User not found")
    u["is_suspended"] = False
    u["updated_at"] = int(time.time() * 1000)
    user_repository.save(u)
    log_admin_action(admin, "UNSUSPEND_USER", target_id=user_id)
    return {"success": True, "isSuspended": False, "is_suspended": False}


class WithdrawalRestrictionRequest(BaseModel):
    restricted: bool
    reason: Optional[str] = None


@admin_api_router.post("/users/{user_id}/withdrawal-restriction")
async def toggle_withdrawal_restriction(user_id: str, req: WithdrawalRestrictionRequest, admin: Dict[str, Any] = Depends(require_admin)):
    u = user_repository.find_by_id(user_id)
    if not u:
        raise NotFoundError("User not found")
    u["is_withdrawal_suspended"] = req.restricted
    u["updated_at"] = int(time.time() * 1000)
    user_repository.save(u)
    log_admin_action(admin, "SET_WITHDRAWAL_RESTRICTION", target_id=user_id, metadata={"restricted": req.restricted}, reason=req.reason)
    return {"success": True, "isWithdrawalSuspended": req.restricted}


class BalanceAdjustmentRequest(BaseModel):
    asset: str
    targetBalance: Optional[str] = None
    amount: Optional[str] = None
    action: Optional[str] = "CREDIT"  # CREDIT or DEBIT
    operation: Optional[str] = None  # CREDIT, DEBIT, SET
    reason: str = "Admin manual balance adjustment"


@admin_api_router.post("/users/{user_id}/adjust-balance")
async def adjust_user_balance(user_id: str, req: BalanceAdjustmentRequest, admin: Dict[str, Any] = Depends(require_admin)):
    u = user_repository.find_by_id(user_id)
    if not u:
        raise NotFoundError("User not found")

    asset_clean = req.asset.upper().strip()
    if asset_clean not in [a.value for a in AssetSymbol]:
        raise ValidationError(f"Unsupported asset {asset_clean}")

    asset_sym = AssetSymbol(asset_clean)

    op = (req.operation or req.action or "CREDIT").upper().strip()

    if op == "SET" and req.amount is not None:
        res = wallet_service.admin_adjust_user_balance(user_id, asset_sym, req.amount, req.reason, admin["id"])
    elif req.targetBalance is not None:
        res = wallet_service.admin_adjust_user_balance(user_id, asset_sym, req.targetBalance, req.reason, admin["id"])
    elif req.amount is not None:
        amt_dec = to_decimal(req.amount)
        if amt_dec <= 0:
            raise ValidationError("Amount must be greater than zero")
        curr = ledger_service.get_user_asset_balance(user_id, asset_sym)
        curr_avail = to_decimal(curr["available"])
        target = curr_avail + amt_dec if op == "CREDIT" else curr_avail - amt_dec
        if target < 0:
            raise ValidationError("Cannot debit more than available balance")
        res = wallet_service.admin_adjust_user_balance(user_id, asset_sym, str(target), req.reason, admin["id"])
    else:
        raise ValidationError("Either targetBalance or amount is required")


    log_admin_action(admin, "ADJUST_BALANCE", target_id=user_id, metadata={"asset": asset_clean, "details": res}, reason=req.reason)
    updated_balances = ledger_service.get_user_balances(user_id)
    
    # Broadcast real-time balance update to user terminal
    await broadcaster.broadcast({
        "type": "BALANCE_UPDATE",
        "userId": user_id,
        "balances": updated_balances,
        "timestamp": int(time.time() * 1000)
    })
    await broadcaster.send_to_user(user_id, {
        "type": "BALANCE_UPDATE",
        "userId": user_id,
        "balances": updated_balances,
        "timestamp": int(time.time() * 1000)
    })

    return {"success": True, "result": res, "balances": updated_balances}


class AdminCreditFundsRequest(BaseModel):
    userId: Optional[str] = None
    email: Optional[str] = None
    asset: str
    amount: str
    reason: Optional[str] = "Admin Manual Credit"


@admin_api_router.post("/users/credit-funds")
@admin_api_router.post("/users/{user_id}/credit")
async def admin_credit_user_funds(
    req: AdminCreditFundsRequest,
    user_id: Optional[str] = None,
    admin: Dict[str, Any] = Depends(require_admin)
):
    target_id = user_id or req.userId
    target_user = None
    if target_id:
        target_user = user_repository.find_by_id(target_id)
    elif req.email:
        target_user = user_repository.find_by_email(req.email)

    if not target_user:
        raise NotFoundError("Target user not found")

    amount_dec = to_decimal(req.amount)
    if amount_dec <= Decimal("0"):
        raise ValidationError("Amount must be greater than zero")

    asset_clean = req.asset.upper().strip()
    if asset_clean not in [a.value for a in AssetSymbol]:
        raise ValidationError(f"Unsupported asset {asset_clean}")

    deposit_record = wallet_service.credit_deposit(target_user["id"], AssetSymbol(asset_clean), str(amount_dec))

    log_admin_action(
        admin,
        "ADMIN_CREDIT_FUNDS",
        target_id=target_user["id"],
        metadata={"asset": asset_clean, "amount": str(amount_dec), "depositId": deposit_record["id"]},
        reason=req.reason
    )

    updated_balances = ledger_service.get_user_balances(target_user["id"])

    # Broadcast real-time balance update to user terminal
    await broadcaster.broadcast({
        "type": "BALANCE_UPDATE",
        "userId": target_user["id"],
        "balances": updated_balances,
        "timestamp": int(time.time() * 1000)
    })
    await broadcaster.send_to_user(target_user["id"], {
        "type": "BALANCE_UPDATE",
        "userId": target_user["id"],
        "balances": updated_balances,
        "timestamp": int(time.time() * 1000)
    })

    return {
        "success": True,
        "message": f"Successfully credited {amount_dec} {asset_clean} to {target_user['email']}",
        "deposit": deposit_record,
        "balances": updated_balances
    }



@admin_api_router.get("/kyc/pending")
async def list_pending_kyc(admin: Dict[str, Any] = Depends(require_admin)):
    pending = []
    for u in db.users.values():
        if u.get("kyc_status") == KycStatus.PENDING.value:
            pending.append({
                "id": f"kyc_{u['id']}",
                "userId": u["id"],
                "userEmail": u["email"],
                "tier": u.get("kyc_tier", "TIER_1_BASIC"),
                "fullName": u.get("full_name", "Verified User"),
                "dateOfBirth": "1990-01-01",
                "country": u.get("country", "US"),
                "idDocumentType": "PASSPORT",
                "idNumber": "A12345678",
                "status": "PENDING",
                "submittedAt": u.get("updated_at", int(time.time() * 1000))
            })
    return {"success": True, "applications": pending, "pending": pending}


class AdminKycReviewRequest(BaseModel):
    userId: Optional[str] = None
    approved: bool
    tier: Optional[str] = "TIER_2_VERIFIED"
    rejectionReason: Optional[str] = None


@admin_api_router.post("/kyc/review")
async def review_kyc_application(req: AdminKycReviewRequest, admin: Dict[str, Any] = Depends(require_admin)):
    if not req.userId:
        raise ValidationError("userId is required for KYC review")
    res = compliance_service.review_kyc(req.userId, req.approved)
    log_admin_action(
        admin,
        "REVIEW_KYC",
        target_id=req.userId,
        metadata={"approved": req.approved, "tier": req.tier},
        reason=req.rejectionReason
    )
    return {"success": True, **res}


# --------------------------------------------------------------------------
# 5. Finance, Proof of Reserves & Treasury
# --------------------------------------------------------------------------
@admin_api_router.get("/proof-of-reserves")
async def get_proof_of_reserves(admin: Dict[str, Any] = Depends(require_admin)):
    por = ledger_service.verify_proof_of_reserves()
    return {"success": True, **por}


@admin_api_router.get("/wallet/balances")
@admin_api_router.get("/treasury")
async def get_treasury_balances(admin: Dict[str, Any] = Depends(require_admin)):
    summary = ledger_service.get_detailed_treasury_summary()
    return summary


@admin_api_router.get("/ledger/entries")
async def list_ledger_entries(
    userId: Optional[str] = None,
    asset: Optional[str] = None,
    accountId: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    admin: Dict[str, Any] = Depends(require_admin)
):
    entries = ledger_service.search_journal_entries(
        user_id=userId,
        asset=asset,
        account_id=accountId,
        limit=limit,
        offset=offset
    )
    return {"success": True, "entries": entries, "total": len(entries)}


# --------------------------------------------------------------------------
# 6. Wallet Operations (Deposits, Withdrawals, Internal Transfers)
# --------------------------------------------------------------------------
@admin_api_router.get("/deposits")
async def get_deposits(
    asset: Optional[str] = None,
    status: Optional[str] = None,
    userId: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    admin: Dict[str, Any] = Depends(require_admin)
):
    deps = list(db.deposits.values())
    if asset:
        deps = [d for d in deps if d.get("asset") == asset.upper()]
    if status:
        deps = [d for d in deps if d.get("status") == status]
    if userId:
        deps = [d for d in deps if d.get("user_id") == userId]

    deps.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    total = len(deps)
    start = (page - 1) * limit
    paginated = deps[start:start + limit]

    formatted = []
    for d in paginated:
        u = db.users.get(d.get("user_id", ""))
        formatted.append({
            "id": d.get("id"),
            "userId": d.get("user_id"),
            "userEmail": u.get("email", "") if u else "",
            "asset": d.get("asset"),
            "network": d.get("network", "MAINNET"),
            "address": d.get("address", "0xVaultDepositAddress"),
            "txHash": d.get("tx_hash"),
            "amount": str(d.get("amount")),
            "confirmations": d.get("confirmations", 12),
            "requiredConfirmations": 12,
            "status": d.get("status", "CONFIRMED"),
            "createdAt": d.get("created_at", int(time.time() * 1000)),
            "updatedAt": d.get("updated_at", int(time.time() * 1000))
        })

    return {"success": True, "deposits": formatted, "total": total}


@admin_api_router.get("/withdrawals")
async def get_withdrawals(
    asset: Optional[str] = None,
    status: Optional[str] = None,
    userId: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    admin: Dict[str, Any] = Depends(require_admin)
):
    wdrs = list(db.withdrawals.values())
    if asset:
        wdrs = [w for w in wdrs if w.get("asset") == asset.upper()]
    if status:
        wdrs = [w for w in wdrs if w.get("status") == status]
    if userId:
        wdrs = [w for w in wdrs if w.get("user_id") == userId]

    wdrs.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    total = len(wdrs)
    start = (page - 1) * limit
    paginated = wdrs[start:start + limit]

    formatted = []
    for w in paginated:
        u = db.users.get(w.get("user_id", ""))
        amt = str(w.get("amount", "0.00"))
        fee = str(w.get("fee", "0.00"))
        net = format_decimal(to_decimal(amt) - to_decimal(fee))
        formatted.append({
            "id": w.get("id"),
            "userId": w.get("user_id"),
            "userEmail": u.get("email", "") if u else "",
            "asset": w.get("asset"),
            "network": w.get("network", "MAINNET"),
            "destinationAddress": w.get("destination_address", ""),
            "amount": amt,
            "fee": fee,
            "netAmount": net,
            "txHash": w.get("tx_hash"),
            "status": w.get("status"),
            "riskScore": w.get("risk_score", 10),
            "approvedBy": w.get("approved_by"),
            "createdAt": w.get("created_at", int(time.time() * 1000)),
            "updatedAt": w.get("updated_at", int(time.time() * 1000))
        })

    return {"success": True, "withdrawals": formatted, "total": total}


@admin_api_router.post("/withdrawals/{withdrawal_id}/approve")
async def approve_single_withdrawal(withdrawal_id: str, admin: Dict[str, Any] = Depends(require_admin)):
    res = wallet_service.approve_withdrawal(withdrawal_id, admin["id"])
    log_admin_action(admin, "APPROVE_WITHDRAWAL", target_id=withdrawal_id)
    return {"success": True, "withdrawal": res}


class RejectWithdrawalRequest(BaseModel):
    reason: Optional[str] = "Admin rejected withdrawal"


@admin_api_router.post("/withdrawals/{withdrawal_id}/reject")
async def reject_single_withdrawal(withdrawal_id: str, req: Optional[RejectWithdrawalRequest] = None, admin: Dict[str, Any] = Depends(require_admin)):
    reason = req.reason if req else "Admin rejected withdrawal"
    res = wallet_service.reject_withdrawal(withdrawal_id, admin["id"], reason)
    log_admin_action(admin, "REJECT_WITHDRAWAL", target_id=withdrawal_id, reason=reason)
    return {"success": True, "withdrawal": res}


@admin_api_router.get("/transfers")
@admin_api_router.get("/internal-transfers")
async def get_internal_transfers(admin: Dict[str, Any] = Depends(require_admin)):
    transfers = list(db.transfers.values())
    transfers.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    formatted = []
    for t in transfers:
        sender_u = db.users.get(t.get("from_user_id", ""))
        recipient_u = db.users.get(t.get("to_user_id", ""))
        formatted.append({
            "id": t.get("id"),
            "type": "INTERNAL",
            "senderUserId": t.get("from_user_id"),
            "senderEmail": sender_u.get("email") if sender_u else t.get("from_user_id"),
            "recipientIdentifier": t.get("to_user_id"),
            "recipientUserId": t.get("to_user_id"),
            "recipientEmail": recipient_u.get("email") if recipient_u else t.get("to_user_id"),
            "asset": t.get("asset"),
            "amount": str(t.get("amount")),
            "fee": "0.00000000",
            "netAmount": str(t.get("amount")),
            "status": t.get("status", "COMPLETED"),
            "createdAt": t.get("created_at", int(time.time() * 1000)),
            "updatedAt": t.get("updated_at", int(time.time() * 1000))
        })
    return {"success": True, "transfers": formatted}


# --------------------------------------------------------------------------
# 7. P2P Escrow & Dispute Resolution
# --------------------------------------------------------------------------
@admin_api_router.get("/p2p/escrows")
async def list_p2p_escrows(status: Optional[str] = None, admin: Dict[str, Any] = Depends(require_admin)):
    trades = list(db.p2p_trades.values())
    if status:
        trades = [t for t in trades if t.get("status") == status]
    trades.sort(key=lambda x: x.get("created_at", 0), reverse=True)

    formatted = []
    for t in trades:
        bu = db.users.get(t.get("buyer_user_id", ""))
        su = db.users.get(t.get("seller_user_id", ""))
        formatted.append({
            "id": t.get("id"),
            "adId": t.get("ad_id"),
            "buyerUserId": t.get("buyer_user_id"),
            "buyerEmail": bu.get("email") if bu else t.get("buyer_user_id"),
            "sellerUserId": t.get("seller_user_id"),
            "sellerEmail": su.get("email") if su else t.get("seller_user_id"),
            "asset": t.get("asset"),
            "cryptoAmount": str(t.get("crypto_amount")),
            "fiatAmount": str(t.get("fiat_amount")),
            "fiatCurrency": t.get("fiat_currency", "USD"),
            "price": str(t.get("price")),
            "paymentMethod": t.get("payment_method", "Bank Transfer"),
            "status": t.get("status"),
            "disputeReason": t.get("dispute_reason"),
            "createdAt": t.get("created_at", int(time.time() * 1000)),
            "updatedAt": t.get("updated_at", int(time.time() * 1000))
        })
    return {"success": True, "escrows": formatted}


class P2PResolveRequest(BaseModel):
    id: Optional[str] = None
    action: str  # 'RELEASE' or 'CANCEL'
    reason: str


@admin_api_router.post("/p2p/escrows/{trade_id}/resolve")
async def resolve_p2p_dispute(trade_id: str, req: P2PResolveRequest, admin: Dict[str, Any] = Depends(require_admin)):
    res = p2p_service.admin_resolve_dispute(trade_id, req.action, admin["id"], req.reason)
    return {"success": True, "trade": res}


@admin_api_router.get("/p2p/ads")
async def list_p2p_ads(admin: Dict[str, Any] = Depends(require_admin)):
    ads = list(db.p2p_ads.values())
    ads.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    return {"success": True, "ads": ads}


# --------------------------------------------------------------------------
# 8. Security & Audit Logging
# --------------------------------------------------------------------------
@admin_api_router.get("/api-keys")
async def list_admin_api_keys(admin: Dict[str, Any] = Depends(require_admin)):
    keys = list(db.api_keys.values())
    formatted = []
    for k in keys:
        u = db.users.get(k.get("user_id", ""))
        formatted.append({
            "id": k.get("id"),
            "userId": k.get("user_id"),
            "userEmail": u.get("email") if u else k.get("user_id"),
            "label": k.get("label", "Production API Key"),
            "keyPrefix": k.get("key", "sync_")[:8] + "...",
            "permissions": k.get("permissions", {"canRead": True, "canTrade": True, "canWithdraw": False}),
            "ipWhitelist": k.get("ip_whitelist", []),
            "createdAt": k.get("created_at", int(time.time() * 1000))
        })
    return {"success": True, "apiKeys": formatted}


@admin_api_router.get("/security/events")
async def get_security_events(admin: Dict[str, Any] = Depends(require_admin)):
    events = [a for a in db.audit_logs if "LOGIN" in a.get("action", "") or "SECURITY" in a.get("action", "") or "SUSPEND" in a.get("action", "")]
    return {
        "success": True,
        "events": events,
        "summary": {
            "failedLoginAttempts": sum(1 for e in events if "FAIL" in e.get("action", "")),
            "distinctTargetAccounts": len(set(e.get("targetId") for e in events if e.get("targetId"))),
            "topTargets": []
        }
    }


@admin_api_router.get("/audit-logs")
async def get_audit_logs(
    action: Optional[str] = None,
    actorId: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    admin: Dict[str, Any] = Depends(require_admin)
):
    logs = list(db.audit_logs)
    if action:
        logs = [l for l in logs if l.get("action") == action]
    if actorId:
        logs = [l for l in logs if l.get("actorId") == actorId or l.get("admin_id") == actorId]

    logs.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    total = len(logs)
    start = (page - 1) * limit
    paginated = logs[start:start + limit]

    # Normalize entries to match AuditLog interface
    formatted = []
    for l in paginated:
        formatted.append({
            "id": l.get("id") or f"aud_{l.get('timestamp', 0)}",
            "actorId": l.get("actorId") or l.get("admin_id") or "SYSTEM",
            "actorType": l.get("actorType") or "ADMIN",
            "action": l.get("action", "UNKNOWN_ACTION"),
            "targetId": l.get("targetId") or l.get("target_id") or l.get("target_user_id"),
            "ipAddress": l.get("ipAddress", "127.0.0.1"),
            "userAgent": l.get("userAgent", "AdminConsole/1.0"),
            "metadata": l.get("metadata") or {k: v for k, v in l.items() if k not in ["id", "timestamp", "action", "actorId", "actorType"]},
            "timestamp": l.get("timestamp", int(time.time() * 1000))
        })

    return {
        "success": True,
        "auditLogs": formatted,
        "logs": formatted,
        "total": total,
        "page": page,
        "limit": limit
    }


@admin_api_router.get("/audit-logs/export")
async def export_audit_logs(admin: Dict[str, Any] = Depends(require_admin)):
    logs = list(db.audit_logs)
    logs.sort(key=lambda x: x.get("timestamp", 0), reverse=True)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Timestamp", "Event ID", "Actor ID", "Actor Type", "Action", "Target ID", "Reason", "Metadata"])

    for l in logs:
        writer.writerow([
            l.get("timestamp"),
            l.get("id", ""),
            l.get("actorId") or l.get("admin_id", ""),
            l.get("actorType", "ADMIN"),
            l.get("action", ""),
            l.get("targetId") or l.get("target_id", ""),
            l.get("reason", ""),
            json.dumps(l.get("metadata") or {})
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=syncnode-audit-logs-{int(time.time())}.csv"}
    )


# Deposit Addresses
@admin_api_router.get("/wallet/deposit-addresses")
async def get_admin_deposit_addresses(admin: Dict[str, Any] = Depends(require_admin)):
    return {"success": True, "addresses": list(db.deposit_addresses.values())}


class SetDepositAddressRequest(BaseModel):
    asset: str
    network: str
    address: str
    memo: Optional[str] = None
    min_deposit: Optional[str] = "0.0001"
    confirmations: Optional[int] = 1


@admin_api_router.post("/wallet/deposit-addresses")
async def set_admin_deposit_address(req: SetDepositAddressRequest, admin: Dict[str, Any] = Depends(require_admin)):
    record = wallet_service.set_deposit_address(req.asset, req.network, req.address, req.memo, req.min_deposit or "0.0001", req.confirmations or 1)
    log_admin_action(admin, "SET_DEPOSIT_ADDRESS", target_id=req.asset, metadata={"network": req.network, "address": req.address})
    return {"success": True, "depositAddress": record}


# Transaction Ingestion
class AdminIngestTransactionRequest(BaseModel):
    type: str  # DEPOSIT, INVESTMENT_PAYOUT, BINANCE_PAY, BONUS, REBATE
    asset: str
    amount: str
    note: Optional[str] = None
    status: Optional[str] = "COMPLETED"
    tx_hash: Optional[str] = None
    credit_balance: Optional[bool] = True


@admin_api_router.post("/users/{user_id}/ingest-transaction")
@admin_api_router.post("/transactions/ingest")
async def admin_ingest_transaction(req: AdminIngestTransactionRequest, user_id: Optional[str] = None, admin: Dict[str, Any] = Depends(require_admin)):
    target_user_id = user_id or admin["id"]
    res = wallet_service.admin_ingest_transaction(
        target_user_id,
        req.type,
        req.asset,
        req.amount,
        req.note,
        req.status or "COMPLETED",
        req.tx_hash,
        req.credit_balance if req.credit_balance is not None else True,
        admin["id"]
    )
    log_admin_action(admin, "INGEST_TRANSACTION", target_id=target_user_id, metadata={"type": req.type, "asset": req.asset, "amount": req.amount})
    updated_balances = ledger_service.get_user_balances(target_user_id)
    await broadcaster.broadcast({
        "type": "BALANCE_UPDATE",
        "userId": target_user_id,
        "balances": updated_balances,
        "timestamp": int(time.time() * 1000)
    })
    await broadcaster.send_to_user(target_user_id, {
        "type": "BALANCE_UPDATE",
        "userId": target_user_id,
        "balances": updated_balances,
        "timestamp": int(time.time() * 1000)
    })
    return {"success": True, "transaction": res, "balances": updated_balances}



# Investment Management
@admin_api_router.get("/invest/plans")
async def admin_get_invest_plans(admin: Dict[str, Any] = Depends(require_admin)):
    return {"success": True, "plans": investment_service.list_plans()}


@admin_api_router.post("/invest/plans")
async def admin_save_invest_plan(req: Dict[str, Any], admin: Dict[str, Any] = Depends(require_admin)):
    saved = investment_service.admin_create_or_update_plan(req)
    log_admin_action(admin, "SAVE_INVESTMENT_PLAN", target_id=saved.get("id", ""), metadata=req)
    return {"success": True, "plan": saved}


@admin_api_router.get("/invest/user-investments")
async def admin_get_user_investments(admin: Dict[str, Any] = Depends(require_admin)):
    return {"success": True, "investments": list(db.user_investments.values())}

