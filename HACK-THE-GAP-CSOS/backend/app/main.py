from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .agents import load_rto_db
from .db_connector import (
    connect_to_db,
    disconnect_from_db,
    ensure_verified_incidents_table,
    get_redis_connection,
)
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
    app.state.db_pool = await connect_to_db()
    await ensure_verified_incidents_table(app.state.db_pool)
    app.state.rto_db = load_rto_db()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    redis_client = getattr(app.state, "redis", None)
    db_pool = getattr(app.state, "db_pool", None)
    if redis_client is not None:
        await redis_client.aclose()
    await disconnect_from_db(db_pool)


@app.get("/health")
async def health() -> dict[str, Any]:
    redis_client = app.state.redis
    redis_info = await redis_client.info("memory")
    db_pool = getattr(app.state, "db_pool", None)
    return {
        "status": "ok",
        "redis_memory": {
            "used_memory": redis_info.get("used_memory"),
            "used_memory_human": redis_info.get("used_memory_human"),
        },
        "postgres_pool": {
            "connected": db_pool is not None,
        },
    }


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str, dept: str = "god-view") -> None:
    await manager.connect(websocket, dept)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, dept)
    except Exception:
        manager.disconnect(websocket, dept)


@app.post("/api/ingest")
async def ingest(payload: dict[str, Any]) -> dict[str, Any]:
    redis_client = app.state.redis
    db_pool = app.state.db_pool
    rto_db = getattr(app.state, "rto_db", None)

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

    sieve_result = await process_threat(
        payload=payload,
        redis_client=redis_client,
        websocket_manager=manager,
        db_pool=db_pool,
        rto_db=rto_db,
    )

    return {
        "accepted": True,
        "sieve": sieve_result,
    }
