from __future__ import annotations

from typing import Any


VERIFICATION_THRESHOLD = 5
THREAT_TTL_SECONDS = 5


async def process_threat(payload: dict[str, Any], redis_client: Any) -> dict[str, Any]:
	threat_key = (
		f"threat:{payload['camera_id']}:{payload['class']}:{payload['bbox'][0]}:{payload['bbox'][1]}"
	)

	counter = await redis_client.incr(threat_key)
	if counter == 1:
		await redis_client.expire(threat_key, THREAT_TTL_SECONDS)

	verified = counter >= VERIFICATION_THRESHOLD
	if verified:
		print(f"✅ THREAT VERIFIED: {threat_key}")

	return {
		"verified": verified,
		"counter": counter,
		"threat_key": threat_key,
		"threshold": VERIFICATION_THRESHOLD,
	}
