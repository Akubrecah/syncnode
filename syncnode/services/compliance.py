import time
from typing import Dict, Any, List
from syncnode.common.types import KycTier, KycStatus
from syncnode.database.db import db
from syncnode.common.logger import Logger

logger = Logger("ComplianceService")


class ComplianceService:
    def submit_kyc(self, user_id: str, kyc_data: Dict[str, Any]) -> Dict[str, Any]:
        user = db.users.get(user_id)
        if user:
            user["kyc_status"] = KycStatus.PENDING.value
            user["kyc_tier"] = KycTier.TIER_1_BASIC.value
            user["updated_at"] = int(time.time() * 1000)
            db.users[user_id] = user
        return {
            "user_id": user_id,
            "kyc_tier": KycTier.TIER_1_BASIC.value,
            "kyc_status": KycStatus.PENDING.value,
            "message": "KYC documents submitted for review"
        }

    def review_kyc(self, user_id: str, approved: bool) -> Dict[str, Any]:
        user = db.users.get(user_id)
        if user:
            user["kyc_status"] = KycStatus.APPROVED.value if approved else KycStatus.REJECTED.value
            user["kyc_tier"] = KycTier.TIER_2_PRO.value if approved else KycTier.TIER_0_UNVERIFIED.value
            user["updated_at"] = int(time.time() * 1000)
            db.users[user_id] = user
        return {
            "user_id": user_id,
            "kyc_status": user.get("kyc_status") if user else "UNKNOWN"
        }


compliance_service = ComplianceService()
