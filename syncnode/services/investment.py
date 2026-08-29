import time
import uuid
from typing import Dict, Any, List, Optional
from syncnode.common.types import AssetSymbol, AccountType
from syncnode.common.errors import ValidationError, InsufficientFundsError, NotFoundError
from syncnode.common.decimal_util import format_decimal, to_decimal
from syncnode.database.db import db
from syncnode.services.ledger import ledger_service
from syncnode.common.logger import Logger

logger = Logger("InvestmentService")


class InvestmentService:
    def list_plans(self) -> List[Dict[str, Any]]:
        return list(db.investment_plans.values())

    def get_plan(self, plan_id: str) -> Optional[Dict[str, Any]]:
        return db.investment_plans.get(plan_id)

    def subscribe(self, user_id: str, plan_id: str, amount_usd: str) -> Dict[str, Any]:
        plan = db.investment_plans.get(plan_id)
        if not plan:
            raise NotFoundError(f"Investment plan '{plan_id}' not found")

        if not plan.get("is_active", True):
            raise ValidationError("This investment plan is currently unavailable for new subscriptions")

        amt_dec = to_decimal(amount_usd)
        min_dec = to_decimal(plan["min_deposit_usd"])
        max_dec = to_decimal(plan["max_deposit_usd"])

        if amt_dec < min_dec:
            raise ValidationError(f"Minimum deposit for {plan['name']} is ${plan['min_deposit_usd']} USD")
        if amt_dec > max_dec:
            raise ValidationError(f"Maximum deposit for {plan['name']} is ${plan['max_deposit_usd']} USD")

        # Check USDT balance
        asset = AssetSymbol.USDT
        bal = ledger_service.get_user_asset_balance(user_id, asset)
        avail_dec = to_decimal(bal["available"])
        if avail_dec < amt_dec:
            raise InsufficientFundsError(f"Insufficient USDT balance. Available: {bal['available']} USDT, required: {amount_usd} USDT")

        # Double-entry ledger: debit user available, credit investment pool (exchange vault)
        inv_id = f"inv_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
        user_avail = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, asset, user_id)
        vault_acc = ledger_service.get_or_create_account(AccountType.EXCHANGE_VAULT, asset)

        ledger_service.record_transaction(
            idempotency_key=f"inv_sub_{inv_id}",
            description=f"Investment subscription to {plan['name']}: {amount_usd} USDT",
            entries=[
                {"account_id": user_avail["id"], "asset": asset, "debit": format_decimal(amt_dec), "credit": "0.00000000"},
                {"account_id": vault_acc["id"], "asset": asset, "debit": "0.00000000", "credit": format_decimal(amt_dec)}
            ],
            metadata={"investment_id": inv_id, "plan_id": plan_id, "user_id": user_id}
        )

        return_rate_pct = to_decimal(plan["return_rate_percent"])
        expected_total_dec = amt_dec * (return_rate_pct / to_decimal(100))
        duration_days = int(plan.get("duration_days", 30))
        daily_yield_dec = expected_total_dec / to_decimal(duration_days)

        now_ms = int(time.time() * 1000)
        end_ms = now_ms + (duration_days * 24 * 3600 * 1000)

        record = {
            "id": inv_id,
            "user_id": user_id,
            "plan_id": plan_id,
            "plan_name": plan["name"],
            "badge": plan.get("badge", "POPULAR"),
            "invested_amount_usd": format_decimal(amt_dec),
            "expected_return_usd": format_decimal(expected_total_dec),
            "daily_yield_usd": format_decimal(daily_yield_dec),
            "accrued_profit_usd": "0.00",
            "duration_days": duration_days,
            "status": "ACTIVE",
            "created_at": now_ms,
            "end_at": end_ms,
            "last_payout_at": now_ms
        }

        db.user_investments[inv_id] = record

        # Update plan totals
        current_staked = to_decimal(plan.get("total_staked_usd", "0"))
        plan["total_staked_usd"] = format_decimal(current_staked + amt_dec)
        plan["investors_count"] = plan.get("investors_count", 0) + 1

        logger.info(f"User {user_id} subscribed to {plan['name']} with {amount_usd} USD (Expected: ${format_decimal(expected_total_dec)})")
        return record

    def get_user_investments(self, user_id: str) -> List[Dict[str, Any]]:
        now_ms = int(time.time() * 1000)
        user_list = [inv for inv in db.user_investments.values() if inv["user_id"] == user_id]

        # Calculate simulated realtime yield progress
        for inv in user_list:
            if inv["status"] == "ACTIVE":
                elapsed_ms = max(0, now_ms - inv["created_at"])
                total_duration_ms = max(1, inv["end_at"] - inv["created_at"])
                progress_fraction = min(1.0, elapsed_ms / total_duration_ms)
                
                exp_dec = to_decimal(inv["expected_return_usd"])
                inv_dec = to_decimal(inv["invested_amount_usd"])
                profit_total_dec = exp_dec - inv_dec
                accrued_dec = profit_total_dec * to_decimal(progress_fraction)
                
                inv["accrued_profit_usd"] = format_decimal(accrued_dec)
                inv["progress_percent"] = round(progress_fraction * 100, 2)
                inv["days_remaining"] = max(0, round((inv["end_at"] - now_ms) / (24 * 3600 * 1000), 1))

        return sorted(user_list, key=lambda x: x["created_at"], reverse=True)

    def claim_payout(self, user_id: str, investment_id: str) -> Dict[str, Any]:
        inv = db.user_investments.get(investment_id)
        if not inv or inv["user_id"] != user_id:
            raise NotFoundError(f"Investment {investment_id} not found")

        if inv["status"] != "ACTIVE":
            raise ValidationError("Only active investments can be claimed")

        now_ms = int(time.time() * 1000)
        elapsed_ms = max(0, now_ms - inv["created_at"])
        total_duration_ms = max(1, inv["end_at"] - inv["created_at"])
        progress_fraction = min(1.0, elapsed_ms / total_duration_ms)

        exp_dec = to_decimal(inv["expected_return_usd"])
        inv_dec = to_decimal(inv["invested_amount_usd"])
        profit_total_dec = exp_dec - inv_dec
        claimable_dec = profit_total_dec * to_decimal(progress_fraction)

        if claimable_dec <= 0:
            raise ValidationError("No accrued profits available to claim at this moment")

        asset = AssetSymbol.USDT
        vault_acc = ledger_service.get_or_create_account(AccountType.EXCHANGE_VAULT, asset)
        user_avail = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, asset, user_id)
        payout_id = f"pay_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"

        ledger_service.record_transaction(
            idempotency_key=f"inv_payout_{payout_id}",
            description=f"Investment yield claim: {format_decimal(claimable_dec)} USDT from {inv['plan_name']}",
            entries=[
                {"account_id": vault_acc["id"], "asset": asset, "debit": format_decimal(claimable_dec), "credit": "0.00000000"},
                {"account_id": user_avail["id"], "asset": asset, "debit": "0.00000000", "credit": format_decimal(claimable_dec)}
            ],
            metadata={"investment_id": investment_id, "user_id": user_id}
        )

        inv["last_payout_at"] = now_ms
        if progress_fraction >= 1.0:
            # Also return principal
            ledger_service.record_transaction(
                idempotency_key=f"inv_principal_{payout_id}",
                description=f"Investment principal maturity return: {inv['invested_amount_usd']} USDT from {inv['plan_name']}",
                entries=[
                    {"account_id": vault_acc["id"], "asset": asset, "debit": inv["invested_amount_usd"], "credit": "0.00000000"},
                    {"account_id": user_avail["id"], "asset": asset, "debit": "0.00000000", "credit": inv["invested_amount_usd"]}
                ],
                metadata={"investment_id": investment_id, "user_id": user_id}
            )
            inv["status"] = "COMPLETED"

        logger.info(f"User {user_id} claimed {format_decimal(claimable_dec)} USDT from investment {investment_id}")
        return {"success": True, "claimed_amount_usd": format_decimal(claimable_dec), "status": inv["status"]}

    def admin_create_or_update_plan(self, plan_dict: Dict[str, Any]) -> Dict[str, Any]:
        plan_id = plan_dict.get("id") or f"plan_{uuid.uuid4().hex[:6]}"
        record = {
            "id": plan_id,
            "name": plan_dict["name"],
            "badge": plan_dict.get("badge", "POPULAR"),
            "min_deposit_usd": format_decimal(plan_dict["min_deposit_usd"]),
            "max_deposit_usd": format_decimal(plan_dict["max_deposit_usd"]),
            "return_rate_percent": str(plan_dict["return_rate_percent"]),
            "duration_days": int(plan_dict.get("duration_days", 30)),
            "daily_yield_percent": str(plan_dict.get("daily_yield_percent", "8.33")),
            "description": plan_dict.get("description", ""),
            "is_active": bool(plan_dict.get("is_active", True)),
            "total_staked_usd": str(plan_dict.get("total_staked_usd", "0.00")),
            "investors_count": int(plan_dict.get("investors_count", 0))
        }
        db.investment_plans[plan_id] = record
        logger.info(f"Admin saved investment plan {plan_id}: {record['name']}")
        return record


investment_service = InvestmentService()
