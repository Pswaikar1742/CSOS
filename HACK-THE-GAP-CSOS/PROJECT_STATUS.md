# CSOS Phase Tracker

## Current Phase Position
- **Backend lane:** Late **Phase 2** (Neural Merge) baseline is in place.
- **Project overall:** Between **Phase 0 and Phase 1** completion because infra/frontend/data assets are still incomplete.

## Phase-by-Phase Status

### 🟢 Phase 0: Skeleton (Hours 0-2)
**Done**
- Repo and branch strategy initialized.
- Backend skeleton with FastAPI health endpoint is present.

**Remaining / Blocked**
- `docker-compose.yml` is present but not yet provisioned with Redis/Postgres services in this branch.
- Frontend scaffold (`package.json`, routes) is not completed in this branch.
- Vision stream `.mp4` files are missing from `vision/streams/`.
- Data seed files (RTO + police blacklist) are not prepared.

### 🟡 Phase 1: Engine & Eyes (Hours 2-8)
**Done**
- Redis TTL Sieve exists and verifies threats deterministically.
- Vision emulator exists and replays JSON detections with timed POST calls.

**Remaining / Blocked**
- `/webhook/vision` alias endpoint not added yet (currently `/api/ingest`).
- `DEMO_MODE=True` runtime switch not formalized as config.
- Frontend dark UI + Mapbox + Neural Stream still pending.
- Enterprise README/pitch narrative doc not yet assembled at project root.

### 🟠 Phase 2: Neural Merge (Hours 8-14)
**Done**
- WebSocket server route is implemented in backend.
- Verified incidents are logged to Postgres table `verified_incidents`.
- ANPR enrichment agent is integrated (CSV lookup -> enriched payload broadcast).

**Remaining / Blocked**
- Required SQL-style ANPR JOIN workflow is not fully implemented (currently DataFrame enrichment path).
- LangGraph + FastRouter WhatsApp NLP webhook not integrated yet.
- Frontend socket integration and live map blips are pending.
- End-to-end timing calibration (video ↔ backend ↔ UI) not validated.

### 🔴 Phase 3: Aegis Polish (Hours 14-20)
**Done**
- Core broadcast pipeline works.

**Remaining / Blocked**
- RBAC filtering by role/route (Police/RTO/Sanitation channel segregation) pending.
- HITL actions (`VERIFY & DISPATCH`, `DISMISS`) pending.
- Failsafe recording workflow pending.

### 🟣 Phase 4: Lockdown & Rehearsal (Hours 20-24)
**Done**
- Not started.

**Remaining / Blocked**
- Freeze, 5x happy-path rehearsals, red-team Q&A prep, cold boot validation, and final `main` release are pending.

## Immediate Next 6 Tasks (Priority)
1. Implement full `docker-compose.yml` (Redis + Postgres/PostGIS + backend service wiring).
2. Populate `data/anpr_rto_db.csv` and `data/police_blacklist.csv` with realistic mock rows.
3. Add `/webhook/vision` endpoint alias and a `DEMO_MODE` config switch.
4. Implement RBAC event channels for WebSocket broadcast segregation.
5. Complete frontend bootstrap and wire live WebSocket map updates.
6. Build LangGraph/FastRouter WhatsApp extraction path for pothole/garbage reports.