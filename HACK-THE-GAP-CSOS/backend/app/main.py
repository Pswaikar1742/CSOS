from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import os
import random
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from .agents import load_rto_db
from .asset_registry import resolve_nearest_unit
from .camera_registry import get_camera_nodes
from .db_connector import (
    connect_to_db,
    disconnect_from_db,
    ensure_verified_incidents_table,
    get_incident_summary,
    get_incident_by_id,
    get_recent_incident_points,
    get_redis_connection,
    resolve_incident_status,
)
from .sieve import process_threat
from .websocket_manager import ConnectionManager


app = FastAPI(title="CSOS Backend Core")
manager = ConnectionManager()

CAPABILITY_REGISTRY: dict[str, list[str]] = {
    "police": [
        "Beat Marshal P12 - Kranti Chowk",
        "Beat Marshal P08 - Aurangpura",
    ],
    "sanitation": [
        "Ghanta Gaadi SWM-405 - CIDCO",
        "Ghanta Gaadi SWM-202 - Garkheda",
    ],
    "rto": ["RTO Interceptor Unit-7"],
}


def _parse_recipient_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


def _resolve_whatsapp_recipients(target_dept: str, explicit_recipients: list[str] | None = None) -> list[str]:
    if explicit_recipients:
        return [item for item in explicit_recipients if item]

    dept_key = target_dept.strip().upper().replace("-", "_")
    dept_specific = os.getenv(f"WHATSAPP_TO_{dept_key}", "").strip()
    if dept_specific:
        return _parse_recipient_list(dept_specific)

    return _parse_recipient_list(os.getenv("WHATSAPP_TO_NUMBERS", "").strip())


def _send_meta_whatsapp_message(token: str, phone_number_id: str, recipient: str, message: str) -> None:
    endpoint = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": recipient,
        "type": "text",
        "text": {"body": message},
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        if response.status < 200 or response.status >= 300:
            raise RuntimeError(f"Meta WhatsApp API failed with status {response.status}")


def _send_twilio_whatsapp_message(account_sid: str, auth_token: str, from_number: str, recipient: str, message: str) -> None:
    endpoint = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    payload = urllib.parse.urlencode(
        {
            "From": from_number,
            "To": recipient,
            "Body": message,
        }
    ).encode("utf-8")
    request = urllib.request.Request(endpoint, data=payload, method="POST")
    request.add_header("Content-Type", "application/x-www-form-urlencoded")

    auth_pair = f"{account_sid}:{auth_token}".encode("utf-8")
    auth_value = base64.b64encode(auth_pair).decode("utf-8")
    request.add_header("Authorization", f"Basic {auth_value}")

    with urllib.request.urlopen(request, timeout=10) as response:
        if response.status < 200 or response.status >= 300:
            raise RuntimeError(f"Twilio WhatsApp API failed with status {response.status}")


async def send_whatsapp_alert(
    *,
    target_dept: str,
    message: str,
    incident_id: str,
    explicit_recipients: list[str] | None = None,
) -> dict[str, Any]:
    recipients = _resolve_whatsapp_recipients(target_dept, explicit_recipients)
    if not recipients:
        return {
            "enabled": False,
            "provider": None,
            "sent": 0,
            "failed": 0,
            "errors": ["No recipients configured. Set WHATSAPP_TO_NUMBERS or WHATSAPP_TO_<DEPT>."],
            "incident_id": incident_id,
        }

    provider = os.getenv("WHATSAPP_PROVIDER", "meta").strip().lower() or "meta"
    sent = 0
    failed = 0
    errors: list[str] = []

    if provider == "twilio":
        account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
        auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
        from_number = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886").strip()

        if not account_sid or not auth_token or not from_number:
            return {
                "enabled": False,
                "provider": "twilio",
                "sent": 0,
                "failed": len(recipients),
                "errors": ["Missing Twilio config: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM."],
                "incident_id": incident_id,
            }

        for recipient in recipients:
            to_number = recipient if recipient.startswith("whatsapp:") else f"whatsapp:{recipient}"
            try:
                await asyncio.to_thread(
                    _send_twilio_whatsapp_message,
                    account_sid,
                    auth_token,
                    from_number,
                    to_number,
                    message,
                )
                sent += 1
            except Exception as error:
                failed += 1
                errors.append(f"{to_number}: {error}")
    else:
        token = os.getenv("WHATSAPP_BEARER_TOKEN", "").strip()
        phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()

        if not token or not phone_number_id:
            return {
                "enabled": False,
                "provider": "meta",
                "sent": 0,
                "failed": len(recipients),
                "errors": ["Missing Meta config: WHATSAPP_BEARER_TOKEN and WHATSAPP_PHONE_NUMBER_ID."],
                "incident_id": incident_id,
            }

        for recipient in recipients:
            try:
                await asyncio.to_thread(_send_meta_whatsapp_message, token, phone_number_id, recipient, message)
                sent += 1
            except Exception as error:
                failed += 1
                errors.append(f"{recipient}: {error}")

    return {
        "enabled": True,
        "provider": provider,
        "sent": sent,
        "failed": failed,
        "errors": errors[:5],
        "incident_id": incident_id,
    }

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


@app.get("/api/map-points")
async def map_points(limit: int = 300) -> dict[str, Any]:
    rows = await get_recent_incident_points(limit=limit, pool=app.state.db_pool)
    return {
        "count": len(rows),
        "points": rows,
    }


@app.get("/api/incidents")
async def incidents(limit: int = 300) -> dict[str, Any]:
    rows = await get_recent_incident_points(limit=limit, pool=app.state.db_pool)
    return {
        "count": len(rows),
        "incidents": rows,
    }


@app.get("/api/camera-nodes")
async def camera_nodes() -> dict[str, Any]:
    nodes = get_camera_nodes()
    return {
        "count": len(nodes),
        "nodes": nodes,
    }


@app.get("/api/dashboard-summary")
async def dashboard_summary() -> dict[str, Any]:
    summary = await get_incident_summary(pool=app.state.db_pool)
    return {
        **summary,
        "units": {
            "police": len(CAPABILITY_REGISTRY.get("police", [])),
            "sanitation": len(CAPABILITY_REGISTRY.get("sanitation", [])),
            "rto": len(CAPABILITY_REGISTRY.get("rto", [])),
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


@app.post("/threat")
async def threat(payload: dict[str, Any]) -> dict[str, Any]:
    return await ingest(payload)


@app.post("/api/wa_webhook")
async def wa_webhook(payload: dict[str, Any]) -> dict[str, Any]:
    sender = str(payload.get("sender", "Citizen_Unknown")).strip() or "Citizen_Unknown"
    text = str(payload.get("text", "")).strip()
    if not text:
        raise HTTPException(status_code=422, detail="'text' is required")

    lat = float(payload.get("lat", 19.8732))
    lng = float(payload.get("lng", 75.3262))
    image_url = str(payload.get("image_url", "")).strip()

    normalized_text = text.lower()
    if any(token in normalized_text for token in ("garbage", "dump", "waste", "trash")):
        threat_class = "garbage"
        dept = "sanitation"
    elif any(token in normalized_text for token in ("pothole", "road damage", "road crack", "road hole")):
        threat_class = "pothole"
        dept = "sanitation"
    elif any(token in normalized_text for token in ("plate", "vehicle", "challan", "rto", "number")):
        threat_class = "anpr_detection"
        dept = "rto"
    elif any(token in normalized_text for token in ("weapon", "fight", "kidnap", "gun", "knife", "accident", "crash", "collision")):
        threat_class = "weapon"
        dept = "police"
    else:
        threat_class = "hazard"
        dept = "police"

    incident_id = f"WA-{int(datetime.now(timezone.utc).timestamp())}"
    event_payload: dict[str, Any] = {
        "camera_id": "CITIZEN_WHATSAPP",
        "class": threat_class,
        "confidence": 0.95,
        "bbox": [0, 0, 0, 0],
        "lat": lat,
        "lng": lng,
        "description": f"WhatsApp citizen report: {text}",
        "sender": sender,
        "image_url": image_url,
        "dispatch_plan": "Citizen complaint registered. Routing to ward control desk for action.",
    }

    await manager.broadcast_to_dept(
        json.dumps(
            {
                "type": "verified_threat",
                "incident_id": incident_id,
                "threat_key": incident_id,
                "payload": event_payload,
            }
        ),
        dept,
    )

    return {
        "accepted": True,
        "incident_id": incident_id,
        "ticket": "CSN-882",
        "dept": dept,
        "reply": "Complaint registered. Ticket #CSN-882. Ward Officer Notified. SLA: 48 Hrs.",
    }


@app.post("/api/wa_send_alert")
async def wa_send_alert(payload: dict[str, Any]) -> dict[str, Any]:
    message = str(payload.get("message", "")).strip()
    if not message:
        raise HTTPException(status_code=422, detail="'message' is required")

    dept = str(payload.get("dept", "god-view")).strip() or "god-view"
    incident_id = str(payload.get("incident_id", "MANUAL-ALERT")).strip() or "MANUAL-ALERT"
    recipients_raw = payload.get("recipients")
    explicit_recipients: list[str] | None = None
    if isinstance(recipients_raw, list):
        explicit_recipients = [str(item).strip() for item in recipients_raw if str(item).strip()]

    result = await send_whatsapp_alert(
        target_dept=dept,
        message=message,
        incident_id=incident_id,
        explicit_recipients=explicit_recipients,
    )

    return {
        "accepted": result.get("sent", 0) > 0,
        "dept": dept,
        "incident_id": incident_id,
        "whatsapp": result,
    }


@app.post("/api/hitl-action")
async def hitl_action(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        action = str(payload.get("action", "")).strip().upper()
        incident_id = str(payload.get("incident_id", "")).strip()
        officer_id = str(payload.get("officer_id") or payload.get("role") or "OFFICER-UNSPECIFIED").strip()

        if action != "VERIFIED":
            raise HTTPException(status_code=422, detail="'action' must be VERIFIED")
        if not incident_id:
            raise HTTPException(status_code=422, detail="'incident_id' is required")
        if not officer_id:
            raise HTTPException(status_code=422, detail="'officer_id' is required")

        db_pool = app.state.db_pool
        incident = await get_incident_by_id(incident_id=incident_id, pool=db_pool)
        if incident is None:
            raise HTTPException(status_code=404, detail=f"Incident not found: {incident_id}")

        threat_type = str(incident.get("threat_type", "")).lower()
        dept_map = {
            "weapon": "police",
            "accident": "police",
            "hazard": "police",
            "garbage": "sanitation",
            "anpr": "rto",
            "anpr_detection": "rto",
            "pothole": "sanitation",
        }
        target_dept = dept_map.get(threat_type, str(payload.get("dept", "god-view")))

        local_candidates = CAPABILITY_REGISTRY.get(target_dept, ["Fallback Unit - Manual Dispatch"])
        assigned_unit = random.choice(local_candidates)

        now_iso = datetime.now(timezone.utc).isoformat()
        hash_source = f"{incident_id}-{officer_id}-{now_iso}-{assigned_unit}"
        audit_hash = hashlib.sha256(hash_source.encode("utf-8")).hexdigest()

        updated = await resolve_incident_status(
            incident_id=incident_id,
            action="VERIFIED",
            status="DISPATCHED",
            audit_hash=audit_hash,
            pool=db_pool,
        )
        if updated is None:
            raise HTTPException(status_code=404, detail=f"Incident not found during update: {incident_id}")

        log_sequence = [
            f"[GOVERNANCE] HITL Action Received: VERIFIED by {officer_id}",
            f"[DISPATCH] Locating nearest asset for {incident_id}...",
            f"[DISPATCH] Asset '{assigned_unit}' locked. Simulating Secure Gateway...",
            "[SUCCESS] Work Order dispatched. ETA: 4 mins.",
            f"[AUDIT] SHA-256 Hash Generated: {audit_hash}",
        ]

        for message in log_sequence:
            await manager.broadcast(
                {
                    "type": "neural_log",
                    "message": message,
                },
                depts=[target_dept, "god-view"],
            )
            await asyncio.sleep(0.2)

        incident_resolved_event = {
            "type": "incident_resolved",
            "id": incident_id,
            "incident_id": incident_id,
            "status": "DISPATCHED",
            "dept": target_dept,
            "assigned_unit": assigned_unit,
            "audit_hash": f"SHA256-{audit_hash}",
        }
        await manager.broadcast_to_dept(json.dumps(incident_resolved_event), target_dept)

        wa_message = (
            f"CSOS ALERT | {target_dept.upper()}\n"
            f"Incident: {incident_id}\n"
            f"Type: {str(incident.get('threat_type', 'unknown')).upper()}\n"
            f"Status: DISPATCHED\n"
            f"Assigned Unit: {assigned_unit}\n"
            f"Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC"
        )
        whatsapp_result = await send_whatsapp_alert(
            target_dept=target_dept,
            message=wa_message,
            incident_id=incident_id,
        )

        return {
            "accepted": True,
            "incident_id": incident_id,
            "status": "DISPATCHED",
            "assigned_unit": assigned_unit,
            "audit_hash": f"SHA256-{audit_hash}",
            "whatsapp": whatsapp_result,
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"HITL dispatch pipeline failed: {error}") from error

@app.get("/api/video_feed/{camera_id}")
async def video_feed(camera_id: str) -> Any:
    """
    MJPEG video streaming endpoint.
    Streams 30fps mock frames for demo purposes.
    Format: multipart/x-mixed-replace with JPEG boundaries.
    
    In production, this would connect to the vision detector's frame buffer
    or a Redis-backed frame queue from the multi_stream_detector.py process.
    """
    fallback_jpeg = base64.b64decode(
        "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////"
        "2wBDAf//////////////////////////////////////////////////////////////////////////////////////"
        "wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAVEQEBAAAAAAAAAAAAAAAAAAABAP/"
        "aAAwDAQACEAMQAAAB3A//xAAVEAEBAAAAAAAAAAAAAAAAAAABAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAA"
        "AAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAA"
        "AAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9k="
    )

    try:
        import cv2
        import numpy as np
    except Exception:
        cv2 = None
        np = None
    
    async def frame_generator() -> Any:
        """Generate MJPEG frames at ~15fps."""
        try:
            frame_count = 0
            frame_width, frame_height = 640, 360
            
            # Camera metadata for overlay text
            camera_labels = {
                "CAM_CIDCO_N6": "CIDCO N-6 Residential",
                "CAM_KRANTI_CHOWK": "Kranti Chowk Junction",
                "CAM_AURANGPURA": "Aurangpura Market",
                "CAM_BEED_BYPASS": "Beed Bypass Highway",
                "CAM_RAILWAY_STATION_ROAD": "Railway Station Road",
            }
            camera_label = camera_labels.get(camera_id, camera_id)
            
            while True:
                if cv2 is None or np is None:
                    frame_bytes = fallback_jpeg
                else:
                    frame = np.zeros((frame_height, frame_width, 3), dtype=np.uint8)
                    for y in range(frame_height):
                        color_val = int(20 + (y / frame_height) * 80)
                        frame[y, :] = [color_val, min(color_val + 20, 255), min(color_val + 40, 255)]

                    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                    cv2.putText(frame, timestamp, (12, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (120, 230, 120), 1)
                    cv2.putText(frame, f"[LIVE] {camera_label}", (12, 56), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (80, 200, 255), 2)

                    threat_types = ["NO THREAT", "WEAPON DETECTED", "COLLISION DETECTED", "POTHOLE DETECTED"]
                    threat_idx = frame_count % 4
                    threat_color = (0, 255, 0) if threat_idx == 0 else (0, 0, 255)
                    cv2.putText(
                        frame,
                        f"Status: {threat_types[threat_idx]}",
                        (12, frame_height - 18),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.55,
                        threat_color,
                        2,
                    )

                    ok, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    frame_bytes = buffer.tobytes() if ok else fallback_jpeg
                
                # Yield MJPEG boundary and frame
                yield (
                    b'--frameboundary\r\n'
                    b'Content-Type: image/jpeg\r\n'
                    b'Content-Length: ' + str(len(frame_bytes)).encode() + b'\r\n\r\n'
                    + frame_bytes + b'\r\n'
                )
                
                frame_count += 1
                await asyncio.sleep(0.12)  # ~8fps
                
        except Exception as error:
            print(f"[ERROR] Frame generation failed for {camera_id}: {error}")
            raise
    
    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frameboundary",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Connection": "keep-alive",
        }
    )