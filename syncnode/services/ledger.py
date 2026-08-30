import time
import uuid
from typing import List, Dict, Any, Optional
from syncnode.common.types import AssetSymbol, AccountType
from syncnode.common.errors import FinancialInvariantError, InsufficientFundsError
from syncnode.common.decimal_util import (
    to_decimal,
    format_decimal,
    add_decimals,
    sub_decimals,
    gt_decimal,
    gte_decimal,
    lt_decimal,
    eq_decimal
)
from syncnode.database.db import db
from syncnode.database.supabase_client import supabase_client
from syncnode.common.logger import Logger

logger = Logger("LedgerService")


class LedgerService:
    def get_or_create_account(self, account_type: AccountType, asset: AssetSymbol, user_id: Optional[str] = None) -> Dict[str, Any]:
        acc_id = f"acc_{user_id or 'sys'}_{account_type.value}_{asset.value}"
        if acc_id not in db.accounts:
            acc_data = {
                "id": acc_id,
                "user_id": user_id,
                "type": account_type.value if hasattr(account_type, "value") else str(account_type),
                "asset": asset.value if hasattr(asset, "value") else str(asset),
                "balance": "0.00000000",
                "created_at": int(time.time() * 1000),
                "updated_at": int(time.time() * 1000)
            }
            db.accounts[acc_id] = acc_data
            supabase_client.queue_upsert("accounts", acc_data)
        return db.accounts[acc_id]

    def record_transaction(self, idempotency_key: str, description: str, entries: List[Dict[str, Any]], metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        if idempotency_key in db.idempotency_keys:
            # Return existing transaction if duplicate request
            for tx in db.ledger_transactions.values():
                if tx.get("idempotency_key") == idempotency_key:
                    return tx

        # Group entries by asset and verify that sum(debits) == sum(credits)
        asset_sums: Dict[str, Dict[str, Any]] = {}
        for entry in entries:
            asset = entry["asset"]
            asset_str = asset.value if hasattr(asset, "value") else str(asset)
            if asset_str not in asset_sums:
                asset_sums[asset_str] = {"debits": to_decimal(0), "credits": to_decimal(0)}
            asset_sums[asset_str]["debits"] += to_decimal(entry.get("debit", 0))
            asset_sums[asset_str]["credits"] += to_decimal(entry.get("credit", 0))

        for asset_name, sums in asset_sums.items():
            if sums["debits"] != sums["credits"]:
                raise FinancialInvariantError(
                    f"Double-entry invariant violated for {asset_name}: total debits {sums['debits']} != total credits {sums['credits']}"
                )

        # Pre-verify that debiting accounts have sufficient funds
        for entry in entries:
            debit_amt = to_decimal(entry.get("debit", 0))
            if debit_amt > 0:
                acc_id = entry["account_id"]
                current_acc = db.accounts.get(acc_id)
                if current_acc and current_acc["type"] != AccountType.EXCHANGE_VAULT:
                    current_bal = to_decimal(current_acc["balance"])
                    if current_bal < debit_amt:
                        raise InsufficientFundsError(f"Insufficient funds in account {acc_id}: balance {current_bal} < debit {debit_amt}")

        # Execute balance updates
        tx_id = f"tx_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
        recorded_entries = []

        for entry in entries:
            acc_id = entry["account_id"]
            debit_amt = to_decimal(entry.get("debit", 0))
            credit_amt = to_decimal(entry.get("credit", 0))
            account = db.accounts.get(acc_id)
            if not account:
                raise FinancialInvariantError(f"Account {acc_id} does not exist")

            bal = to_decimal(account["balance"])
            if account["type"] == AccountType.EXCHANGE_VAULT:
                # Vault is an asset account: debits increase vault assets, credits decrease
                new_bal = bal + debit_amt - credit_amt
            else:
                # User / liability accounts: credits increase, debits decrease
                new_bal = bal + credit_amt - debit_amt

            if new_bal < 0:
                raise FinancialInvariantError(f"Negative balance invariant violated for account {acc_id}: {new_bal}")

            account["balance"] = format_decimal(new_bal)
            account["updated_at"] = int(time.time() * 1000)

            # Persist updated balance to Supabase PostgreSQL table
            acc_type_val = account["type"].value if hasattr(account["type"], "value") else str(account["type"])
            acc_asset_val = account["asset"].value if hasattr(account["asset"], "value") else str(account["asset"])
            supabase_client.queue_upsert("accounts", {
                "id": acc_id,
                "user_id": account.get("user_id"),
                "type": acc_type_val,
                "asset": acc_asset_val,
                "balance": format_decimal(new_bal),
                "created_at": account.get("created_at", int(time.time() * 1000)),
                "updated_at": account["updated_at"]
            })

            j_id = f"je_{uuid.uuid4().hex[:12]}"
            journal_entry = {
                "id": j_id,
                "transaction_id": tx_id,
                "account_id": acc_id,
                "asset": entry["asset"].value if hasattr(entry["asset"], "value") else str(entry["asset"]),
                "debit": format_decimal(debit_amt),
                "credit": format_decimal(credit_amt),
                "created_at": int(time.time() * 1000)
            }
            db.journal_entries[j_id] = journal_entry
            recorded_entries.append(journal_entry)
            supabase_client.queue_upsert("journal_entries", journal_entry)

        tx_record = {
            "id": tx_id,
            "idempotency_key": idempotency_key,
            "description": description,
            "entries": recorded_entries,
            "metadata": metadata or {},
            "created_at": int(time.time() * 1000)
        }
        db.ledger_transactions[tx_id] = tx_record
        db.idempotency_keys.add(idempotency_key)
        supabase_client.queue_upsert("ledger_transactions", tx_record)
        return tx_record

    def get_user_asset_balance(self, user_id: str, asset: AssetSymbol) -> Dict[str, str]:
        avail_acc = self.get_or_create_account(AccountType.USER_AVAILABLE, asset, user_id)
        locked_acc = self.get_or_create_account(AccountType.USER_LOCKED, asset, user_id)
        available = avail_acc["balance"]
        locked = locked_acc["balance"]
        total = add_decimals(available, locked)
        return {
            "available": available,
            "locked": locked,
            "total": total
        }

    def get_user_balances(self, user_id: str) -> List[Dict[str, Any]]:
        balances = []
        for asset in AssetSymbol:
            bal_info = self.get_user_asset_balance(user_id, asset)
            balances.append({
                "asset": asset.value,
                "available": bal_info["available"],
                "locked": bal_info["locked"],
                "total": bal_info["total"]
            })
        return balances

    def lock_user_funds(self, user_id: str, asset: AssetSymbol, amount: str, reason: str) -> Dict[str, Any]:
        avail_acc = self.get_or_create_account(AccountType.USER_AVAILABLE, asset, user_id)
        locked_acc = self.get_or_create_account(AccountType.USER_LOCKED, asset, user_id)
        idemp = f"lock_{user_id}_{asset.value}_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
        return self.record_transaction(
            idempotency_key=idemp,
            description=f"Lock funds: {reason}",
            entries=[
                {"account_id": avail_acc["id"], "asset": asset, "debit": amount, "credit": "0.00000000"},
                {"account_id": locked_acc["id"], "asset": asset, "debit": "0.00000000", "credit": amount}
            ]
        )

    def unlock_user_funds(self, user_id: str, asset: AssetSymbol, amount: str, reason: str) -> Dict[str, Any]:
        avail_acc = self.get_or_create_account(AccountType.USER_AVAILABLE, asset, user_id)
        locked_acc = self.get_or_create_account(AccountType.USER_LOCKED, asset, user_id)
        idemp = f"unlock_{user_id}_{asset.value}_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
        return self.record_transaction(
            idempotency_key=idemp,
            description=f"Unlock funds: {reason}",
            entries=[
                {"account_id": locked_acc["id"], "asset": asset, "debit": amount, "credit": "0.00000000"},
                {"account_id": avail_acc["id"], "asset": asset, "debit": "0.00000000", "credit": amount}
            ]
        )

    def verify_proof_of_reserves(self) -> Dict[str, Any]:
        solvency_report = {}
        assets_audit = {}
        all_solvent = True
        now = int(time.time() * 1000)

        for asset in AssetSymbol:
            vault_acc = self.get_or_create_account(AccountType.EXCHANGE_VAULT, asset)
            vault_balance = to_decimal(vault_acc["balance"])

            # Sum all customer obligations (Available + Locked + P2P Escrow)
            customer_obligations = to_decimal(0)
            for acc in db.accounts.values():
                if acc["asset"] == asset and acc["type"] in [AccountType.USER_AVAILABLE, AccountType.USER_LOCKED, AccountType.P2P_ESCROW]:
                    customer_obligations += to_decimal(acc["balance"])

            surplus_dec = vault_balance - customer_obligations
            ratio_dec = (vault_balance / customer_obligations) if customer_obligations > 0 else to_decimal(1)
            is_asset_solvent = vault_balance >= customer_obligations
            if not is_asset_solvent:
                all_solvent = False

            solvency_report[asset.value] = {
                "vault_reserve": format_decimal(vault_balance),
                "customer_liabilities": format_decimal(customer_obligations),
                "collateral_ratio_pct": format_decimal(ratio_dec * 100, 2),
                "is_solvent": is_asset_solvent
            }

            assets_audit[asset.value] = {
                "totalAssets": format_decimal(vault_balance),
                "totalLiabilities": format_decimal(customer_obligations),
                "surplus": format_decimal(surplus_dec),
                "ratio": format_decimal(ratio_dec, 4)
            }

        audit_payload = {
            "isSolvent": all_solvent,
            "assets": assets_audit,
            "timestamp": now
        }

        return {
            "proofOfReserves": solvency_report,
            "audit": audit_payload,
            "isSolvent": all_solvent,
            "timestamp": now,
            **solvency_report
        }

    def get_detailed_treasury_summary(self) -> Dict[str, Any]:
        treasury = {}
        fees_24h = {}
        now = int(time.time() * 1000)

        for asset in AssetSymbol:
            vault_acc = self.get_or_create_account(AccountType.EXCHANGE_VAULT, asset)
            fee_acc = self.get_or_create_account(AccountType.FEE_INCOME, asset)
            vault_dec = to_decimal(vault_acc["balance"])
            fee_dec = to_decimal(fee_acc["balance"])

            avail_dec = to_decimal(0)
            locked_dec = to_decimal(0)
            p2p_dec = to_decimal(0)
            for acc in db.accounts.values():
                if acc["asset"] == asset:
                    if acc["type"] == AccountType.USER_AVAILABLE:
                        avail_dec += to_decimal(acc["balance"])
                    elif acc["type"] == AccountType.USER_LOCKED:
                        locked_dec += to_decimal(acc["balance"])
                    elif acc["type"] == AccountType.P2P_ESCROW:
                        p2p_dec += to_decimal(acc["balance"])

            total_liab = avail_dec + locked_dec + p2p_dec
            is_solvent = vault_dec >= total_liab
            ratio_pct = ((vault_dec / total_liab) * 100) if total_liab > 0 else to_decimal(100)

            # Cold storage partition simulation (80% cold, 20% hot in vault)
            hot_dec = vault_dec * to_decimal("0.25")
            cold_dec = vault_dec - hot_dec

            treasury[asset.value] = {
                "hotWallet": format_decimal(hot_dec),
                "coldStorage": format_decimal(cold_dec),
                "totalExchangeAssets": format_decimal(vault_dec),
                "liabilities": {
                    "available": format_decimal(avail_dec),
                    "locked": format_decimal(locked_dec),
                    "pendingWithdrawal": "0.00000000",
                    "p2pEscrow": format_decimal(p2p_dec),
                    "total": format_decimal(total_liab)
                },
                "revenue": {
                    "tradingFees": format_decimal(fee_dec),
                    "withdrawalFees": "0.00000000"
                },
                "reserveRatio": f"{format_decimal(ratio_pct, 2)}%",
                "isSolvent": is_solvent,
                "withdrawalCapacityRatio": f"{format_decimal(ratio_pct, 1)}%"
            }

            fees_24h[asset.value] = {
                "baseFees": format_decimal(fee_dec),
                "quoteFees": "0.00000000"
            }

        return {
            "success": True,
            "treasury": treasury,
            "fees24h": fees_24h,
            "timestamp": now
        }

    def search_journal_entries(self, user_id: Optional[str] = None, asset: Optional[str] = None, account_id: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        entries = []
        for tx_id, tx in db.ledger_transactions.items():
            tx_entries = tx.get("entries", [])
            for e in tx_entries:
                acc_id = e.get("account_id", "")
                e_asset = e.get("asset")
                e_asset_str = e_asset.value if hasattr(e_asset, "value") else str(e_asset)

                if user_id and f"acc_{user_id}_" not in acc_id:
                    continue
                if asset and e_asset_str.upper() != asset.upper():
                    continue
                if account_id and acc_id != account_id:
                    continue

                entries.append({
                    "transaction_id": tx_id,
                    "idempotency_key": tx.get("idempotency_key"),
                    "description": tx.get("description"),
                    "account_id": acc_id,
                    "asset": e_asset_str,
                    "debit": e.get("debit", "0.00000000"),
                    "credit": e.get("credit", "0.00000000"),
                    "created_at": tx.get("created_at")
                })

        entries.sort(key=lambda x: x.get("created_at", 0), reverse=True)
        return entries[offset:offset + limit]


ledger_service = LedgerService()

