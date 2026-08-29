import pytest
import time
from fastapi.testclient import TestClient
from syncnode.server import app
from syncnode.database.db import db
from syncnode.database.repository import user_repository
from syncnode.security.crypto import hash_password, sign_token
from syncnode.common.types import AssetSymbol, AdminRole, KycTier, KycStatus, OrderSide, OrderType, AccountType
from syncnode.services.ledger import ledger_service
from syncnode.services.wallet import wallet_service
from syncnode.services.matching_engine import matching_engine
from syncnode.services.p2p import p2p_service


@pytest.fixture(autouse=True)
def setup_db():
    db.reset()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_headers():
    admin_id = "admin_super_exec_1"
    token = sign_token({"user_id": admin_id, "email": "poweldayck@gmail.com", "admin_roles": ["SUPER_ADMIN"]})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def regular_user_headers():
    user_id = "usr_regular_123"
    user = {
        "id": user_id,
        "email": "user@example.com",
        "full_name": "Regular Trader",
        "password_hash": hash_password("Password123!"),
        "is_totp_enabled": False,
        "kyc_tier": KycTier.TIER_1_BASIC.value,
        "kyc_status": KycStatus.APPROVED.value,
        "admin_roles": [],
        "is_suspended": False,
        "is_withdrawal_suspended": False,
        "created_at": int(time.time() * 1000),
        "updated_at": int(time.time() * 1000)
    }
    user_repository.save(user)
    token = sign_token({"user_id": user_id, "email": "user@example.com", "admin_roles": []})
    return {"Authorization": f"Bearer {token}"}



# --------------------------------------------------------------------------
# 1. RBAC & Security Gating
# --------------------------------------------------------------------------
def test_admin_routes_reject_unauthenticated(client):
    res = client.get("/api/v1/admin/stats")
    assert res.status_code == 401


def test_admin_routes_reject_non_admin_users(client, regular_user_headers):
    res = client.get("/api/v1/admin/stats", headers=regular_user_headers)
    assert res.status_code == 403


def test_admin_stats_and_system_health(client, admin_headers):
    stats_res = client.get("/api/v1/admin/stats", headers=admin_headers)
    assert stats_res.status_code == 200
    assert stats_res.json()["success"] is True
    assert "totalUsers" in stats_res.json()["stats"]

    health_res = client.get("/api/v1/admin/system/health", headers=admin_headers)
    assert health_res.status_code == 200
    health_data = health_res.json()["health"]
    assert "services" in health_data
    assert "metrics" in health_data
    assert "circuitBreakers" in health_data


# --------------------------------------------------------------------------
# 2. Circuit Breakers & Risk Controls
# --------------------------------------------------------------------------
def test_circuit_breakers_full_lifecycle(client, admin_headers):
    # Get initial
    get_res = client.get("/api/v1/admin/circuit-breakers", headers=admin_headers)
    assert get_res.status_code == 200

    # Global halt
    halt_res = client.post("/api/v1/admin/circuit-breakers/global-halt", json={"halt": True, "reason": "Emergency volatility"}, headers=admin_headers)
    assert halt_res.status_code == 200
    assert halt_res.json()["circuitBreakers"]["isGlobalTradingHalted"] is True

    # Market halt
    m_halt_res = client.post("/api/v1/admin/circuit-breakers/market-halt", json={"symbol": "BTC-USDT", "halt": True}, headers=admin_headers)
    assert m_halt_res.status_code == 200
    assert m_halt_res.json()["circuitBreakers"]["haltedMarkets"]["BTC-USDT"] is True

    # Withdrawals pause
    w_res = client.post("/api/v1/admin/circuit-breakers/withdrawals-pause", json={"pause": True}, headers=admin_headers)
    assert w_res.status_code == 200
    assert w_res.json()["circuitBreakers"]["isWithdrawalsPaused"] is True

    # Deposits pause
    d_res = client.post("/api/v1/admin/circuit-breakers/deposits-pause", json={"pause": True}, headers=admin_headers)
    assert d_res.status_code == 200
    assert d_res.json()["circuitBreakers"]["isDepositsPaused"] is True

    # Maintenance
    maint_res = client.post("/api/v1/admin/circuit-breakers/maintenance", json={"enabled": True}, headers=admin_headers)
    assert maint_res.status_code == 200
    assert maint_res.json()["circuitBreakers"]["emergencyMaintenance"] is True


# --------------------------------------------------------------------------
# 3. User Intelligence, Suspensions & Balance Adjustments
# --------------------------------------------------------------------------
def test_user_management_and_balance_adjustment(client, admin_headers):
    # Seed user
    target_user_id = "usr_target_456"
    target_user = {
        "id": target_user_id,
        "email": "target@exchange.com",
        "full_name": "Target User",
        "password_hash": hash_password("Password123!"),
        "is_totp_enabled": False,
        "kyc_tier": KycTier.TIER_1_BASIC.value,
        "kyc_status": KycStatus.PENDING.value,
        "admin_roles": [],
        "is_suspended": False,
        "is_withdrawal_suspended": False,
        "created_at": int(time.time() * 1000),
        "updated_at": int(time.time() * 1000)
    }
    user_repository.save(target_user)

    # List users
    list_res = client.get("/api/v1/admin/users?search=target", headers=admin_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()["users"]) >= 1

    # Get single user detail
    detail_res = client.get(f"/api/v1/admin/users/{target_user_id}", headers=admin_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["user"]["email"] == "target@exchange.com"

    # Suspend user
    sus_res = client.post(f"/api/v1/admin/users/{target_user_id}/suspend", headers=admin_headers)
    assert sus_res.status_code == 200
    assert sus_res.json()["isSuspended"] is True
    assert user_repository.find_by_id(target_user_id)["is_suspended"] is True

    # Unsuspend user
    unsus_res = client.post(f"/api/v1/admin/users/{target_user_id}/unsuspend", headers=admin_headers)
    assert unsus_res.status_code == 200
    assert unsus_res.json()["isSuspended"] is False

    # Adjust balance (Credit 1.5 BTC)
    credit_res = client.post(
        f"/api/v1/admin/users/{target_user_id}/adjust-balance",
        json={"asset": "BTC", "operation": "CREDIT", "amount": "1.50000000", "reason": "Institutional Onboarding Bonus"},
        headers=admin_headers
    )
    assert credit_res.status_code == 200
    bal_after = ledger_service.get_user_asset_balance(target_user_id, AssetSymbol.BTC)
    assert bal_after["available"] == "1.50000000"

    # KYC review approval
    kyc_pending = client.get("/api/v1/admin/kyc/pending", headers=admin_headers)
    assert kyc_pending.status_code == 200

    kyc_review = client.post(
        "/api/v1/admin/kyc/review",
        json={"userId": target_user_id, "approved": True, "tier": "TIER_2_VERIFIED"},
        headers=admin_headers
    )
    assert kyc_review.status_code == 200
    assert user_repository.find_by_id(target_user_id)["kyc_status"] == KycStatus.APPROVED.value


# --------------------------------------------------------------------------
# 4. Trading Surveillance & Administrative Order Cancellation
# --------------------------------------------------------------------------
def test_trading_surveillance_and_order_cancellation(client, admin_headers):
    # Fund user and place order
    trader_id = "usr_trader_789"
    user_repository.save({
        "id": trader_id,
        "email": "trader@exchange.com",
        "password_hash": hash_password("Pass123!"),
        "admin_roles": [],
        "created_at": int(time.time() * 1000)
    })
    wallet_service.credit_deposit(trader_id, AssetSymbol.USDT, "50000.00")

    order_res = matching_engine.place_order({
        "user_id": trader_id,
        "market": "BTC/USDT",
        "side": OrderSide.BUY,
        "type": OrderType.LIMIT,
        "price": "90000.00",
        "quantity": "0.10000000"
    })
    order_id = order_res["order"]["id"]

    # List orders in admin
    admin_orders = client.get(f"/api/v1/admin/orders?symbol=BTC-USDT", headers=admin_headers)
    assert admin_orders.status_code == 200
    assert any(o["id"] == order_id for o in admin_orders.json()["orders"])

    # Admin cancel order
    cancel_res = client.post(
        f"/api/v1/admin/orders/{order_id}/cancel",
        json={"reason": "Spoofing surveillance intervention"},
        headers=admin_headers
    )
    assert cancel_res.status_code == 200
    assert db.orders[order_id]["status"] == "CANCELLED"

    # Verify locked USDT funds refunded back to available
    bal = ledger_service.get_user_asset_balance(trader_id, AssetSymbol.USDT)
    assert bal["available"] == "50000.00000000"


# --------------------------------------------------------------------------
# 5. Finance, Proof of Reserves & Treasury
# --------------------------------------------------------------------------
def test_proof_of_reserves_and_treasury_solvency(client, admin_headers):
    # Solvency report
    por_res = client.get("/api/v1/admin/proof-of-reserves", headers=admin_headers)
    assert por_res.status_code == 200
    assert por_res.json()["success"] is True
    assert "proofOfReserves" in por_res.json()
    assert "audit" in por_res.json()

    # Treasury balances
    treasury_res = client.get("/api/v1/admin/wallet/balances", headers=admin_headers)
    assert treasury_res.status_code == 200
    assert "treasury" in treasury_res.json()

    # Ledger entries
    entries_res = client.get("/api/v1/admin/ledger/entries", headers=admin_headers)
    assert entries_res.status_code == 200
    assert "entries" in entries_res.json()


# --------------------------------------------------------------------------
# 6. Wallet Operations (Withdrawal Approval / Rejection Lifecycle)
# --------------------------------------------------------------------------
def test_withdrawal_approval_and_rejection_workflows(client, admin_headers):
    user_id = "usr_wdr_user"
    user_repository.save({"id": user_id, "email": "wdr@exchange.com", "admin_roles": []})
    wallet_service.credit_deposit(user_id, AssetSymbol.SOL, "100.00")

    # Request withdrawal 1
    w1 = wallet_service.request_withdrawal(user_id, AssetSymbol.SOL, "20.00", "0xSolAddress1")
    w1_id = w1["id"]

    # Request withdrawal 2
    w2 = wallet_service.request_withdrawal(user_id, AssetSymbol.SOL, "30.00", "0xSolAddress2")
    w2_id = w2["id"]

    # Admin approve withdrawal 1
    appr_res = client.post(f"/api/v1/admin/withdrawals/{w1_id}/approve", headers=admin_headers)
    assert appr_res.status_code == 200
    assert db.withdrawals[w1_id]["status"] == "APPROVED"

    # Admin reject withdrawal 2 (must refund locked 30 SOL back to available)
    rej_res = client.post(
        f"/api/v1/admin/withdrawals/{w2_id}/reject",
        json={"reason": "Invalid destination address format"},
        headers=admin_headers
    )
    assert rej_res.status_code == 200
    assert db.withdrawals[w2_id]["status"] == "REJECTED"

    # Check user balance: 100 - 20 (approved) = 80 available
    user_bal = ledger_service.get_user_asset_balance(user_id, AssetSymbol.SOL)
    assert user_bal["available"] == "80.00000000"


# --------------------------------------------------------------------------
# 7. P2P Dispute Resolution
# --------------------------------------------------------------------------
def test_p2p_dispute_resolution(client, admin_headers):
    merchant_id = "usr_merchant_p2p"
    buyer_id = "usr_buyer_p2p"
    user_repository.save({"id": merchant_id, "email": "merchant@p2p.com", "admin_roles": []})
    user_repository.save({"id": buyer_id, "email": "buyer@p2p.com", "admin_roles": []})

    wallet_service.credit_deposit(merchant_id, AssetSymbol.USDT, "1000.00")

    # Create sell ad
    ad = p2p_service.create_ad(merchant_id, {
        "type": "SELL",
        "asset": "USDT",
        "price": "1.00",
        "available_amount": "500.00",
        "min_limit": "50.00",
        "max_limit": "500.00",
        "payment_methods": ["Bank Transfer"]
    })

    # Initiate trade
    trade = p2p_service.initiate_trade({
        "ad_id": ad["id"],
        "buyer_user_id": buyer_id,
        "crypto_amount": "200.00"
    })
    trade_id = trade["id"]

    # Dispute trade
    p2p_service.dispute_trade(trade_id, buyer_id, "Seller not releasing after payment proof uploaded")

    # Admin dispute resolution: RELEASE to buyer
    resolve_res = client.post(
        f"/api/v1/admin/p2p/escrows/{trade_id}/resolve",
        json={"action": "RELEASE", "reason": "Verified bank payment receipt"},
        headers=admin_headers
    )
    assert resolve_res.status_code == 200
    assert db.p2p_trades[trade_id]["status"] == "RELEASED"

    # Buyer should now have 200 USDT
    buyer_bal = ledger_service.get_user_asset_balance(buyer_id, AssetSymbol.USDT)
    assert buyer_bal["available"] == "200.00000000"


# --------------------------------------------------------------------------
# 8. Audit Logs & Export
# --------------------------------------------------------------------------
def test_audit_logs_and_csv_export(client, admin_headers):
    # Perform an administrative action to record audit event
    client.post(
        "/api/v1/admin/circuit-breakers/global-halt",
        json={"halt": True, "reason": "Test audit trigger"},
        headers=admin_headers
    )

    audit_res = client.get("/api/v1/admin/audit-logs", headers=admin_headers)
    assert audit_res.status_code == 200
    assert len(audit_res.json()["auditLogs"]) >= 1

    export_res = client.get("/api/v1/admin/audit-logs/export", headers=admin_headers)
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers.get("content-type", "")
    assert "Timestamp,Event ID" in export_res.text

