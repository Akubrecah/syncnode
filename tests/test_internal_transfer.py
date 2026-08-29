import pytest
from syncnode.common.types import AssetSymbol
from syncnode.common.errors import InsufficientFundsError, ValidationError
from syncnode.database.db import db
from syncnode.services.wallet import wallet_service
from syncnode.services.ledger import ledger_service
from syncnode.services.market_data import market_data_service


@pytest.fixture(autouse=True)
def setup_db():
    db.reset()


def test_instant_zero_fee_internal_transfer():
    alice = "usr_alice"
    bob = "usr_bob"

    wallet_service.credit_deposit(alice, AssetSymbol.USDT, "5000.00")
    trf = wallet_service.execute_internal_transfer(alice, bob, AssetSymbol.USDT, "1250.00")

    assert trf["status"] == "COMPLETED"
    assert trf["amount"] == "1250.00000000"

    bal_alice = ledger_service.get_user_asset_balance(alice, AssetSymbol.USDT)
    bal_bob = ledger_service.get_user_asset_balance(bob, AssetSymbol.USDT)

    assert bal_alice["available"] == "3750.00000000"
    assert bal_bob["available"] == "1250.00000000"


def test_reject_internal_transfer_insufficient_balance():
    alice = "usr_alice"
    bob = "usr_bob"

    with pytest.raises(InsufficientFundsError):
        wallet_service.execute_internal_transfer(alice, bob, AssetSymbol.USDT, "100.00")


def test_reject_internal_transfer_to_self():
    alice = "usr_alice"
    wallet_service.credit_deposit(alice, AssetSymbol.USDT, "500.00")

    with pytest.raises(ValidationError):
        wallet_service.execute_internal_transfer(alice, alice, AssetSymbol.USDT, "100.00")


@pytest.mark.asyncio
async def test_pull_live_market_data_tickers():
    tickers = await market_data_service.fetch_live_tickers()
    assert "BTC/USDT" in tickers
    assert "ETH/USDT" in tickers
