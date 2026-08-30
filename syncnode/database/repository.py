from typing import Optional, List, Dict, Any
from syncnode.database.db import db
from syncnode.database.supabase_client import supabase_client


class UserRepository:
    def find_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        return db.users.get(user_id)

    def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        user_id = db.users_by_email.get(email.lower())
        if user_id:
            return db.users.get(user_id)
        return None

    def save(self, user: Dict[str, Any]) -> Dict[str, Any]:
        user_id = user["id"]
        email = user["email"].lower()
        db.users[user_id] = user
        db.users_by_email[email] = user_id
        supabase_client.queue_upsert("users", user)
        return user


class OrderRepository:
    def find_by_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        return db.orders.get(order_id)

    def find_by_user_id(self, user_id: str) -> List[Dict[str, Any]]:
        return [o for o in db.orders.values() if o.get("user_id") == user_id]

    def find_open_orders(self, market: str) -> List[Dict[str, Any]]:
        return [o for o in db.orders.values() if o.get("market") == market and o.get("status") in ["NEW", "PARTIALLY_FILLED"]]

    def save(self, order: Dict[str, Any]) -> Dict[str, Any]:
        db.orders[order["id"]] = order
        supabase_client.queue_upsert("orders", order)
        return order


class TradeRepository:
    def find_by_id(self, trade_id: str) -> Optional[Dict[str, Any]]:
        return db.trades.get(trade_id)

    def find_by_market(self, market: str, limit: int = 50) -> List[Dict[str, Any]]:
        trades = [t for t in db.trades.values() if t.get("market") == market]
        trades.sort(key=lambda x: x.get("created_at", 0), reverse=True)
        return trades[:limit]

    def find_by_user_id(self, user_id: str) -> List[Dict[str, Any]]:
        return [t for t in db.trades.values() if t.get("buyer_user_id") == user_id or t.get("seller_user_id") == user_id]

    def save(self, trade: Dict[str, Any]) -> Dict[str, Any]:
        db.trades[trade["id"]] = trade
        supabase_client.queue_upsert("trades", trade)
        return trade


user_repository = UserRepository()
order_repository = OrderRepository()
trade_repository = TradeRepository()
