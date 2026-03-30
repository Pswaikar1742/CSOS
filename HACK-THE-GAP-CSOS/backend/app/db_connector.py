from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any

import asyncpg
from asyncpg import Pool

from redis.asyncio import Redis


_db_pool: Pool | None = None


def get_redis_connection() -> Redis:
    return Redis(host="localhost", port=6379, decode_responses=True)


async def connect_to_db() -> Pool:
    global _db_pool
    if _db_pool is not None:
        return _db_pool

    db_host = os.getenv("POSTGRES_HOST", "localhost")
    db_port = int(os.getenv("POSTGRES_PORT", "5432"))
    db_name = os.getenv("POSTGRES_DB", "csos")
    db_user = os.getenv("POSTGRES_USER", "postgres")
    db_password = os.getenv("POSTGRES_PASSWORD", "postgres")

    _db_pool = await asyncpg.create_pool(
        host=db_host,
        port=db_port,
        database=db_name,
        user=db_user,
        password=db_password,
        min_size=1,
        max_size=10,
    )
    return _db_pool


async def disconnect_from_db(pool: Pool | None = None) -> None:
    global _db_pool
    target_pool = pool or _db_pool
    if target_pool is not None:
        await target_pool.close()
    _db_pool = None


async def log_verified_threat(payload: dict[str, Any], pool: Pool | None = None) -> None:
    target_pool = pool or _db_pool
    if target_pool is None:
        raise RuntimeError("PostgreSQL pool is not initialized. Call connect_to_db() first.")

    incident_id = str(uuid.uuid4())
    camera_id = str(payload.get("camera_id", "UNKNOWN"))
    threat_type = str(payload.get("class", "unknown"))
    incident_timestamp = payload.get("timestamp")
    if isinstance(incident_timestamp, str):
        try:
            parsed_timestamp = datetime.fromisoformat(incident_timestamp.replace("Z", "+00:00"))
        except ValueError:
            parsed_timestamp = datetime.now(timezone.utc)
    else:
        parsed_timestamp = datetime.now(timezone.utc)

    latitude = float(payload.get("latitude", 19.8762))
    longitude = float(payload.get("longitude", 75.3433))

    query = """
        INSERT INTO verified_incidents
            (incident_id, camera_id, threat_type, timestamp, latitude, longitude)
        VALUES
            ($1, $2, $3, $4, $5, $6)
    """

    async with target_pool.acquire() as connection:
        await connection.execute(
            query,
            incident_id,
            camera_id,
            threat_type,
            parsed_timestamp,
            latitude,
            longitude,
        )
