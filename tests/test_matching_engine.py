import pytest
from syncnode.common.types import AssetSymbol, OrderSide, OrderType, OrderStatus, SelfTradePrevention
from syncnode.database.db import db
from syncnode.services.matching_engine import matching_engine
from syncnode.services.wallet import wallet_service
from syncnode.services.ledger import ledger_service


@pytest.fixture(autouse=True)
def setup_db():
    db.reset()
    matching_engine.reset()


def test_deterministic_price_time_priority():
    buyer = "usr_buyer"
    seller1 = "usr_seller_1"
    seller2 = "usr_seller_2"

    # Fund accounts
    wallet_service.credit_deposit(buyer, AssetSymbol.USDT, "200000.00")
    wallet_service.credit_deposit(seller1, AssetSymbol.BTC, "1.00000000")
    wallet_service.credit_deposit(seller2, AssetSymbol.BTC, "1.00000000")

    # Seller 1 places at 95000
    res1 = matching_engine.place_order({
        "user_id": seller1,
        "market": "BTC/USDT",
        "side": OrderSide.SELL,
        "price": "95000.00",
        "quantity": "1.00000000"
    })
    assert res1["order"]["status"] == OrderStatus.NEW

    # Seller 2 places at 94000 (better price)
    res2 = matching_engine.place_order({
        "user_id": seller2,
        "market": "BTC/USDT",
        "side": OrderSide.SELL,
        "price": "94000.00",
        "quantity": "1.00000000"
    })
    assert res2["order"]["status"] == OrderStatus.NEW

    # Buyer places market/aggressive limit buy at 96000 for 1 BTC
    # Must match Seller 2 first due to better price (94000)
    buy_res = matching_engine.place_order({
        "user_id": buyer,
        "market": "BTC/USDT",
        "side": OrderSide.BUY,
        "price": "96000.00",
        "quantity": "1.00000000"
    })

    assert buy_res["order"]["status"] == OrderStatus.FILLED
    assert len(buy_res["trades"]) == 1
    assert float(buy_res["trades"][0]["price"]) == 94000.0
    assert buy_res["trades"][0]["seller_user_id"] == seller2


def test_post_only_order_cancellation_when_crossing():
    buyer = "usr_buyer_po"
    seller = "usr_seller_po"

    wallet_service.credit_deposit(seller, AssetSymbol.BTC, "1.00000000")
    wallet_service.credit_deposit(buyer, AssetSymbol.USDT, "100000.00")

    matching_engine.place_order({
        "user_id": seller,
        "market": "BTC/USDT",
        "side": OrderSide.SELL,
        "price": "95000.00",
        "quantity": "1.00000000"
    })

    # Buyer places Post-Only buy at 96000 (crosses book -> must be cancelled)
    po_res = matching_engine.place_order({
        "user_id": buyer,
        "market": "BTC/USDT",
        "side": OrderSide.BUY,
        "type": OrderType.POST_ONLY,
        "price": "96000.00",
        "quantity": "1.00000000"
    })

    assert po_res["order"]["status"] == OrderStatus.CANCELLED
    assert len(po_res["trades"]) == 0


def test_self_trade_prevention_cancel_maker():
    trader = "usr_self_trader"
    wallet_service.credit_deposit(trader, AssetSymbol.BTC, "1.00000000")
    wallet_service.credit_deposit(trader, AssetSymbol.USDT, "100000.00")

    # Maker sell order
    matching_engine.place_order({
        "user_id": trader,
        "market": "BTC/USDT",
        "side": OrderSide.SELL,
        "price": "95000.00",
        "quantity": "1.00000000"
    })

    # Taker buy order from same user with CANCEL_MAKER
    res = matching_engine.place_order({
        "user_id": trader,
        "market": "BTC/USDT",
        "side": OrderSide.BUY,
        "price": "95000.00",
        "quantity": "1.00000000",
        "self_trade_prevention": SelfTradePrevention.CANCEL_MAKER
    })

    assert len(res["trades"]) == 0
