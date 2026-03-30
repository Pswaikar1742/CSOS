from __future__ import annotations

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = {
            "police": [],
            "rto": [],
            "sanitation": [],
            "god-view": [],
        }

    async def connect(self, websocket: WebSocket, dept: str) -> None:
        await websocket.accept()
        selected_dept = dept if dept in self.active_connections else "god-view"
        self.active_connections[selected_dept].append(websocket)

    def disconnect(self, websocket: WebSocket, dept: str) -> None:
        selected_dept = dept if dept in self.active_connections else "god-view"
        if websocket in self.active_connections[selected_dept]:
            self.active_connections[selected_dept].remove(websocket)

    async def broadcast_to_dept(self, message: str, dept: str) -> None:
        targets = [dept, "god-view"]
        for target in targets:
            for connection in list(self.active_connections.get(target, [])):
                try:
                    await connection.send_text(message)
                except Exception:
                    if connection in self.active_connections.get(target, []):
                        self.active_connections[target].remove(connection)
