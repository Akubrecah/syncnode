import time
import uuid
from typing import List, Dict, Any, Optional
from syncnode.common.types import AssetSymbol, AccountType, P2PTradeStatus
from syncnode.common.errors import ValidationError, InsufficientFundsError, NotFoundError, ForbiddenError
from syncnode.common.decimal_util import format_decimal, to_decimal, mul_decimals
from syncnode.database.db import db
from syncnode.services.ledger import ledger_service
from syncnode.common.logger import Logger

logger = Logger("P2PService")


class P2PService:
    def create_ad(self, user_id: str, ad_data: Dict[str, Any]) -> Dict[str, Any]:
        ad_id = f"p2p_ad_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
        asset = AssetSymbol(ad_data["asset"])
        available_amt = format_decimal(ad_data["available_amount"])

        # If it's a SELL ad (merchant selling crypto), verify available balance
        if ad_data.get("type") == "SELL":
            bal = ledger_service.get_user_asset_balance(user_id, asset)
            if to_decimal(bal["available"]) < to_decimal(available_amt):
                raise InsufficientFundsError(f"Insufficient available {asset.value} to post sell advertisement")

        ad = {
            "id": ad_id,
            "user_id": user_id,
            "merchant_name": ad_data.get("merchant_name", "Verified Merchant"),
            "type": ad_data.get("type", "BUY"),
            "asset": asset.value,
            "fiat_currency": ad_data.get("fiat_currency", "USD"),
            "price": format_decimal(ad_data["price"], 2),
            "available_amount": available_amt,
            "min_limit": format_decimal(ad_data.get("min_limit", "50"), 2),
            "max_limit": format_decimal(ad_data.get("max_limit", "5000"), 2),
            "payment_methods": ad_data.get("payment_methods", ["Bank Transfer"]),
            "is_active": True,
            "created_at": int(time.time() * 1000)
        }
        db.p2p_ads[ad_id] = ad
        logger.info(f"Created P2P Ad {ad_id} for user {user_id}")
        return ad

    def list_ads(self, trade_type: Optional[str] = None, asset: Optional[str] = None, fiat: Optional[str] = None) -> List[Dict[str, Any]]:
        ads = list(db.p2p_ads.values())
        if trade_type:
            ads = [a for a in ads if a.get("type") == trade_type]
        if asset:
            ads = [a for a in ads if a.get("asset") == asset]
        if fiat:
            ads = [a for a in ads if a.get("fiat_currency") == fiat]
        ads.sort(key=lambda x: x.get("created_at", 0), reverse=True)
        return ads

    def initiate_trade(self, trade_req: Dict[str, Any]) -> Dict[str, Any]:
        ad_id = trade_req["ad_id"]
        ad = db.p2p_ads.get(ad_id)
        if not ad or not ad.get("is_active"):
            raise NotFoundError("P2P Advertisement not found or inactive")

        crypto_amt = format_decimal(trade_req["crypto_amount"])
        if to_decimal(crypto_amt) <= 0:
            raise ValidationError("Crypto amount must be greater than zero")

        ad_type = ad["type"]
        asset = AssetSymbol(ad["asset"])
        fiat_currency = ad["fiat_currency"]
        price = ad["price"]
        fiat_amt = mul_decimals(crypto_amt, price, 2)

        # Determine seller and buyer
        if ad_type == "SELL":  # Ad creator is selling to buyer
            seller_id = ad["user_id"]
            buyer_id = trade_req["buyer_user_id"]
        else:  # Ad creator is buying from seller
            buyer_id = ad["user_id"]
            seller_id = trade_req.get("seller_user_id") or trade_req.get("buyer_user_id")

        if seller_id == buyer_id:
            raise ValidationError("Cannot trade with your own advertisement")

        # Verify seller available balance before locking escrow
        seller_bal = ledger_service.get_user_asset_balance(seller_id, asset)
        if to_decimal(seller_bal["available"]) < to_decimal(crypto_amt):
            raise InsufficientFundsError(f"Seller has insufficient available {asset.value} balance ({seller_bal['available']} available, {crypto_amt} required)")

        trade_id = f"p2p_trd_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"

        # Lock seller crypto in P2P_ESCROW account on ledger
        seller_avail = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, asset, seller_id)
        escrow_acc = ledger_service.get_or_create_account(AccountType.P2P_ESCROW, asset, seller_id)

        ledger_service.record_transaction(
            idempotency_key=f"p2p_escrow_lock_{trade_id}",
            description=f"P2P Escrow lock: {crypto_amt} {asset.value} for trade {trade_id}",
            entries=[
                {"account_id": seller_avail["id"], "asset": asset, "debit": crypto_amt, "credit": "0.00000000"},
                {"account_id": escrow_acc["id"], "asset": asset, "debit": "0.00000000", "credit": crypto_amt}
            ],
            metadata={"trade_id": trade_id, "buyer_id": buyer_id, "seller_id": seller_id}
        )

        trade = {
            "id": trade_id,
            "ad_id": ad_id,
            "buyer_user_id": buyer_id,
            "seller_user_id": seller_id,
            "asset": asset.value,
            "fiat_currency": fiat_currency,
            "crypto_amount": crypto_amt,
            "fiat_amount": fiat_amt,
            "price": price,
            "payment_method": trade_req.get("payment_method", "Bank Transfer"),
            "status": P2PTradeStatus.ESCROW_LOCKED.value,
            "escrow_locked_at": int(time.time() * 1000)
        }
        db.p2p_trades[trade_id] = trade
        logger.info(f"Initiated P2P Trade {trade_id}: {crypto_amt} {asset.value} locked in escrow")
        return trade

    def mark_paid(self, trade_id: str, user_id: str) -> Dict[str, Any]:
        trade = db.p2p_trades.get(trade_id)
        if not trade:
            raise NotFoundError("P2P Trade not found")
        if trade["buyer_user_id"] != user_id:
            raise ForbiddenError("Only the buyer can mark the trade as paid")
        if trade["status"] != P2PTradeStatus.ESCROW_LOCKED.value:
            raise ValidationError(f"Cannot mark trade as paid in status {trade['status']}")

        trade["status"] = P2PTradeStatus.BUYER_PAID.value
        trade["paid_at"] = int(time.time() * 1000)
        return trade

    def release_escrow(self, trade_id: str, user_id: str) -> Dict[str, Any]:
        trade = db.p2p_trades.get(trade_id)
        if not trade:
            raise NotFoundError("P2P Trade not found")
        if trade["seller_user_id"] != user_id:
            raise ForbiddenError("Only the seller can release the escrowed crypto")
        if trade["status"] not in [P2PTradeStatus.BUYER_PAID.value, P2PTradeStatus.ESCROW_LOCKED.value]:
            raise ValidationError(f"Cannot release trade in status {trade['status']}")

        asset = AssetSymbol(trade["asset"])
        crypto_amt = trade["crypto_amount"]
        seller_id = trade["seller_user_id"]
        buyer_id = trade["buyer_user_id"]

        escrow_acc = ledger_service.get_or_create_account(AccountType.P2P_ESCROW, asset, seller_id)
        buyer_avail = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, asset, buyer_id)

        # Release from Escrow to Buyer Available Balance
        ledger_service.record_transaction(
            idempotency_key=f"p2p_escrow_release_{trade_id}",
            description=f"P2P Escrow release: {crypto_amt} {asset.value} to buyer {buyer_id}",
            entries=[
                {"account_id": escrow_acc["id"], "asset": asset, "debit": crypto_amt, "credit": "0.00000000"},
                {"account_id": buyer_avail["id"], "asset": asset, "debit": "0.00000000", "credit": crypto_amt}
            ],
            metadata={"trade_id": trade_id}
        )

        trade["status"] = P2PTradeStatus.RELEASED.value
        trade["released_at"] = int(time.time() * 1000)
        logger.info(f"Released P2P Escrow {trade_id}: {crypto_amt} {asset.value} credited to buyer {buyer_id}")
        return trade

    def cancel_trade(self, trade_id: str, user_id: str) -> Dict[str, Any]:
        trade = db.p2p_trades.get(trade_id)
        if not trade:
            raise NotFoundError("P2P Trade not found")
        if trade["buyer_user_id"] != user_id and trade["seller_user_id"] != user_id:
            raise ForbiddenError("Unauthorized to cancel this trade")
        if trade["status"] != P2PTradeStatus.ESCROW_LOCKED.value:
            raise ValidationError("Cannot cancel a trade that has already been marked as paid or released")

        asset = AssetSymbol(trade["asset"])
        crypto_amt = trade["crypto_amount"]
        seller_id = trade["seller_user_id"]

        escrow_acc = ledger_service.get_or_create_account(AccountType.P2P_ESCROW, asset, seller_id)
        seller_avail = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, asset, seller_id)

        # Refund from Escrow back to Seller Available
        ledger_service.record_transaction(
            idempotency_key=f"p2p_escrow_cancel_{trade_id}",
            description=f"P2P Escrow refund: {crypto_amt} {asset.value} to seller {seller_id}",
            entries=[
                {"account_id": escrow_acc["id"], "asset": asset, "debit": crypto_amt, "credit": "0.00000000"},
                {"account_id": seller_avail["id"], "asset": asset, "debit": "0.00000000", "credit": crypto_amt}
            ]
        )

    def dispute_trade(self, trade_id: str, user_id: str, reason: str = "Dispute raised") -> Dict[str, Any]:
        trade = db.p2p_trades.get(trade_id)
        if not trade:
            raise NotFoundError("P2P Trade not found")
        if trade["buyer_user_id"] != user_id and trade["seller_user_id"] != user_id:
            raise ForbiddenError("Unauthorized to dispute this trade")
        if trade["status"] not in [P2PTradeStatus.ESCROW_LOCKED.value, P2PTradeStatus.BUYER_PAID.value]:
            raise ValidationError(f"Cannot dispute trade in status {trade['status']}")

        trade["status"] = P2PTradeStatus.DISPUTED.value
        trade["dispute_reason"] = reason
        trade["disputed_at"] = int(time.time() * 1000)
        logger.warn(f"P2P Trade {trade_id} marked as DISPUTED by {user_id}: {reason}")
        return trade

    def admin_resolve_dispute(self, trade_id: str, action: str, admin_id: Optional[str] = None, reason: str = "") -> Dict[str, Any]:
        trade = db.p2p_trades.get(trade_id)
        if not trade:
            raise NotFoundError("P2P Trade not found")

        asset = AssetSymbol(trade["asset"])
        crypto_amt = trade["crypto_amount"]
        seller_id = trade["seller_user_id"]
        buyer_id = trade["buyer_user_id"]

        action_upper = action.upper().strip()
        if action_upper in ["RELEASE", "RELEASE_TO_BUYER", "BUYER"]:
            escrow_acc = ledger_service.get_or_create_account(AccountType.P2P_ESCROW, asset, seller_id)
            buyer_avail = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, asset, buyer_id)

            ledger_service.record_transaction(
                idempotency_key=f"p2p_admin_resolve_rel_{trade_id}",
                description=f"Admin {admin_id} dispute resolution (RELEASE): {crypto_amt} {asset.value} to buyer {buyer_id}. Reason: {reason}",
                entries=[
                    {"account_id": escrow_acc["id"], "asset": asset, "debit": crypto_amt, "credit": "0.00000000"},
                    {"account_id": buyer_avail["id"], "asset": asset, "debit": "0.00000000", "credit": crypto_amt}
                ],
                metadata={"trade_id": trade_id, "admin_id": admin_id, "action": "RELEASE", "reason": reason}
            )
            trade["status"] = P2PTradeStatus.RELEASED.value
            trade["released_at"] = int(time.time() * 1000)
            trade["resolved_by"] = admin_id
            trade["resolution_notes"] = reason
        elif action_upper in ["CANCEL", "REFUND", "REFUND_SELLER", "SELLER"]:
            escrow_acc = ledger_service.get_or_create_account(AccountType.P2P_ESCROW, asset, seller_id)
            seller_avail = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, asset, seller_id)

            ledger_service.record_transaction(
                idempotency_key=f"p2p_admin_resolve_cnc_{trade_id}",
                description=f"Admin {admin_id} dispute resolution (CANCEL/REFUND): {crypto_amt} {asset.value} to seller {seller_id}. Reason: {reason}",
                entries=[
                    {"account_id": escrow_acc["id"], "asset": asset, "debit": crypto_amt, "credit": "0.00000000"},
                    {"account_id": seller_avail["id"], "asset": asset, "debit": "0.00000000", "credit": crypto_amt}
                ],
                metadata={"trade_id": trade_id, "admin_id": admin_id, "action": "CANCEL", "reason": reason}
            )
            trade["status"] = P2PTradeStatus.CANCELLED.value
            trade["cancelled_at"] = int(time.time() * 1000)
            trade["resolved_by"] = admin_id
            trade["resolution_notes"] = reason
        else:
            raise ValidationError(f"Invalid dispute resolution action: {action}. Must be RELEASE or CANCEL.")

        db.audit_logs.append({
            "timestamp": int(time.time() * 1000),
            "action": f"P2P_DISPUTE_RESOLVED_{action_upper}",
            "admin_id": admin_id or "admin_system",
            "target_id": trade_id,
            "resolution": action_upper,
            "reason": reason
        })

        logger.info(f"Admin {admin_id} resolved P2P dispute {trade_id} -> {action_upper}")
        return trade


p2p_service = P2PService()

