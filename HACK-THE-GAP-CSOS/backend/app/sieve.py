from __future__ import annotations

import json
from typing import Any

from .agents import enrich_anpr_alert
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

		alert_payload = {
			"type": "verified_threat",
			"threat_key": threat_key,
			"counter": counter,
			"payload": enriched_payload,
		}
		await websocket_manager.broadcast(json.dumps(alert_payload))

	return result
