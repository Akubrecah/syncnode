import json
from typing import List, Dict, Any, Optional

try:
    from fastapi import WebSocket
except ImportError:
    WebSocket = Any


class WebSocketEventBroadcaster:
    """Thread-safe and async-safe WebSocket event broadcaster."""
    def __init__(self):
        self.active_connections: List[Any] = []
        self.user_connections: Dict[str, List[Any]] = {}

    async def connect(self, websocket: Any, user_id: Optional[str] = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)

    def disconnect(self, websocket: Any):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        for uid, conns in list(self.user_connections.items()):
            if websocket in conns:
                conns.remove(websocket)
            if not conns:
                self.user_connections.pop(uid, None)

    async def broadcast(self, message: Dict[str, Any]):
        msg_json = json.dumps(message)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(msg_json)
            except Exception:
                pass

    async def send_to_user(self, user_id: str, message: Dict[str, Any]):
        msg_json = json.dumps(message)
        conns = self.user_connections.get(user_id, [])
        for connection in list(conns):
            try:
                await connection.send_text(msg_json)
            except Exception:
                pass


broadcaster = WebSocketEventBroadcaster()
