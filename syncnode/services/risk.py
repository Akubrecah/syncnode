import time
from typing import Dict, Any
from syncnode.database.db import db
from syncnode.common.logger import Logger

logger = Logger("RiskService")


class RiskService:
    def get_circuit_breakers(self) -> Dict[str, Any]:
        cb = db.circuit_breakers
        # Provide both camelCase and snake_case for seamless client & backend parity
        return {
            "isGlobalTradingHalted": cb.get("is_global_trading_halted", False),
            "haltedMarkets": cb.get("halted_markets", {}),
            "isWithdrawalsPaused": cb.get("is_withdrawals_paused", False),
            "isDepositsPaused": cb.get("is_deposits_paused", False),
            "emergencyMaintenance": cb.get("emergency_maintenance", False),
            "is_global_trading_halted": cb.get("is_global_trading_halted", False),
            "halted_markets": cb.get("halted_markets", {}),
            "is_withdrawals_paused": cb.get("is_withdrawals_paused", False),
            "is_deposits_paused": cb.get("is_deposits_paused", False),
            "emergency_maintenance": cb.get("emergency_maintenance", False),
            "updated_at": int(time.time() * 1000)
        }

    def toggle_global_halt(self, halted: bool) -> Dict[str, Any]:
        db.circuit_breakers["is_global_trading_halted"] = halted
        logger.warn(f"Circuit Breaker: Global trading halt set to {halted}")
        return self.get_circuit_breakers()

    def toggle_market_halt(self, market: str, halted: bool) -> Dict[str, Any]:
        symbol = market.upper().replace("/", "-")
        db.circuit_breakers.setdefault("halted_markets", {})[symbol] = halted
        db.circuit_breakers["halted_markets"][market.upper()] = halted
        logger.warn(f"Circuit Breaker: Market {market} halt set to {halted}")
        return self.get_circuit_breakers()

    def toggle_withdrawals_pause(self, paused: bool) -> Dict[str, Any]:
        db.circuit_breakers["is_withdrawals_paused"] = paused
        logger.warn(f"Circuit Breaker: Withdrawals pause set to {paused}")
        return self.get_circuit_breakers()

    def toggle_deposits_pause(self, paused: bool) -> Dict[str, Any]:
        db.circuit_breakers["is_deposits_paused"] = paused
        logger.warn(f"Circuit Breaker: Deposits pause set to {paused}")
        return self.get_circuit_breakers()

    def toggle_maintenance(self, enabled: bool) -> Dict[str, Any]:
        db.circuit_breakers["emergency_maintenance"] = enabled
        logger.warn(f"Circuit Breaker: Emergency maintenance set to {enabled}")
        return self.get_circuit_breakers()


risk_service = RiskService()

