from __future__ import annotations

import asyncio
import os
import random
import uuid
from datetime import datetime, timedelta, timezone

import asyncpg


CSN_BOUNDS = {
    "lat_min": 19.84,
    "lat_max": 19.91,
    "lng_min": 75.30,
    "lng_max": 75.38,
}

THREAT_TYPES = ["weapon", "garbage", "anpr", "hazard"]
STATUS_OPTIONS = ["AWAITING_VERIFICATION", "DISPATCHED", "RESOLVED", "DISMISSED"]


def rand_coord(min_value: float, max_value: float) -> float:
    return round(random.uniform(min_value, max_value), 6)


def build_incident_row(index: int) -> tuple[str, str, str, datetime, float, float, str]:
    incident_id = str(uuid.uuid4())
    camera_id = f"HIST_CAM_{(index % 8) + 1:02d}"
    threat_type = random.choice(THREAT_TYPES)
    status = random.choice(STATUS_OPTIONS)

    created_at = datetime.now(timezone.utc) - timedelta(minutes=random.randint(10, 60 * 24 * 15))
    latitude = rand_coord(CSN_BOUNDS["lat_min"], CSN_BOUNDS["lat_max"])
    longitude = rand_coord(CSN_BOUNDS["lng_min"], CSN_BOUNDS["lng_max"])

    return incident_id, camera_id, threat_type, created_at, latitude, longitude, status


async def seed_incident_history(total_rows: int = 50) -> None:
    db_host = os.getenv("POSTGRES_HOST", "localhost")
    db_port = int(os.getenv("POSTGRES_PORT", "5432"))
    db_name = os.getenv("POSTGRES_DB", "csos")
    db_user = os.getenv("POSTGRES_USER", "postgres")
    db_password = os.getenv("POSTGRES_PASSWORD", "postgres")

    connection = await asyncpg.connect(
        host=db_host,
        port=db_port,
        database=db_name,
        user=db_user,
        password=db_password,
    )

    try:
        await connection.execute(
            """
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
        )

        rows = [build_incident_row(index) for index in range(total_rows)]

        await connection.executemany(
            """
            INSERT INTO verified_incidents
                (incident_id, camera_id, threat_type, timestamp, latitude, longitude, status)
            VALUES
                ($1::uuid, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (incident_id) DO NOTHING;
            """,
            rows,
        )

        print(f"Seeded incident history rows: {len(rows)}")
    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.run(seed_incident_history(total_rows=50))
