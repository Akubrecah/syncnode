import os
import asyncio
import time
from typing import Dict, Any, List, Optional
import httpx
from syncnode.common.logger import Logger

logger = Logger("SupabaseClient")


class SupabaseClient:
    """
    High-performance asynchronous client for Supabase PostgreSQL REST / PostgREST API.
    Provides non-blocking write-through persistence and startup hydration.
    """

    def __init__(self):
        self.url: Optional[str] = None
        self.key: Optional[str] = None
        self.is_configured: bool = False
        self._headers: Dict[str, str] = {}
        self._http_client: Optional[httpx.AsyncClient] = None

    def initialize(self, url: Optional[str] = None, key: Optional[str] = None) -> bool:
        self.url = (url or os.environ.get("SUPABASE_URL", "")).rstrip("/")
        # Accept SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY or SUPABASE_ANON_KEY
        self.key = key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")

        if self.url and self.key:
            self._headers = {
                "apikey": self.key,
                "Authorization": f"Bearer {self.key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=representation"
            }
            self._http_client = httpx.AsyncClient(timeout=10.0)
            self.is_configured = True
            logger.info(f"Supabase Client initialized for {self.url}")
            return True
        else:
            self.is_configured = False
            logger.info("Supabase credentials not configured; operating in local in-memory persistence mode.")
            return False

    async def test_connection(self) -> bool:
        if not self.is_configured or not self._http_client:
            return False
        try:
            resp = await self._http_client.get(
                f"{self.url}/rest/v1/deposit_addresses?select=asset&limit=1",
                headers=self._headers
            )
            if resp.status_code in [200, 206]:
                logger.info("Successfully connected to Supabase PostgreSQL database!")
                return True
            else:
                logger.warning(f"Supabase ping returned status {resp.status_code}: {resp.text}")
                return False
        except Exception as e:
            logger.warning(f"Supabase connection check failed: {str(e)}")
            return False

    # -------------------------------------------------------------------------
    # HYDRATION (SUPABASE -> MEMORY ON STARTUP)
    # -------------------------------------------------------------------------

    async def hydrate_all(self, db_instance) -> bool:
        """Hydrates users, deposit addresses, accounts, and plans from Supabase into memory."""
        if not self.is_configured or not self._http_client:
            return False

        try:
            logger.info("Hydrating in-memory engine from Supabase tables...")
            
            # 1. Hydrate Users
            users_resp = await self._http_client.get(
                f"{self.url}/rest/v1/users?select=*",
                headers=self._headers
            )
            if users_resp.status_code == 200:
                users = users_resp.json()
                for u in users:
                    user_id = u.get("id")
                    email = (u.get("email") or "").lower()
                    if user_id:
                        db_instance.users[user_id] = u
                        if email:
                            db_instance.users_by_email[email] = user_id
                logger.info(f"Hydrated {len(users)} users from Supabase.")

            # 2. Hydrate Deposit Addresses
            addr_resp = await self._http_client.get(
                f"{self.url}/rest/v1/deposit_addresses?select=*",
                headers=self._headers
            )
            if addr_resp.status_code == 200:
                addrs = addr_resp.json()
                for a in addrs:
                    asset = a.get("asset")
                    if asset:
                        db_instance.deposit_addresses[asset] = a
                logger.info(f"Hydrated {len(addrs)} deposit addresses from Supabase.")

            # 3. Hydrate Accounts / Balances
            acc_resp = await self._http_client.get(
                f"{self.url}/rest/v1/accounts?select=*",
                headers=self._headers
            )
            if acc_resp.status_code == 200:
                accounts = acc_resp.json()
                for acc in accounts:
                    acc_id = acc.get("id")
                    if acc_id:
                        db_instance.accounts[acc_id] = acc
                logger.info(f"Hydrated {len(accounts)} ledger accounts from Supabase.")

            # 4. Hydrate User Investments
            inv_resp = await self._http_client.get(
                f"{self.url}/rest/v1/user_investments?select=*",
                headers=self._headers
            )
            if inv_resp.status_code == 200:
                investments = inv_resp.json()
                for inv in investments:
                    inv_id = inv.get("id")
                    if inv_id:
                        db_instance.user_investments[inv_id] = inv
                logger.info(f"Hydrated {len(investments)} user investments from Supabase.")

            return True
        except Exception as e:
            logger.warning(f"Error during Supabase hydration: {str(e)}")
            return False

    # -------------------------------------------------------------------------
    # ASYNC WRITE-THROUGH DISPATCHERS (MEMORY -> SUPABASE)
    # -------------------------------------------------------------------------

    async def _upsert_record(self, table: str, record: Dict[str, Any]):
        if not self.is_configured or not self._http_client:
            return
        try:
            resp = await self._http_client.post(
                f"{self.url}/rest/v1/{table}",
                headers=self._headers,
                json=record
            )
            if resp.status_code not in [200, 201]:
                logger.debug(f"Supabase upsert to {table} notice ({resp.status_code}): {resp.text}")
        except Exception as e:
            logger.debug(f"Non-blocking Supabase upsert error on {table}: {str(e)}")

    def queue_upsert(self, table: str, record: Dict[str, Any]):
        """Schedules async background write to Supabase without blocking matching engine."""
        if not self.is_configured:
            return
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self._upsert_record(table, record))
        except RuntimeError:
            pass  # No running event loop (e.g. unit test setup)


supabase_client = SupabaseClient()
