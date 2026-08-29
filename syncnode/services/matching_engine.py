import time
import uuid
from typing import List, Dict, Any, Optional
from syncnode.common.types import (
    AssetSymbol,
    AccountType,
    OrderSide,
    OrderType,
    OrderStatus,
    TimeInForce,
    SelfTradePrevention
)
from syncnode.common.errors import ValidationError, InsufficientFundsError, MarketHaltedError, NotFoundError, ForbiddenError
from syncnode.common.decimal_util import (
    to_decimal,
    format_decimal,
    add_decimals,
    sub_decimals,
    mul_decimals,
    div_decimals,
    gt_decimal,
    gte_decimal,
    lt_decimal,
    lte_decimal,
    eq_decimal
)
from syncnode.database.db import db
from syncnode.services.ledger import ledger_service
from syncnode.common.logger import Logger

logger = Logger("MatchingEngine")


class OrderBook:
    def __init__(self, market: str):
        self.market = market
        self.bids: List[Dict[str, Any]] = []  # Sorted descending by price, then ascending by time
        self.asks: List[Dict[str, Any]] = []  # Sorted ascending by price, then ascending by time

    def get_depth(self, limit: int = 20) -> Dict[str, Any]:
        bid_levels = {}
        for b in self.bids:
            p = b["price"]
            q = to_decimal(b["remaining_quantity"])
            bid_levels[p] = bid_levels.get(p, to_decimal(0)) + q

        ask_levels = {}
        for a in self.asks:
            p = a["price"]
            q = to_decimal(a["remaining_quantity"])
            ask_levels[p] = ask_levels.get(p, to_decimal(0)) + q

        sorted_bids = sorted([[p, format_decimal(q)] for p, q in bid_levels.items()], key=lambda x: to_decimal(x[0]), reverse=True)[:limit]
        sorted_asks = sorted([[p, format_decimal(q)] for p, q in ask_levels.items()], key=lambda x: to_decimal(x[0]))[:limit]

        return {
            "market": self.market,
            "bids": sorted_bids,
            "asks": sorted_asks,
            "timestamp": int(time.time() * 1000)
        }

    def cancel_order(self, order_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        # Search in bids
        for i, order in enumerate(self.bids):
            if order["id"] == order_id:
                if order["user_id"] != user_id:
                    raise ForbiddenError("Unauthorized to cancel this order")
                cancelled = self.bids.pop(i)
                cancelled["status"] = OrderStatus.CANCELLED
                cancelled["updated_at"] = int(time.time() * 1000)
                base_sym, quote_sym = self.market.split("/")
                locked_quote = mul_decimals(cancelled["remaining_quantity"], cancelled["price"])
                ledger_service.unlock_user_funds(user_id, AssetSymbol(quote_sym), locked_quote, f"Cancel Buy Order {order_id}")
                db.orders[order_id] = cancelled
                return cancelled

        # Search in asks
        for i, order in enumerate(self.asks):
            if order["id"] == order_id:
                if order["user_id"] != user_id:
                    raise ForbiddenError("Unauthorized to cancel this order")
                cancelled = self.asks.pop(i)
                cancelled["status"] = OrderStatus.CANCELLED
                cancelled["updated_at"] = int(time.time() * 1000)
                base_sym, quote_sym = self.market.split("/")
                ledger_service.unlock_user_funds(user_id, AssetSymbol(base_sym), cancelled["remaining_quantity"], f"Cancel Sell Order {order_id}")
                db.orders[order_id] = cancelled
                return cancelled

    def admin_cancel_order(self, order_id: str, admin_id: str, reason: str = "Admin cancellation") -> Optional[Dict[str, Any]]:
        # Search in bids
        for i, order in enumerate(self.bids):
            if order["id"] == order_id:
                cancelled = self.bids.pop(i)
                cancelled["status"] = OrderStatus.CANCELLED
                cancelled["updated_at"] = int(time.time() * 1000)
                cancelled["cancelled_by_admin"] = admin_id
                cancelled["cancellation_reason"] = reason
                base_sym, quote_sym = self.market.split("/")
                locked_quote = mul_decimals(cancelled["remaining_quantity"], cancelled["price"])
                ledger_service.unlock_user_funds(cancelled["user_id"], AssetSymbol(quote_sym), locked_quote, f"Admin Cancel Buy Order {order_id}: {reason}")
                db.orders[order_id] = cancelled
                return cancelled

        # Search in asks
        for i, order in enumerate(self.asks):
            if order["id"] == order_id:
                cancelled = self.asks.pop(i)
                cancelled["status"] = OrderStatus.CANCELLED
                cancelled["updated_at"] = int(time.time() * 1000)
                cancelled["cancelled_by_admin"] = admin_id
                cancelled["cancellation_reason"] = reason
                base_sym, quote_sym = self.market.split("/")
                ledger_service.unlock_user_funds(cancelled["user_id"], AssetSymbol(base_sym), cancelled["remaining_quantity"], f"Admin Cancel Sell Order {order_id}: {reason}")
                db.orders[order_id] = cancelled
                return cancelled

        return None


    def place_order(self, order: Dict[str, Any]) -> Dict[str, Any]:
        market = order["market"]
        side = order["side"]
        order_type = order.get("type", OrderType.LIMIT)
        stp = order.get("self_trade_prevention", SelfTradePrevention.CANCEL_MAKER)
        user_id = order["user_id"]

        trades_executed = []
        remaining_qty = to_decimal(order["remaining_quantity"])
        target_book = self.asks if side == OrderSide.BUY else self.bids

        # Post-Only Check: Reject immediately if it would execute as a taker
        if order_type == OrderType.POST_ONLY:
            if target_book:
                best_opposite_price = to_decimal(target_book[0]["price"])
                order_price = to_decimal(order["price"])
                if (side == OrderSide.BUY and order_price >= best_opposite_price) or (side == OrderSide.SELL and order_price <= best_opposite_price):
                    order["status"] = OrderStatus.CANCELLED
                    db.orders[order["id"]] = order
                    return {"order": order, "trades": []}

        # Matching loop
        i = 0
        while i < len(target_book) and remaining_qty > 0:
            maker_order = target_book[i]
            maker_price = to_decimal(maker_order["price"])
            taker_price = to_decimal(order["price"]) if order_type != OrderType.MARKET else maker_price

            # Price cross condition
            crosses = (side == OrderSide.BUY and taker_price >= maker_price) or (side == OrderSide.SELL and taker_price <= maker_price)
            if not crosses and order_type != OrderType.MARKET:
                break

            # Self-Trade Prevention (STP)
            if maker_order["user_id"] == user_id:
                if stp == SelfTradePrevention.CANCEL_MAKER:
                    maker_order["status"] = OrderStatus.CANCELLED
                    db.orders[maker_order["id"]] = maker_order
                    # Unlock maker remaining funds
                    base_sym, quote_sym = market.split("/")
                    maker_lock_asset = AssetSymbol(quote_sym) if maker_order["side"] == OrderSide.BUY else AssetSymbol(base_sym)
                    maker_lock_amt = mul_decimals(maker_order["remaining_quantity"], maker_order["price"]) if maker_order["side"] == OrderSide.BUY else maker_order["remaining_quantity"]
                    ledger_service.unlock_user_funds(maker_order["user_id"], maker_lock_asset, maker_lock_amt, "STP Cancel Maker")
                    target_book.pop(i)
                    continue
                elif stp == SelfTradePrevention.CANCEL_TAKER:
                    order["status"] = OrderStatus.CANCELLED
                    db.orders[order["id"]] = order
                    return {"order": order, "trades": trades_executed}

            match_price = maker_order["price"]
            maker_rem_qty = to_decimal(maker_order["remaining_quantity"])
            fill_qty = min(remaining_qty, maker_rem_qty)
            fill_qty_str = format_decimal(fill_qty)

            # Update quantities
            remaining_qty -= fill_qty
            order["filled_quantity"] = add_decimals(order.get("filled_quantity", 0), fill_qty_str)
            order["remaining_quantity"] = format_decimal(remaining_qty)

            maker_order["filled_quantity"] = add_decimals(maker_order.get("filled_quantity", 0), fill_qty_str)
            maker_order["remaining_quantity"] = format_decimal(maker_rem_qty - fill_qty)

            if to_decimal(maker_order["remaining_quantity"]) == 0:
                maker_order["status"] = OrderStatus.FILLED
                target_book.pop(i)
            else:
                maker_order["status"] = OrderStatus.PARTIALLY_FILLED
                i += 1

            db.orders[maker_order["id"]] = maker_order

            # Record Trade
            trade_id = f"trd_{int(time.time()*1000)}_{uuid.uuid4().hex[:8]}"
            quote_vol = mul_decimals(fill_qty_str, match_price)
            buyer_id = order["user_id"] if side == OrderSide.BUY else maker_order["user_id"]
            seller_id = maker_order["user_id"] if side == OrderSide.BUY else order["user_id"]

            trade_record = {
                "id": trade_id,
                "market": market,
                "buyer_user_id": buyer_id,
                "seller_user_id": seller_id,
                "maker_order_id": maker_order["id"],
                "taker_order_id": order["id"],
                "price": match_price,
                "quantity": fill_qty_str,
                "quote_volume": quote_vol,
                "taker_side": side,
                "created_at": int(time.time() * 1000)
            }
            db.trades[trade_id] = trade_record
            trades_executed.append(trade_record)

            # Execute Settlement on double-entry ledger
            base_sym, quote_sym = market.split("/")
            base_asset = AssetSymbol(base_sym)
            quote_asset = AssetSymbol(quote_sym)

            # Settle Base Asset (Seller -> Buyer)
            seller_locked = ledger_service.get_or_create_account(AccountType.USER_LOCKED if seller_id == maker_order["user_id"] else AccountType.USER_AVAILABLE, base_asset, seller_id)
            buyer_avail = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, base_asset, buyer_id)
            ledger_service.record_transaction(
                idempotency_key=f"stl_base_{trade_id}",
                description=f"Settle Base Asset Trade {trade_id}",
                entries=[
                    {"account_id": seller_locked["id"], "asset": base_asset, "debit": fill_qty_str, "credit": "0.00000000"},
                    {"account_id": buyer_avail["id"], "asset": base_asset, "debit": "0.00000000", "credit": fill_qty_str}
                ]
            )

            # Settle Quote Asset (Buyer -> Seller)
            buyer_locked = ledger_service.get_or_create_account(AccountType.USER_LOCKED if buyer_id == maker_order["user_id"] else AccountType.USER_AVAILABLE, quote_asset, buyer_id)
            seller_avail = ledger_service.get_or_create_account(AccountType.USER_AVAILABLE, quote_asset, seller_id)
            ledger_service.record_transaction(
                idempotency_key=f"stl_quote_{trade_id}",
                description=f"Settle Quote Asset Trade {trade_id}",
                entries=[
                    {"account_id": buyer_locked["id"], "asset": quote_asset, "debit": quote_vol, "credit": "0.00000000"},
                    {"account_id": seller_avail["id"], "asset": quote_asset, "debit": "0.00000000", "credit": quote_vol}
                ]
            )

        # Update remaining order status
        if remaining_qty == 0:
            order["status"] = OrderStatus.FILLED
        elif to_decimal(order.get("filled_quantity", 0)) > 0:
            order["status"] = OrderStatus.PARTIALLY_FILLED
            if order_type in [OrderType.LIMIT, OrderType.POST_ONLY]:
                self._insert_maker_order(order)
        else:
            order["status"] = OrderStatus.NEW
            if order_type in [OrderType.LIMIT, OrderType.POST_ONLY]:
                self._insert_maker_order(order)

        db.orders[order["id"]] = order
        return {"order": order, "trades": trades_executed}

    def _insert_maker_order(self, order: Dict[str, Any]):
        book = self.bids if order["side"] == OrderSide.BUY else self.asks
        book.append(order)
        if order["side"] == OrderSide.BUY:
            book.sort(key=lambda x: (-to_decimal(x["price"]), x.get("created_at", 0)))
        else:
            book.sort(key=lambda x: (to_decimal(x["price"]), x.get("created_at", 0)))


class MatchingEngineManager:
    _instance = None

    def __init__(self):
        self.books: Dict[str, OrderBook] = {}
        for m in ["BTC/USDT", "ETH/USDT", "SOL/USDT", "ETH/BTC"]:
            self.books[m] = OrderBook(m)

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = MatchingEngineManager()
        return cls._instance

    def reset(self):
        self.books.clear()
        for m in ["BTC/USDT", "ETH/USDT", "SOL/USDT", "ETH/BTC"]:
            self.books[m] = OrderBook(m)

    def get_book(self, market: str) -> OrderBook:
        if market not in self.books:
            self.books[market] = OrderBook(market)
        return self.books[market]

    def place_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        market = order_data["market"]
        book = self.get_book(market)

        order_id = order_data.get("id") or f"ord_{int(time.time()*1000)}_{uuid.uuid4().hex[:8]}"
        qty_str = format_decimal(order_data["quantity"])
        price_str = format_decimal(order_data.get("price", 0))

        order = {
            "id": order_id,
            "client_order_id": order_data.get("client_order_id"),
            "user_id": order_data["user_id"],
            "market": market,
            "side": order_data["side"],
            "type": order_data.get("type", OrderType.LIMIT),
            "time_in_force": order_data.get("time_in_force", TimeInForce.GTC),
            "price": price_str,
            "quantity": qty_str,
            "filled_quantity": "0.00000000",
            "remaining_quantity": qty_str,
            "status": OrderStatus.NEW,
            "self_trade_prevention": order_data.get("self_trade_prevention", SelfTradePrevention.CANCEL_MAKER),
            "created_at": int(time.time() * 1000),
            "updated_at": int(time.time() * 1000)
        }

        # Lock funds for maker orders
        base_sym, quote_sym = market.split("/")
        if order["side"] == OrderSide.BUY:
            needed_quote = mul_decimals(qty_str, price_str)
            ledger_service.lock_user_funds(order["user_id"], AssetSymbol(quote_sym), needed_quote, f"Place Buy Order {order_id}")
        else:
            ledger_service.lock_user_funds(order["user_id"], AssetSymbol(base_sym), qty_str, f"Place Sell Order {order_id}")

        result = book.place_order(order)
        return result

    def cancel_order(self, order_id: str, user_id: str, market: Optional[str] = None) -> Dict[str, Any]:
        if market and market in self.books:
            res = self.books[market].cancel_order(order_id, user_id)
            if res:
                return res

        for book in self.books.values():
            res = book.cancel_order(order_id, user_id)
            if res:
                return res

        # Check repository if order not in live book
        ord_obj = db.orders.get(order_id)
        if not ord_obj:
            raise NotFoundError("Order not found")
        if ord_obj["user_id"] != user_id:
            raise ForbiddenError("Unauthorized to cancel this order")
        if ord_obj["status"] in [OrderStatus.FILLED, OrderStatus.CANCELLED]:
            raise ValidationError(f"Cannot cancel order in status {ord_obj['status']}")

        ord_obj["status"] = OrderStatus.CANCELLED
        ord_obj["updated_at"] = int(time.time() * 1000)
        db.orders[order_id] = ord_obj
        return ord_obj

    def admin_cancel_order(self, order_id: str, admin_id: str, reason: str = "Admin cancellation", market: Optional[str] = None) -> Dict[str, Any]:
        if market and market in self.books:
            res = self.books[market].admin_cancel_order(order_id, admin_id, reason)
            if res:
                db.audit_logs.append({
                    "timestamp": int(time.time() * 1000),
                    "action": "ADMIN_CANCEL_ORDER",
                    "admin_id": admin_id,
                    "target_id": order_id,
                    "reason": reason
                })
                return res

        for book in self.books.values():
            res = book.admin_cancel_order(order_id, admin_id, reason)
            if res:
                db.audit_logs.append({
                    "timestamp": int(time.time() * 1000),
                    "action": "ADMIN_CANCEL_ORDER",
                    "admin_id": admin_id,
                    "target_id": order_id,
                    "reason": reason
                })
                return res

        ord_obj = db.orders.get(order_id)
        if not ord_obj:
            raise NotFoundError("Order not found")
        if ord_obj["status"] in [OrderStatus.FILLED, OrderStatus.CANCELLED]:
            raise ValidationError(f"Cannot cancel order in status {ord_obj['status']}")

        ord_obj["status"] = OrderStatus.CANCELLED
        ord_obj["cancelled_by_admin"] = admin_id
        ord_obj["cancellation_reason"] = reason
        ord_obj["updated_at"] = int(time.time() * 1000)

        # Unlock any locked funds if remaining
        m = ord_obj.get("market", "BTC/USDT")
        base_sym, quote_sym = m.split("/")
        rem_qty = ord_obj.get("remaining_quantity", "0.00000000")
        if to_decimal(rem_qty) > 0:
            if ord_obj.get("side") == OrderSide.BUY:
                p = ord_obj.get("price", "0.00000000")
                needed = mul_decimals(rem_qty, p)
                ledger_service.unlock_user_funds(ord_obj["user_id"], AssetSymbol(quote_sym), needed, f"Admin Cancel Buy Order {order_id}: {reason}")
            else:
                ledger_service.unlock_user_funds(ord_obj["user_id"], AssetSymbol(base_sym), rem_qty, f"Admin Cancel Sell Order {order_id}: {reason}")

        db.orders[order_id] = ord_obj
        db.audit_logs.append({
            "timestamp": int(time.time() * 1000),
            "action": "ADMIN_CANCEL_ORDER",
            "admin_id": admin_id,
            "target_id": order_id,
            "reason": reason
        })
        return ord_obj


matching_engine = MatchingEngineManager.get_instance()

