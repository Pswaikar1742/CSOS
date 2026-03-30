from __future__ import annotations

import asyncio
import hashlib
import json
import random
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from .agents import load_rto_db
from .asset_registry import resolve_nearest_unit
from .db_connector import (
    connect_to_db,
    disconnect_from_db,
    ensure_verified_incidents_table,
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

        return {
            "accepted": True,
            "incident_id": incident_id,
            "status": "DISPATCHED",
            "assigned_unit": assigned_unit,
            "audit_hash": f"SHA256-{audit_hash}",
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
    import io
    
    try:
        import cv2
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="OpenCV not available for frame generation"
        )
    
    async def frame_generator() -> Any:
        """Generate MJPEG frames at ~15fps."""
        try:
            frame_count = 0
            frame_width, frame_height = 640, 480
            
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
                # Create a mock frame (gradient + timestamp + camera label)
                frame = cv2.Mat(frame_height, frame_width, cv2.CV_8UC3)
                
                # Fill with gradient background
                for y in range(frame_height):
                    color_val = int(20 + (y / frame_height) * 100)
                    frame[y, :] = [color_val, color_val + 20, color_val + 40]
                
                # Add timestamp
                timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                cv2.putText(
                    frame,
                    timestamp,
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (100, 255, 100),
                    2
                )
                
                # Add camera label
                cv2.putText(
                    frame,
                    f"[LIVE] {camera_label}",
                    (10, 70),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.9,
                    (50, 200, 255),
                    2
                )
                
                # Add mock threat indicator
                threat_types = ["NO THREAT", "WEAPON DETECTED", "COLLISION DETECTED", "POTHOLE DETECTED"]
                threat_idx = frame_count % 4
                threat_color = (0, 255, 0) if threat_idx == 0 else (0, 0, 255)
                cv2.putText(
                    frame,
                    f"Status: {threat_types[threat_idx]}",
                    (10, frame_height - 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    threat_color,
                    2
                )
                
                # Encode frame as JPEG
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                frame_bytes = buffer.tobytes()
                
                # Yield MJPEG boundary and frame
                yield (
                    b'--frameboundary\r\n'
                    b'Content-Type: image/jpeg\r\n'
                    b'Content-Length: ' + str(len(frame_bytes)).encode() + b'\r\n\r\n'
                    + frame_bytes + b'\r\n'
                )
                
                frame_count += 1
                await asyncio.sleep(0.067)  # ~15fps
                
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