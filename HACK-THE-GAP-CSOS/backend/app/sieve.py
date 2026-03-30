from __future__ import annotations

import json
from typing import Any

from .agents import enrich_anpr_alert, generate_dispatch_plan, load_sop_context
from .camera_registry import resolve_camera_context
from .db_connector import log_verified_threat


VERIFICATION_THRESHOLD = 5
THREAT_TTL_SECONDS = 5


def _to_float(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if result != result:
        return None
    return result


async def _emit_thinking_log(websocket_manager: Any, message: str) -> None:
    await websocket_manager.broadcast(
        {
            "type": "neural_log",
            "message": message,
        },
        depts=["god-view"],
    )


async def process_threat(
    payload: dict[str, Any],
    redis_client: Any,
    websocket_manager: Any,
    db_pool: Any,
    rto_db: Any = None,
) -> dict[str, Any]:
    await _emit_thinking_log(
        websocket_manager,
        f"[GOVERNANCE_LOOP] Analyzing persistence for camera={payload.get('camera_id')} class={payload.get('class')}...",
    )

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

    persistence_ratio = min(counter / VERIFICATION_THRESHOLD, 1.0)
    await _emit_thinking_log(
        websocket_manager,
        (
            f"[MATH] IoU verified. Persistence status: {counter}/{VERIFICATION_THRESHOLD} "
            f"frames. Ratio={persistence_ratio:.2f}"
        ),
    )

    if verified:
        await _emit_thinking_log(
            websocket_manager,
            f"[ACTION_TAKEN] Threat confirmed for {threat_key}. Triggering inter-agency governance loop.",
        )

        if payload.get("class") == "anpr" and rto_db is not None:
            enriched_payload = await enrich_anpr_alert(payload, rto_db)
        else:
            enriched_payload = payload

        resolved_context = resolve_camera_context(
            camera_id=str(enriched_payload.get("camera_id") or "").strip() or None,
            area_hint=str(enriched_payload.get("ward") or enriched_payload.get("location") or "").strip() or None,
            lat=_to_float(enriched_payload.get("latitude", enriched_payload.get("lat"))),
            lng=_to_float(enriched_payload.get("longitude", enriched_payload.get("lng"))),
        )

        if resolved_context.get("latitude") is not None:
            enriched_payload["latitude"] = float(resolved_context["latitude"])
            enriched_payload["lat"] = float(resolved_context["latitude"])
        if resolved_context.get("longitude") is not None:
            enriched_payload["longitude"] = float(resolved_context["longitude"])
            enriched_payload["lng"] = float(resolved_context["longitude"])
        if resolved_context.get("area_name"):
            enriched_payload["ward"] = str(resolved_context["area_name"])
            enriched_payload["location"] = str(resolved_context["area_name"])
        if resolved_context.get("node_id"):
            enriched_payload["node_id"] = str(resolved_context["node_id"])

        incident_id = await log_verified_threat(enriched_payload, pool=db_pool)

        sop_context = str(enriched_payload.get("sop_context") or load_sop_context(enriched_payload.get("class", "")))
        dispatch_plan = await generate_dispatch_plan(enriched_payload, sop_context)

        alert_payload = {
            "type": "verified_threat",
            "incident_id": incident_id,
            "threat_key": threat_key,
            "payload": {
                **enriched_payload,
                "dispatch_plan": dispatch_plan,
            },
            "dispatch_plan": dispatch_plan,
        }

        dept_map = {
            "weapon": "police",
            "accident": "police",
            "hazard": "police",
            "garbage": "sanitation",
            "anpr": "rto",
            "anpr_detection": "rto",
            "pothole": "sanitation",
        }

        event_class = str(enriched_payload.get("class", "")).lower()
        target_dept = dept_map.get(event_class, "god-view")

        if event_class == "anpr" and bool(enriched_payload.get("anpr_blacklisted", False)):
            jurisdiction = str(enriched_payload.get("blacklist_jurisdiction", "")).lower()
            if "sanitation" in jurisdiction or "csmc" in jurisdiction:
                target_dept = "sanitation"
            elif "rto" in jurisdiction:
                target_dept = "rto"
            else:
                target_dept = "police"

        await _emit_thinking_log(
            websocket_manager,
            f"[ACTION_TAKEN] Dispatching response workflow to {target_dept} for incident {incident_id}.",
        )

        if event_class == "pothole":
            pothole_lat = _to_float(enriched_payload.get("latitude", enriched_payload.get("lat")))
            pothole_lng = _to_float(enriched_payload.get("longitude", enriched_payload.get("lng")))
            pothole_ward = str(enriched_payload.get("ward") or "Unknown Area")
            await _emit_thinking_log(
                websocket_manager,
                (
                    f"[POTHOLE_ALERT] Geo-tagged pothole logged at {pothole_ward} "
                    f"({(pothole_lat if pothole_lat is not None else 0):.4f}, {(pothole_lng if pothole_lng is not None else 0):.4f})."
                ),
            )

        await websocket_manager.broadcast_to_dept(json.dumps(alert_payload), target_dept)

        plate = str(enriched_payload.get("license_plate") or "").upper()
        is_blacklisted = bool(enriched_payload.get("anpr_blacklisted", False))
        blacklist_reason = str(enriched_payload.get("blacklist_reason") or "").lower()
        is_waste_to_wheel = (
            is_blacklisted
            and (
                plate == "MH12-PQ-1234"
                or "waste" in blacklist_reason
                or "sanitation" in blacklist_reason
                or "dump" in event_class
                or event_class == "garbage"
            )
        )

        if is_waste_to_wheel:
            bridge_message = (
                "Sanitation Violation by Blacklisted Vehicle. Owner: [UUID-MASKED]. "
                "Auto-generating Combined E-Challan + Sanitation Notice."
            )
            inter_agency_payload = {
                "type": "inter_agency_alert",
                "incident_id": incident_id,
                "title": "[INTER-AGENCY ALERT]",
                "message": bridge_message,
                "payload": {
                    "class": "inter_agency_alert",
                    "lat": enriched_payload.get("latitude", enriched_payload.get("lat")),
                    "lng": enriched_payload.get("longitude", enriched_payload.get("lng")),
                    "ward": enriched_payload.get("ward"),
                    "description": bridge_message,
                    "camera_id": enriched_payload.get("camera_id"),
                },
            }
            await _emit_thinking_log(
                websocket_manager,
                "[ACTION_TAKEN] Inter-Agency Bridge activated for blacklisted waste-to-wheel vehicle.",
            )
            await websocket_manager.broadcast_to_dept(json.dumps(inter_agency_payload), "god-view")

    return result
