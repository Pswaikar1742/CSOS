from __future__ import annotations

import json
from collections.abc import Iterable

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str) -> None:
        payload = self._parse_json_message(message)
        stale_connections: list[WebSocket] = []

        for connection in self._snapshot_connections():
            try:
                await connection.send_json(payload)
            except Exception:
                stale_connections.append(connection)

        for stale_connection in stale_connections:
            self.disconnect(stale_connection)

    def _snapshot_connections(self) -> Iterable[WebSocket]:
        return tuple(self.active_connections)

    @staticmethod
    def _parse_json_message(message: str) -> dict:
        try:
            payload = json.loads(message)
            if isinstance(payload, dict):
                return payload
            return {"data": payload}
        except json.JSONDecodeError:
            return {"message": message}
