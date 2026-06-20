from typing import Dict, List
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


class ChatConnectionManager:
    def __init__(self):
        # room_id -> list of (user_id, websocket)
        self.active_connections: Dict[int, List[tuple[int, WebSocket]]] = {}

    async def connect(self, room_id: int, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(room_id, []).append((user_id, websocket))
        logger.info("WS connect room=%s user=%s total=%s", room_id, user_id, len(self.active_connections.get(room_id, [])))

    def disconnect(self, room_id: int, user_id: int, websocket: WebSocket):
        connections = self.active_connections.get(room_id, [])
        if (user_id, websocket) in connections:
            connections.remove((user_id, websocket))
            logger.info("WS disconnect room=%s user=%s remaining=%s", room_id, user_id, len(connections))
        if not connections:
            self.active_connections.pop(room_id, None)

    async def broadcast(self, room_id: int, message: dict):
        connections = self.active_connections.get(room_id, [])
        logger.info("WS broadcast room=%s connections=%s", room_id, len(connections))
        for uid, websocket in connections:
            try:
                await websocket.send_json(message)
                logger.info("WS sent to user=%s", uid)
            except Exception as exc:
                logger.warning("WS send failed to user=%s: %s", uid, exc)

    async def send_to_user(self, room_id: int, user_id: int, message: dict):
        connections = self.active_connections.get(room_id, [])
        for uid, websocket in connections:
            if uid == user_id:
                try:
                    await websocket.send_json(message)
                except Exception:
                    pass


chat_manager = ChatConnectionManager()
