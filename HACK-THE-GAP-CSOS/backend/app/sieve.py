from __future__ import annotations

import json
from typing import Any

from .agents import enrich_anpr_alert, generate_dispatch_plan
from .db_connector import log_verified_threat


VERIFICATION_THRESHOLD = 5
THREAT_TTL_SECONDS = 5


async def process_threat(
    payload: dict[str, Any],
    redis_client: Any,
    websocket_manager: Any,
    db_pool: Any,
    rto_db: Any = None,
) -> dict[str, Any]:
    threat_key = (
        f"threat:{payload['camera_id']}:{payload['class']}:{payload['bbox'][0]}:{payload['bbox'][1]}"
    )

    counter = await redis_client.incr(threat_key)
    if counter == 1:
        await redis_client.expire(threat_key, THREAT_TTL_SECONDS)

    verified = counter >= VERIFICATION_THRESHOLD

    result = {
        "verified": verified,
        "counter": counter,
        "threat_key": threat_key,
        "threshold": VERIFICATION_THRESHOLD,
    }

    if verified:
        if payload.get("class") == "anpr" and rto_db is not None:
            enriched_payload = await enrich_anpr_alert(payload, rto_db)
        else:
            enriched_payload = payload

        await log_verified_threat(enriched_payload, pool=db_pool)

        sop_context = str(
            enriched_payload.get(
                "sop_context",
                "Apply standard CSMC incident SOP with highest priority for life safety and traffic continuity.",
            )
        )
        dispatch_plan = await generate_dispatch_plan(enriched_payload, sop_context)

        alert_payload = {
            "type": "verified_threat",
            "threat_key": threat_key,
            "payload": enriched_payload,
            "dispatch_plan": dispatch_plan,
        }

        dept_map = {
            "weapon": "police",
            "hazard": "police",
            "garbage": "sanitation",
            "anpr": "rto",
        }
        target_dept = dept_map.get(str(enriched_payload.get("class", "")).lower(), "god-view")
        await websocket_manager.broadcast_to_dept(json.dumps(alert_payload), target_dept)

    return result
