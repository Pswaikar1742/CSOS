#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  COMPOSE_CMD=(docker compose)
fi

echo "[VALIDATE] Starting dependency services (db + redis)..."
"${COMPOSE_CMD[@]}" up -d db redis

echo "[VALIDATE] Waiting for backend health endpoint..."
for _ in {1..60}; do
  if curl -fsS "http://localhost:8000/health" >/dev/null 2>&1; then
    echo "[VALIDATE] Backend healthy."
    break
  fi
  sleep 2
done

if ! curl -fsS "http://localhost:8000/health" >/dev/null 2>&1; then
  echo "[ERROR] Backend health check failed after timeout."
  exit 1
fi

if ! python3 -c "import websockets" >/dev/null 2>&1; then
  echo "[VALIDATE] Installing websockets client dependency..."
  python3 -m pip install --quiet websockets
fi

WS_LOG_FILE="/tmp/csos_ws_validation.log"
rm -f "$WS_LOG_FILE"

echo "[VALIDATE] Starting websocket listener..."
python3 - <<'PY' > "$WS_LOG_FILE" 2>&1 &
import asyncio
import json
import sys
import websockets

WS_URL = "ws://localhost:8000/ws/validate-smoke?dept=god-view"

async def main() -> int:
    timeout_seconds = 45
    async with websockets.connect(WS_URL, ping_interval=20, ping_timeout=20) as websocket:
        await websocket.send("subscribe")
        while timeout_seconds > 0:
            try:
                msg = await asyncio.wait_for(websocket.recv(), timeout=1.0)
            except asyncio.TimeoutError:
                timeout_seconds -= 1
                continue

            try:
                payload = json.loads(msg)
            except json.JSONDecodeError:
                continue

            if payload.get("type") == "verified_threat":
                print("verified_threat_received")
                print(json.dumps(payload))
                return 0

    print("verified_threat_not_received")
    return 1

raise SystemExit(asyncio.run(main()))
PY
WS_PID=$!

sleep 2

echo "[VALIDATE] Sending mock weapon detection frames..."
for frame in {1..5}; do
  curl -fsS -X POST "http://localhost:8000/api/ingest" \
    -H "Content-Type: application/json" \
    -d "{\"camera_id\":\"SMOKE_CAM_01\",\"class\":\"weapon\",\"confidence\":0.97,\"bbox\":[120,220,360,480],\"lat\":19.8762,\"lng\":75.3433,\"description\":\"smoke-test\",\"frame\":$frame}" \
    >/dev/null
  sleep 0.4
done

wait "$WS_PID"

if grep -q "verified_threat_received" "$WS_LOG_FILE"; then
  echo "[VALIDATE] PASS: WebSocket emitted verified_threat payload."
else
  echo "[ERROR] FAIL: WebSocket did not emit verified_threat payload."
  cat "$WS_LOG_FILE"
  exit 1
fi

echo "[VALIDATE] CSOS smoke test completed successfully."
