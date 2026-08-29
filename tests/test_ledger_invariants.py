import pytest
from syncnode.common.types import AssetSymbol, AccountType
from syncnode.common.errors import FinancialInvariantError, InsufficientFundsError
from syncnode.database.db import db
from syncnode.services.ledger import ledger_service


@pytest.fixture(autouse=True)
def setup_db():
    db.reset()


def test_strict_debits_equal_credits_balance_per_asset():
    user_a = "usr_test_a"
    user_b = "usr_test_b"
    acc_a = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, AssetSymbol.BTC, user_a)
    acc_b = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, AssetSymbol.BTC, user_b)
    vault = ledger_service.get_or_create_account(AccountType.EXCHANGE_VAULT, AssetSymbol.BTC)

    # Initial deposit
    ledger_service.record_transaction(
        idempotency_key="init_dep_a",
        description="Deposit to A",
        entries=[
            {"account_id": vault["id"], "asset": AssetSymbol.BTC, "debit": "10.00000000", "credit": "0.00000000"},
            {"account_id": acc_a["id"], "asset": AssetSymbol.BTC, "debit": "0.00000000", "credit": "10.00000000"}
        ]
    )

    # Transfer A -> B
    ledger_service.record_transaction(
        idempotency_key="tx_a_to_b",
        description="Transfer A to B",
        entries=[
            {"account_id": acc_a["id"], "asset": AssetSymbol.BTC, "debit": "3.50000000", "credit": "0.00000000"},
            {"account_id": acc_b["id"], "asset": AssetSymbol.BTC, "debit": "0.00000000", "credit": "3.50000000"}
        ]
    )

    bal_a = ledger_service.get_user_asset_balance(user_a, AssetSymbol.BTC)
    bal_b = ledger_service.get_user_asset_balance(user_b, AssetSymbol.BTC)
    assert bal_a["available"] == "6.50000000"
    assert bal_b["available"] == "3.50000000"


def test_reject_unbalanced_transactions():
    acc_a = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, AssetSymbol.USDT, "usr_1")
    acc_b = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, AssetSymbol.USDT, "usr_2")

    with pytest.raises(FinancialInvariantError):
        ledger_service.record_transaction(
            idempotency_key="unbalanced_tx_1",
            description="Broken transaction",
            entries=[
                {"account_id": acc_a["id"], "asset": AssetSymbol.USDT, "debit": "100.00000000", "credit": "0.00000000"},
                {"account_id": acc_b["id"], "asset": AssetSymbol.USDT, "debit": "0.00000000", "credit": "90.00000000"}
            ]
        )


def test_prevent_negative_balances():
    acc_a = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, AssetSymbol.ETH, "usr_empty")
    acc_b = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, AssetSymbol.ETH, "usr_target")

    with pytest.raises(InsufficientFundsError):
        ledger_service.record_transaction(
            idempotency_key="overdraft_tx",
            description="Attempt to overdraft",
            entries=[
                {"account_id": acc_a["id"], "asset": AssetSymbol.ETH, "debit": "1.00000000", "credit": "0.00000000"},
                {"account_id": acc_b["id"], "asset": AssetSymbol.ETH, "debit": "0.00000000", "credit": "1.00000000"}
            ]
        )


def test_maintain_100_percent_solvency_in_proof_of_reserves():
    vault = ledger_service.get_or_create_account(AccountType.EXCHANGE_VAULT, AssetSymbol.BTC)
    user_acc = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, AssetSymbol.BTC, "usr_cust")

    ledger_service.record_transaction(
        idempotency_key="por_deposit",
        description="Customer deposit",
        entries=[
            {"account_id": vault["id"], "asset": AssetSymbol.BTC, "debit": "5.00000000", "credit": "0.00000000"},
            {"account_id": user_acc["id"], "asset": AssetSymbol.BTC, "debit": "0.00000000", "credit": "5.00000000"}
        ]
    )

    por = ledger_service.verify_proof_of_reserves()
    btc_por = por["BTC"]
    assert btc_por["is_solvent"] is True
    assert float(btc_por["collateral_ratio_pct"]) >= 100.0
