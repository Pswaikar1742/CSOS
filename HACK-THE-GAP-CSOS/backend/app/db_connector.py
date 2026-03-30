from __future__ import annotations

from typing import Any

from redis.asyncio import Redis


def get_redis_connection() -> Redis:
    return Redis(host="localhost", port=6379, decode_responses=True)


async def connect_to_db() -> Any:
    return None


async def disconnect_from_db() -> None:
    return None
