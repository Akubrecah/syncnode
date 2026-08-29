import pytest
from syncnode.common.types import AssetSymbol, OrderSide, OrderType, OrderStatus
from syncnode.database.db import db
from syncnode.services.wallet import wallet_service
from syncnode.services.compliance import compliance_service
from syncnode.services.matching_engine import matching_engine
from syncnode.services.p2p import p2p_service
from syncnode.services.ledger import ledger_service


@pytest.fixture(autouse=True)
def setup_db():
    db.reset()
    matching_engine.reset()


def test_e2e_exchange_lifecycle():
    alice = "usr_alice"
    bob = "usr_bob"

    # 1. Deposits
    wallet_service.credit_deposit(alice, AssetSymbol.BTC, "1.00000000")
    wallet_service.credit_deposit(bob, AssetSymbol.USDT, "100000.00")

    # 2. KYC Submission
    compliance_service.submit_kyc(alice, {"fullName": "Alice Smith", "dateOfBirth": "1990-01-01", "country": "US", "idNumber": "A123"})
    compliance_service.review_kyc(alice, True)

    # 3. Order Book & Matching
    matching_engine.place_order({
        "user_id": alice,
        "market": "BTC/USDT",
        "side": OrderSide.SELL,
        "price": "95000.00",
        "quantity": "0.50000000"
    })

    buy_res = matching_engine.place_order({
        "user_id": bob,
        "market": "BTC/USDT",
        "side": OrderSide.BUY,
        "price": "95000.00",
        "quantity": "0.50000000"
    })

    assert buy_res["order"]["status"] == OrderStatus.FILLED
    assert len(buy_res["trades"]) == 1

    # 4. P2P Escrow Flow: Bob sells 0.1 BTC to Alice via P2P
    ad = p2p_service.create_ad(bob, {
        "type": "SELL",
        "asset": "BTC",
        "fiat_currency": "USD",
        "price": "95000.00",
        "available_amount": "0.10000000"
    })

    trade = p2p_service.initiate_trade({
        "ad_id": ad["id"],
        "buyer_user_id": alice,
        "crypto_amount": "0.10000000"
    })
    assert trade["status"] == "ESCROW_LOCKED"

    # Alice marks paid
    p2p_service.mark_paid(trade["id"], alice)

    # Bob releases escrow
    p2p_service.release_escrow(trade["id"], bob)

    # 5. Withdrawal: Alice withdraws remaining BTC (Pending admin review -> Approved)
    wdr = wallet_service.request_withdrawal(alice, AssetSymbol.BTC, "0.50000000", "0xdeadbeef123456789")
    assert wdr["status"] == "PENDING_APPROVAL"
    approved_wdr = wallet_service.approve_withdrawal(wdr["id"], "admin_super_exec_1")
    assert approved_wdr["status"] == "APPROVED"

    # Verify Proof of Reserves solvency remains 100%
    por = ledger_service.verify_proof_of_reserves()
    assert por["BTC"]["is_solvent"] is True
    assert por["USDT"]["is_solvent"] is True
