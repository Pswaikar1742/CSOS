from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any

import asyncpg
from asyncpg import Pool

from redis.asyncio import Redis
from .camera_registry import resolve_camera_context


_db_pool: Pool | None = None

CREATE_VERIFIED_INCIDENTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS verified_incidents (
    id SERIAL PRIMARY KEY,
    incident_id UUID NOT NULL UNIQUE,
    camera_id VARCHAR(255) NOT NULL,
    threat_type VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status VARCHAR(50) DEFAULT 'AWAITING_VERIFICATION',
    resolution_action VARCHAR(50),
    resolved_at TIMESTAMPTZ,
    audit_hash VARCHAR(64)
);
"""

ENSURE_VERIFIED_INCIDENTS_COLUMNS_SQL = """
ALTER TABLE verified_incidents
    ADD COLUMN IF NOT EXISTS incident_id UUID,
    ADD COLUMN IF NOT EXISTS camera_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS threat_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'AWAITING_VERIFICATION',
    ADD COLUMN IF NOT EXISTS resolution_action VARCHAR(50),
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS audit_hash VARCHAR(64);
"""


def get_redis_connection() -> Redis:
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    return Redis(host=redis_host, port=redis_port, decode_responses=True)


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


async def ensure_verified_incidents_table(pool: Pool | None = None) -> None:
    target_pool = pool or _db_pool
    if target_pool is None:
        raise RuntimeError("PostgreSQL pool is not initialized. Call connect_to_db() first.")

    async with target_pool.acquire() as connection:
        await connection.execute(CREATE_VERIFIED_INCIDENTS_TABLE_SQL)
        await connection.execute(ENSURE_VERIFIED_INCIDENTS_COLUMNS_SQL)


async def log_verified_threat(payload: dict[str, Any], pool: Pool | None = None) -> str:
    target_pool = pool or _db_pool
    if target_pool is None:
        raise RuntimeError("PostgreSQL pool is not initialized. Call connect_to_db() first.")

    incident_id = str(payload.get("incident_id") or uuid.uuid4())
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

    def _to_float(value: Any) -> float | None:
        try:
            result = float(value)
        except (TypeError, ValueError):
            return None
        if result != result:
            return None
        return result

    raw_lat = _to_float(payload.get("latitude", payload.get("lat")))
    raw_lng = _to_float(payload.get("longitude", payload.get("lng")))
    context = resolve_camera_context(
        camera_id=camera_id,
        area_hint=str(payload.get("ward") or payload.get("location") or "").strip() or None,
        lat=raw_lat,
        lng=raw_lng,
    )

    latitude = _to_float(context.get("latitude"))
    longitude = _to_float(context.get("longitude"))
    area_name = str(context.get("area_name") or "").strip()
    node_id = str(context.get("node_id") or "").strip()

    if latitude is not None:
        payload["latitude"] = latitude
        payload["lat"] = latitude
    if longitude is not None:
        payload["longitude"] = longitude
        payload["lng"] = longitude
    if area_name:
        payload["ward"] = area_name
        payload["location"] = area_name
    if node_id:
        payload["node_id"] = node_id

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

    return incident_id


async def resolve_incident_status(
    incident_id: str,
    action: str,
    status: str,
    audit_hash: str,
    pool: Pool | None = None,
) -> dict[str, Any] | None:
    target_pool = pool or _db_pool
    if target_pool is None:
        raise RuntimeError("PostgreSQL pool is not initialized. Call connect_to_db() first.")

    query = """
        UPDATE verified_incidents
        SET status = $2,
            resolution_action = $3,
            resolved_at = CURRENT_TIMESTAMP,
            audit_hash = $4
        WHERE incident_id::text = $1
        RETURNING incident_id::text AS incident_id, threat_type, camera_id, latitude, longitude, status, resolution_action, resolved_at, audit_hash;
    """

    async with target_pool.acquire() as connection:
        row = await connection.fetchrow(query, incident_id, status, action, audit_hash)

    return dict(row) if row else None


async def get_incident_by_id(
    incident_id: str,
    pool: Pool | None = None,
) -> dict[str, Any] | None:
    target_pool = pool or _db_pool
    if target_pool is None:
        raise RuntimeError("PostgreSQL pool is not initialized. Call connect_to_db() first.")

    query = """
        SELECT
            incident_id::text AS incident_id,
            threat_type,
            camera_id,
            latitude,
            longitude,
            status,
            timestamp,
            resolution_action,
            resolved_at,
            audit_hash
        FROM verified_incidents
        WHERE incident_id::text = $1
        LIMIT 1;
    """

    async with target_pool.acquire() as connection:
        row = await connection.fetchrow(query, incident_id)

    return dict(row) if row else None


async def get_recent_incident_map_points(
    limit: int = 200,
    pool: Pool | None = None,
) -> list[dict[str, Any]]:
    target_pool = pool or _db_pool
    if target_pool is None:
        raise RuntimeError("PostgreSQL pool is not initialized. Call connect_to_db() first.")

    bounded_limit = max(1, min(int(limit), 1000))
    query = """
        SELECT
            incident_id::text AS incident_id,
            threat_type,
            camera_id,
            latitude,
            longitude,
            status,
            timestamp,
            CASE
                WHEN LOWER(threat_type) IN ('weapon', 'accident', 'hazard') THEN 'police'
                WHEN LOWER(threat_type) IN ('garbage') THEN 'sanitation'
                WHEN LOWER(threat_type) IN ('pothole') THEN 'sanitation'
                WHEN LOWER(threat_type) IN ('anpr', 'anpr_detection') THEN 'rto'
                ELSE 'god-view'
            END AS dept,
            ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) AS geom_geojson
        FROM verified_incidents
        WHERE latitude IS NOT NULL
          AND longitude IS NOT NULL
        ORDER BY timestamp DESC
        LIMIT $1;
    """

    async with target_pool.acquire() as connection:
        await connection.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        rows = await connection.fetch(query, bounded_limit)

    return [dict(row) for row in rows]


async def get_recent_incident_points(
    limit: int = 300,
    pool: Pool | None = None,
) -> list[dict[str, Any]]:
    target_pool = pool or _db_pool
    if target_pool is None:
        raise RuntimeError("PostgreSQL pool is not initialized. Call connect_to_db() first.")

    normalized_limit = max(1, min(int(limit), 2000))

    query = """
        SELECT
            incident_id::text AS incident_id,
            camera_id,
            threat_type,
            latitude,
            longitude,
            timestamp,
            status,
            CASE
                WHEN lower(threat_type) IN ('weapon', 'accident', 'hazard') THEN 'police'
                WHEN lower(threat_type) IN ('garbage') THEN 'sanitation'
                WHEN lower(threat_type) IN ('pothole') THEN 'sanitation'
                WHEN lower(threat_type) IN ('anpr', 'anpr_detection') THEN 'rto'
                ELSE 'police'
            END AS dept,
            ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)) AS geom
        FROM verified_incidents
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY timestamp DESC
        LIMIT $1;
    """

    async with target_pool.acquire() as connection:
        await connection.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        rows = await connection.fetch(query, normalized_limit)

    enriched_rows: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        context = resolve_camera_context(
            camera_id=str(item.get("camera_id") or "").strip() or None,
            area_hint=str(item.get("ward") or item.get("area_name") or "").strip() or None,
            lat=item.get("latitude"),
            lng=item.get("longitude"),
        )

        if context.get("latitude") is not None:
            item["latitude"] = float(context["latitude"])
        if context.get("longitude") is not None:
            item["longitude"] = float(context["longitude"])

        item["area_name"] = str(context.get("area_name") or item.get("camera_id") or "Unknown Area")
        if context.get("node_id"):
            item["node_id"] = context["node_id"]

        enriched_rows.append(item)

    return enriched_rows


async def get_incident_summary(pool: Pool | None = None) -> dict[str, Any]:
    target_pool = pool or _db_pool
    if target_pool is None:
        raise RuntimeError("PostgreSQL pool is not initialized. Call connect_to_db() first.")

    query = """
        SELECT
            COUNT(*)::int AS total_incidents,
            COUNT(*) FILTER (WHERE status = 'AWAITING_VERIFICATION')::int AS awaiting_verification,
            COUNT(*) FILTER (WHERE status = 'DISPATCHED')::int AS dispatched,
            COUNT(*) FILTER (WHERE status = 'RESOLVED')::int AS resolved,
            COUNT(*) FILTER (WHERE LOWER(threat_type) IN ('weapon', 'accident', 'hazard'))::int AS police_incidents,
            COUNT(*) FILTER (WHERE LOWER(threat_type) IN ('garbage', 'pothole'))::int AS sanitation_incidents,
            COUNT(*) FILTER (WHERE LOWER(threat_type) IN ('anpr', 'anpr_detection'))::int AS rto_incidents,
            MAX(timestamp) AS latest_event_at
        FROM verified_incidents;
    """

    async with target_pool.acquire() as connection:
        row = await connection.fetchrow(query)

    if row is None:
        return {
            "total_incidents": 0,
            "awaiting_verification": 0,
            "dispatched": 0,
            "resolved": 0,
            "by_dept": {
                "police": 0,
                "sanitation": 0,
                "rto": 0,
            },
            "latest_event_at": None,
        }

    item = dict(row)
    return {
        "total_incidents": int(item.get("total_incidents") or 0),
        "awaiting_verification": int(item.get("awaiting_verification") or 0),
        "dispatched": int(item.get("dispatched") or 0),
        "resolved": int(item.get("resolved") or 0),
        "by_dept": {
            "police": int(item.get("police_incidents") or 0),
            "sanitation": int(item.get("sanitation_incidents") or 0),
            "rto": int(item.get("rto_incidents") or 0),
        },
        "latest_event_at": item.get("latest_event_at"),
    }
