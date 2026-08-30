import os
import asyncio
from typing import Dict, Set, List, Any, Optional
from syncnode.common.types import AssetSymbol, AccountType
from syncnode.common.logger import Logger

logger = Logger("Database")


class Database:
    _instance = None

    def __init__(self):
        self.users: Dict[str, Any] = {}
        self.users_by_email: Dict[str, str] = {}

        self.api_keys: Dict[str, Any] = {}
        self.api_keys_by_key: Dict[str, str] = {}

        self.accounts: Dict[str, Dict[str, Any]] = {}
        self.journal_entries: Dict[str, Any] = {}
        self.ledger_transactions: Dict[str, Any] = {}
        self.idempotency_keys: Set[str] = set()

        self.orders: Dict[str, Any] = {}
        self.trades: Dict[str, Any] = {}
        self.deposits: Dict[str, Any] = {}
        self.withdrawals: Dict[str, Any] = {}
        self.transfers: Dict[str, Any] = {}

        self.p2p_ads: Dict[str, Any] = {}
        self.p2p_trades: Dict[str, Any] = {}

        self.deposit_addresses: Dict[str, Any] = {}
        self.investment_plans: Dict[str, Any] = {}
        self.user_investments: Dict[str, Any] = {}
        self.payment_history: List[Any] = []

        self.audit_logs: List[Any] = []
        self.outbox: List[Any] = []

        self.circuit_breakers = {
            "is_global_trading_halted": False,
            "halted_markets": {},
            "is_withdrawals_paused": False,
            "is_deposits_paused": False,
            "emergency_maintenance": False
        }

        self.mongo_client = None
        self.mongo_db = None
        self._is_connected = False
        self._is_supabase_connected = False

    def bootstrap_admin(self):
        from syncnode.security.crypto import hash_password
        from syncnode.common.types import KycTier, KycStatus, AdminRole
        import time

        admin_email = os.environ.get("ADMIN_BOOTSTRAP_EMAIL", "poweldayck@gmail.com").lower()
        admin_pass = os.environ.get("ADMIN_BOOTSTRAP_PASSWORD", "Kapenguria@12")
        admin_id = "admin_super_exec_1"
        user = {
            "id": admin_id,
            "email": admin_email,
            "full_name": "Executive Admin",
            "password_hash": hash_password(admin_pass),
            "is_totp_enabled": False,
            "kyc_tier": KycTier.TIER_3_INSTITUTIONAL.value,
            "kyc_status": KycStatus.APPROVED.value,
            "admin_roles": [AdminRole.SUPER_ADMIN.value],
            "is_suspended": False,
            "is_withdrawal_suspended": False,
            "created_at": int(time.time() * 1000),
            "updated_at": int(time.time() * 1000)
        }
        self.users[admin_id] = user
        self.users_by_email[admin_email] = admin_id

        # Seed Default Admin-Managed Deposit Wallets
        self.deposit_addresses = {
            "BTC": {
                "asset": "BTC",
                "network": "BTC",
                "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
                "memo": None,
                "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
                "min_deposit": "0.0005",
                "confirmations_required": 1,
                "updated_at": int(time.time() * 1000)
            },
            "ETH": {
                "asset": "ETH",
                "network": "ERC20",
                "address": "0x71C8366420A092679b5436194448873305370caD",
                "memo": None,
                "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=0x71C8366420A092679b5436194448873305370caD",
                "min_deposit": "0.01",
                "confirmations_required": 12,
                "updated_at": int(time.time() * 1000)
            },
            "USDT_TRC20": {
                "asset": "USDT",
                "network": "TRC20",
                "address": "TYDzsYUEpvnYmQk4zGP9sWWcTEd3ZiPULj",
                "memo": None,
                "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TYDzsYUEpvnYmQk4zGP9sWWcTEd3ZiPULj",
                "min_deposit": "10.00",
                "confirmations_required": 1,
                "updated_at": int(time.time() * 1000)
            },
            "USDT_ERC20": {
                "asset": "USDT",
                "network": "ERC20",
                "address": "0x71C8366420A092679b5436194448873305370caD",
                "memo": None,
                "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=0x71C8366420A092679b5436194448873305370caD",
                "min_deposit": "10.00",
                "confirmations_required": 12,
                "updated_at": int(time.time() * 1000)
            },
            "BNB": {
                "asset": "BNB",
                "network": "BEP20",
                "address": "0x71C8366420A092679b5436194448873305370caD",
                "memo": None,
                "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=0x71C8366420A092679b5436194448873305370caD",
                "min_deposit": "0.05",
                "confirmations_required": 15,
                "updated_at": int(time.time() * 1000)
            },
            "SOL": {
                "asset": "SOL",
                "network": "SOL",
                "address": "8J9bXwV6hKqZ7K9Z8gGZ9e7kK9Z8gGZ9e7kK9Z8gGZ9e",
                "memo": None,
                "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=8J9bXwV6hKqZ7K9Z8gGZ9e7kK9Z8gGZ9e7kK9Z8gGZ9e",
                "min_deposit": "0.10",
                "confirmations_required": 32,
                "updated_at": int(time.time() * 1000)
            }
        }

        # Seed Default High-Yield Investment Plans
        self.investment_plans = {
            "plan_starter": {
                "id": "plan_starter",
                "name": "Starter Yield Staking",
                "badge": "POPULAR",
                "min_deposit_usd": "500.00",
                "max_deposit_usd": "2499.00",
                "return_rate_percent": "140",
                "duration_days": 7,
                "daily_yield_percent": "20.00",
                "description": "Short-term high-yield liquidity pool with automated daily compounding payouts.",
                "is_active": True,
                "total_staked_usd": "148,200.00",
                "investors_count": 86
            },
            "plan_growth": {
                "id": "plan_growth",
                "name": "Growth Matrix Pool",
                "badge": "HIGH YIELD",
                "min_deposit_usd": "2500.00",
                "max_deposit_usd": "9999.00",
                "return_rate_percent": "180",
                "duration_days": 14,
                "daily_yield_percent": "12.85",
                "description": "Algorithmic market-making & arbitrage yield fund with guaranteed capital protection.",
                "is_active": True,
                "total_staked_usd": "485,600.00",
                "investors_count": 52
            },
            "plan_whale": {
                "id": "plan_whale",
                "name": "Whale Capital Strategy",
                "badge": "VIP CHOICE",
                "min_deposit_usd": "10000.00",
                "max_deposit_usd": "49999.00",
                "return_rate_percent": "250",
                "duration_days": 30,
                "daily_yield_percent": "8.33",
                "description": "Institutional HFT liquidity allocation with private execution desk and 250% target maturity (e.g. $10k -> $25k).",
                "is_active": True,
                "total_staked_usd": "1,850,000.00",
                "investors_count": 34
            },
            "plan_vip_elite": {
                "id": "plan_vip_elite",
                "name": "Executive Institutional Club",
                "badge": "MAX ROI",
                "min_deposit_usd": "50000.00",
                "max_deposit_usd": "500000.00",
                "return_rate_percent": "300",
                "duration_days": 45,
                "daily_yield_percent": "6.67",
                "description": "Private equity cross-market arbitrage vault with principal preservation warranty.",
                "is_active": True,
                "total_staked_usd": "3,400,000.00",
                "investors_count": 14
            }
        }

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = Database()
            cls._instance.bootstrap_admin()
        return cls._instance

    def reset(self):
        self.users.clear()
        self.users_by_email.clear()
        self.api_keys.clear()
        self.api_keys_by_key.clear()
        self.accounts.clear()
        self.journal_entries.clear()
        self.ledger_transactions.clear()
        self.idempotency_keys.clear()
        self.orders.clear()
        self.trades.clear()
        self.deposits.clear()
        self.withdrawals.clear()
        self.transfers.clear()
        self.p2p_ads.clear()
        self.p2p_trades.clear()
        self.audit_logs.clear()
        self.outbox.clear()
        self.circuit_breakers = {
            "is_global_trading_halted": False,
            "halted_markets": {},
            "is_withdrawals_paused": False,
            "is_deposits_paused": False,
            "emergency_maintenance": False
        }
        self.bootstrap_admin()

    async def connect_mongo(self, uri: str = None):
        uri = uri or os.environ.get("MONGODB_URI", "mongodb://localhost:27017/syncnode")
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            self.mongo_client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=2000)
            self.mongo_db = self.mongo_client.get_default_database()
            # Verify connection
            await self.mongo_db.command("ping")
            self._is_connected = True
            logger.info(f"Connected to MongoDB via Motor at {uri}")
        except Exception as e:
            logger.warn(f"MongoDB connection optional fallback (in-memory mode active): {str(e)}")
            self._is_connected = False

    async def connect_supabase(self, url: str = None, key: str = None):
        """Initializes Supabase connection and hydrates engine memory state from PostgreSQL tables."""
        from syncnode.database.supabase_client import supabase_client
        if supabase_client.initialize(url=url, key=key):
            is_alive = await supabase_client.test_connection()
            if is_alive:
                self._is_supabase_connected = True
                await supabase_client.hydrate_all(self)
                logger.info("Supabase PostgreSQL cloud storage active and synchronized.")
            else:
                self._is_supabase_connected = False
                logger.warning("Supabase configured but ping check failed. Falling back to local memory persistence.")
        else:
            self._is_supabase_connected = False


db = Database.get_instance()
