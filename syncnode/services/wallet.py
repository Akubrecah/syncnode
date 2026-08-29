import time
import uuid
from typing import Dict, Any, Optional
from syncnode.common.types import AssetSymbol, AccountType
from syncnode.common.errors import ValidationError, InsufficientFundsError, NotFoundError
from syncnode.common.decimal_util import format_decimal, to_decimal
from syncnode.database.db import db
from syncnode.services.ledger import ledger_service
from syncnode.common.logger import Logger

logger = Logger("WalletService")


class WalletService:
    def credit_deposit(self, user_id: str, asset: AssetSymbol, amount: str, tx_hash: Optional[str] = None) -> Dict[str, Any]:
        amount_str = format_decimal(amount)
        deposit_id = f"dep_{int(time.time()*1000)}_{uuid.uuid4().hex[:7]}"
        tx_hash_val = tx_hash or f"0x{uuid.uuid4().hex}"

        vault_acc = ledger_service.get_or_create_account(AccountType.EXCHANGE_VAULT, asset)
        user_avail = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, asset, user_id)

        # Double-entry: Exchange Vault receives external asset (debit), User Available balance credited (credit)
        ledger_service.record_transaction(
            idempotency_key=f"dep_ledger_{deposit_id}",
            description=f"Deposit credit: {amount_str} {asset.value} for user {user_id}",
            entries=[
                {"account_id": vault_acc["id"], "asset": asset, "debit": amount_str, "credit": "0.00000000"},
                {"account_id": user_avail["id"], "asset": asset, "debit": "0.00000000", "credit": amount_str}
            ],
            metadata={"deposit_id": deposit_id, "tx_hash": tx_hash_val}
        )

        deposit_record = {
            "id": deposit_id,
            "user_id": user_id,
            "asset": asset.value,
            "amount": amount_str,
            "tx_hash": tx_hash_val,
            "status": "CONFIRMED",
            "created_at": int(time.time() * 1000)
        }
        db.deposits[deposit_id] = deposit_record
        logger.info(f"Credited deposit {deposit_id}: {amount_str} {asset.value} to user {user_id}")
        return deposit_record

    def request_withdrawal(self, user_id: str, asset: AssetSymbol, amount: str, destination_address: str) -> Dict[str, Any]:
        amount_str = format_decimal(amount)
        if to_decimal(amount_str) <= 0:
            raise ValidationError("Withdrawal amount must be greater than zero")

        bal = ledger_service.get_user_asset_balance(user_id, asset)
        if to_decimal(bal["available"]) < to_decimal(amount_str):
            raise InsufficientFundsError(f"Insufficient available {asset.value} balance for withdrawal")

        withdrawal_id = f"wdr_{int(time.time()*1000)}_{uuid.uuid4().hex[:7]}"
        tx_hash_val = f"0x{uuid.uuid4().hex}"

        user_avail = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, asset, user_id)
        user_locked = ledger_service.get_or_create_account(AccountType.USER_LOCKED, asset, user_id)

        # Double-entry: Lock funds during administrative review
        ledger_service.record_transaction(
            idempotency_key=f"wdr_lock_{withdrawal_id}",
            description=f"Withdrawal request pending admin approval: {amount_str} {asset.value} for user {user_id}",
            entries=[
                {"account_id": user_avail["id"], "asset": asset, "debit": amount_str, "credit": "0.00000000"},
                {"account_id": user_locked["id"], "asset": asset, "debit": "0.00000000", "credit": amount_str}
            ],
            metadata={"withdrawal_id": withdrawal_id, "destination_address": destination_address}
        )

        withdrawal_record = {
            "id": withdrawal_id,
            "user_id": user_id,
            "asset": asset.value,
            "amount": amount_str,
            "fee": "0.00000000",
            "destination_address": destination_address,
            "tx_hash": tx_hash_val,
            "status": "PENDING_APPROVAL",
            "rejection_reason": None,
            "approved_by": None,
            "approved_at": None,
            "created_at": int(time.time() * 1000)
        }
        db.withdrawals[withdrawal_id] = withdrawal_record
        logger.info(f"Withdrawal {withdrawal_id} requested: {amount_str} {asset.value} - status PENDING_APPROVAL")
        return withdrawal_record

    def approve_withdrawal(self, withdrawal_id: str, admin_id: Optional[str] = None) -> Dict[str, Any]:
        withdrawal = db.withdrawals.get(withdrawal_id)
        if not withdrawal:
            raise NotFoundError(f"Withdrawal request {withdrawal_id} not found")

        if withdrawal["status"] in ["APPROVED", "COMPLETED"]:
            return withdrawal

        if withdrawal["status"] == "REJECTED":
            raise ValidationError("Cannot approve a previously rejected withdrawal")

        asset = AssetSymbol(withdrawal["asset"])
        amount_str = withdrawal["amount"]
        user_id = withdrawal["user_id"]

        user_locked = ledger_service.get_or_create_account(AccountType.USER_LOCKED, asset, user_id)
        vault_acc = ledger_service.get_or_create_account(AccountType.EXCHANGE_VAULT, asset)

        # Complete withdrawal: release from locked funds and debit exchange vault
        ledger_service.record_transaction(
            idempotency_key=f"wdr_exec_{withdrawal_id}",
            description=f"Withdrawal approved by admin {admin_id}: {amount_str} {asset.value}",
            entries=[
                {"account_id": user_locked["id"], "asset": asset, "debit": amount_str, "credit": "0.00000000"},
                {"account_id": vault_acc["id"], "asset": asset, "debit": "0.00000000", "credit": amount_str}
            ],
            metadata={"withdrawal_id": withdrawal_id, "approved_by": admin_id}
        )

        withdrawal["status"] = "APPROVED"
        withdrawal["approved_by"] = admin_id or "admin_system"
        withdrawal["approved_at"] = int(time.time() * 1000)
        logger.info(f"Withdrawal {withdrawal_id} approved by {admin_id}")
        return withdrawal

    def reject_withdrawal(self, withdrawal_id: str, admin_id: Optional[str] = None, reason: str = "Admin rejection") -> Dict[str, Any]:
        withdrawal = db.withdrawals.get(withdrawal_id)
        if not withdrawal:
            raise NotFoundError(f"Withdrawal request {withdrawal_id} not found")

        if withdrawal["status"] in ["APPROVED", "COMPLETED"]:
            raise ValidationError("Cannot reject an already approved withdrawal")

        if withdrawal["status"] == "REJECTED":
            return withdrawal

        asset = AssetSymbol(withdrawal["asset"])
        amount_str = withdrawal["amount"]
        user_id = withdrawal["user_id"]

        user_locked = ledger_service.get_or_create_account(AccountType.USER_LOCKED, asset, user_id)
        user_avail = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, asset, user_id)

        # Refund locked funds back to user's available balance
        ledger_service.record_transaction(
            idempotency_key=f"wdr_refund_{withdrawal_id}",
            description=f"Withdrawal rejected by admin {admin_id}: {amount_str} {asset.value} refunded",
            entries=[
                {"account_id": user_locked["id"], "asset": asset, "debit": amount_str, "credit": "0.00000000"},
                {"account_id": user_avail["id"], "asset": asset, "debit": "0.00000000", "credit": amount_str}
            ],
            metadata={"withdrawal_id": withdrawal_id, "rejected_by": admin_id, "reason": reason}
        )

        withdrawal["status"] = "REJECTED"
        withdrawal["rejection_reason"] = reason
        logger.info(f"Withdrawal {withdrawal_id} rejected by {admin_id}: {reason}")
        return withdrawal

    def get_deposit_address(self, asset_str: str, network: Optional[str] = None) -> Dict[str, Any]:
        key = f"{asset_str}_{network}" if network and f"{asset_str}_{network}" in db.deposit_addresses else asset_str
        if key in db.deposit_addresses:
            return db.deposit_addresses[key]
        # Fallback to general asset address
        if asset_str in db.deposit_addresses:
            return db.deposit_addresses[asset_str]
        # Default generated address if missing
        default_addr = {
            "asset": asset_str,
            "network": network or "MAINNET",
            "address": f"0x{uuid.uuid4().hex}",
            "memo": None,
            "qr_code_url": None,
            "min_deposit": "0.001",
            "confirmations_required": 1,
            "updated_at": int(time.time() * 1000)
        }
        db.deposit_addresses[key] = default_addr
        return default_addr

    def set_deposit_address(self, asset_str: str, network: str, address: str, memo: Optional[str] = None, min_deposit: str = "0.0001", confirmations: int = 1) -> Dict[str, Any]:
        key = f"{asset_str}_{network}" if network else asset_str
        qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={address}"
        record = {
            "asset": asset_str,
            "network": network,
            "address": address.strip(),
            "memo": memo.strip() if memo else None,
            "qr_code_url": qr_url,
            "min_deposit": min_deposit,
            "confirmations_required": confirmations,
            "updated_at": int(time.time() * 1000)
        }
        db.deposit_addresses[key] = record
        if asset_str not in db.deposit_addresses:
            db.deposit_addresses[asset_str] = record
        logger.info(f"Admin updated fixed deposit address for {key}: {address}")
        return record

    def admin_adjust_user_balance(self, user_id: str, asset: AssetSymbol, target_balance: str, reason: str = "Admin manual balance adjustment", admin_id: Optional[str] = None) -> Dict[str, Any]:
        target_dec = to_decimal(target_balance)
        if target_dec < 0:
            raise ValidationError("Balance cannot be negative")

        current_bal = ledger_service.get_user_asset_balance(user_id, asset)
        current_dec = to_decimal(current_bal["available"])
        diff_dec = target_dec - current_dec

        if diff_dec == 0:
            return {"user_id": user_id, "asset": asset.value, "balance": format_decimal(target_dec)}

        vault_acc = ledger_service.get_or_create_account(AccountType.EXCHANGE_VAULT, asset)
        user_avail = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, asset, user_id)
        adj_id = f"adj_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"

        if diff_dec > 0:
            diff_str = format_decimal(diff_dec)
            ledger_service.record_transaction(
                idempotency_key=f"adj_credit_{adj_id}",
                description=f"Admin balance credit ({reason}): +{diff_str} {asset.value}",
                entries=[
                    {"account_id": vault_acc["id"], "asset": asset, "debit": diff_str, "credit": "0.00000000"},
                    {"account_id": user_avail["id"], "asset": asset, "debit": "0.00000000", "credit": diff_str}
                ],
                metadata={"user_id": user_id, "admin_id": admin_id, "reason": reason}
            )
        else:
            diff_str = format_decimal(abs(diff_dec))
            ledger_service.record_transaction(
                idempotency_key=f"adj_debit_{adj_id}",
                description=f"Admin balance debit ({reason}): -{diff_str} {asset.value}",
                entries=[
                    {"account_id": user_avail["id"], "asset": asset, "debit": diff_str, "credit": "0.00000000"},
                    {"account_id": vault_acc["id"], "asset": asset, "debit": "0.00000000", "credit": diff_str}
                ],
                metadata={"user_id": user_id, "admin_id": admin_id, "reason": reason}
            )

        logger.info(f"Admin {admin_id} adjusted balance for user {user_id} ({asset.value}) to {target_balance}")
        return {"user_id": user_id, "asset": asset.value, "balance": format_decimal(target_dec), "adjustment": format_decimal(diff_dec)}

    def admin_ingest_transaction(self, user_id: str, tx_type: str, asset_str: str, amount: str, note: Optional[str] = None, status: str = "COMPLETED", tx_hash: Optional[str] = None, credit_balance: bool = True, admin_id: Optional[str] = None) -> Dict[str, Any]:
        amount_str = format_decimal(amount)
        tx_id = f"tx_ingest_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
        tx_hash_val = tx_hash or f"0x{uuid.uuid4().hex}"
        asset = AssetSymbol(asset_str)

        if credit_balance:
            vault_acc = ledger_service.get_or_create_account(AccountType.EXCHANGE_VAULT, asset)
            user_avail = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, asset, user_id)
            ledger_service.record_transaction(
                idempotency_key=f"ingest_ledger_{tx_id}",
                description=f"Admin ingested {tx_type}: {amount_str} {asset.value} for {user_id} - {note or ''}",
                entries=[
                    {"account_id": vault_acc["id"], "asset": asset, "debit": amount_str, "credit": "0.00000000"},
                    {"account_id": user_avail["id"], "asset": asset, "debit": "0.00000000", "credit": amount_str}
                ],
                metadata={"ingest_id": tx_id, "type": tx_type, "admin_id": admin_id}
            )

        record = {
            "id": tx_id,
            "user_id": user_id,
            "type": tx_type,  # DEPOSIT, INVESTMENT_PAYOUT, BINANCE_PAY, BONUS, REBATE
            "asset": asset.value,
            "amount": amount_str,
            "note": note or "Manual administrative ingestion",
            "tx_hash": tx_hash_val,
            "status": status,
            "created_at": int(time.time() * 1000),
            "admin_id": admin_id
        }

        if tx_type == "DEPOSIT":
            db.deposits[tx_id] = record
        db.payment_history.append(record)
        logger.info(f"Admin {admin_id} ingested transaction {tx_id} ({tx_type}) for user {user_id}: {amount_str} {asset.value}")
        return record

    def execute_internal_transfer(self, from_user_id: str, to_user_id: str, asset: AssetSymbol, amount: str) -> Dict[str, Any]:
        if from_user_id == to_user_id:
            raise ValidationError("Cannot transfer funds to self")

        amount_str = format_decimal(amount)
        if to_decimal(amount_str) <= 0:
            raise ValidationError("Transfer amount must be greater than zero")

        bal = ledger_service.get_user_asset_balance(from_user_id, asset)
        if to_decimal(bal["available"]) < to_decimal(amount_str):
            raise InsufficientFundsError(f"Insufficient available {asset.value} balance for transfer")

        transfer_id = f"trf_int_{int(time.time()*1000)}_{uuid.uuid4().hex[:7]}"
        from_avail = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, asset, from_user_id)
        to_avail = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, asset, to_user_id)

        ledger_service.record_transaction(
            idempotency_key=f"trf_ledger_{transfer_id}",
            description=f"Internal transfer: {amount_str} {asset.value} from {from_user_id} to {to_user_id}",
            entries=[
                {"account_id": from_avail["id"], "asset": asset, "debit": amount_str, "credit": "0.00000000"},
                {"account_id": to_avail["id"], "asset": asset, "debit": "0.00000000", "credit": amount_str}
            ],
            metadata={"transfer_id": transfer_id}
        )

        transfer_record = {
            "id": transfer_id,
            "from_user_id": from_user_id,
            "to_user_id": to_user_id,
            "asset": asset.value,
            "amount": amount_str,
            "status": "COMPLETED",
            "created_at": int(time.time() * 1000)
        }
        db.transfers[transfer_id] = transfer_record
        logger.info(f"Internal transfer {transfer_id}: {amount_str} {asset.value} from {from_user_id} to {to_user_id}")
        return transfer_record


wallet_service = WalletService()
