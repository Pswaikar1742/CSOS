from __future__ import annotations

import json
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .db_connector import disconnect_from_db, get_redis_connection
from .sieve import process_threat
from .websocket_manager import ConnectionManager


app = FastAPI(title="CSOS Backend Core")
manager = ConnectionManager()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    app.state.redis = get_redis_connection()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    redis_client = getattr(app.state, "redis", None)
    if redis_client is not None:
        await redis_client.aclose()
    await disconnect_from_db()


@app.get("/health")
async def health() -> dict[str, Any]:
    redis_client = app.state.redis
    redis_info = await redis_client.info("memory")
    return {
        "status": "ok",
        "redis_memory": {
            "used_memory": redis_info.get("used_memory"),
            "used_memory_human": redis_info.get("used_memory_human"),
        },
    }


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str) -> None:
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@app.post("/api/ingest")
async def ingest(payload: dict[str, Any]) -> dict[str, Any]:
    redis_client = app.state.redis

    required_fields = {"camera_id", "class", "bbox"}
    missing = required_fields - payload.keys()
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required field(s): {', '.join(sorted(missing))}",
        )

    bbox = payload.get("bbox")
    if not isinstance(bbox, list | tuple) or len(bbox) < 2:
        raise HTTPException(
            status_code=422,
            detail="'bbox' must be a list/tuple with at least two coordinates",
        )

    sieve_result = await process_threat(payload, redis_client)

    if sieve_result["verified"]:
        await manager.broadcast(
            json.dumps(
                {
                    "type": "verified_threat",
                    "client_scope": "all",
                    "payload": payload,
                    "sieve": sieve_result,
                }
            )
        )

    return {
        "accepted": True,
        "sieve": sieve_result,
    }
