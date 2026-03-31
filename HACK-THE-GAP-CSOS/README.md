# CSOS v2.0 — City Safety & Operations System

CSOS is an Integrated Command & Control Centre (ICCC) platform for city operations, designed around Chhatrapati Sambhajinagar use cases. It unifies Police, RTO, and Sanitation incident workflows into a single real-time command experience powered by computer vision, geospatial intelligence, and role-based dashboards.

## Highlights

- Multi-department command center: Police, RTO, Sanitation, and God View
- Real-time incident ingestion, routing, and status lifecycle
- Live map intelligence with camera nodes and incident overlays
- WebSocket-based event streaming by department
- Backend APIs for incidents, KPIs, ingest, dispatch, and camera streams
- Optional vision pipeline for threat detection and ANPR-aligned workflows

## System Architecture

### Frontend (`Next.js`)
- Role-based dashboards under `frontend/src/app/(protected)`
- Reusable UI modules in `frontend/src/components`
- Real-time socket integration in `frontend/src/lib/socket.ts`

### Backend (`FastAPI`)
- API + WebSocket service in `backend/app/main.py`
- Threat processing and routing in `backend/app/sieve.py` and `backend/app/agents.py`
- Data access and incident summaries via `backend/app/db_connector.py`

### Data Layer
- PostgreSQL/PostGIS for incident persistence and geospatial queries
- Redis for runtime caching/deduplication logic and fast state handling

### Vision Layer (Optional in local dev)
- Detection/stream tooling in `vision/`
- Multi-stream detector entrypoint in `vision/multi_stream_detector.py`

## Repository Layout

```text
HACK-THE-GAP-CSOS/
├── backend/            # FastAPI service, agents, DB connector, registry
├── frontend/           # Next.js app (role dashboards + map UI)
├── vision/             # CV pipeline and stream/detection modules
├── data/               # Seed and support datasets
├── docs/               # Architecture, setup, and roadmap docs
├── scripts/            # Integration and validation scripts
└── docker-compose.yml  # Full local stack
```

## Prerequisites

- Docker + Docker Compose
- Node.js 18+
- Python 3.10+ (3.11 recommended)
- Git

## Quick Start (Recommended: Docker)

From repo root:

```bash
docker compose up -d --build
```

Services:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Docs (Swagger): `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Stop services:

```bash
docker compose down
```

## Local Development (Without Docker)

### 1) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

Note: `python main.py` will fail because the entrypoint is package-based (`app.main`).

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

### 3) Vision Engine (Optional)

From workspace root (if using a root virtual env):

```bash
source .venv/bin/activate && cd vision && python multi_stream_detector.py
```

Or create/install dependencies in `vision/` first:

```bash
cd vision
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python multi_stream_detector.py
```

## Configuration

### Frontend env (`frontend/.env.local`)

```env
NEXT_PUBLIC_BACKEND_HTTP_BASE=http://localhost:8000
NEXT_PUBLIC_BACKEND_WS_BASE=ws://localhost:8000
# Optional map style override
NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.stadiamaps.com/styles/alidade_smooth.json
```

### Backend env (Docker-aware defaults)

Commonly used variables:

```env
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=csos
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
REDIS_HOST=redis
REDIS_PORT=6379
DATABASE_URL=postgresql://postgres:postgres@db:5432/csos
FASTROUTER_API_KEY=
```

Optional WhatsApp alert configuration:

```env
# Provider selection: meta (default) or twilio
WHATSAPP_PROVIDER=meta

# Shared recipients fallback
WHATSAPP_TO_NUMBERS=919999999999

# Department-specific overrides (examples)
WHATSAPP_TO_POLICE=919999999991,919999999992
WHATSAPP_TO_RTO=919999999993
WHATSAPP_TO_SANITATION=919999999994

# Meta config
WHATSAPP_BEARER_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# Twilio config
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

## Key API Endpoints

- `GET /health` — health + Redis memory + DB pool status
- `GET /api/incidents` — recent incidents
- `GET /api/map-points` — map-ready incident points
- `GET /api/dashboard-summary` — KPI summary + unit counts
- `GET /api/camera-nodes` — camera metadata for overlays
- `POST /api/ingest` — ingest threat payload
- `WS /ws/{client_id}?dept=police|rto|sanitation|god-view` — real-time stream

## Incident Flow

1. Detector/manual event posts to `/api/ingest`
2. Backend validates payload and runs routing/sieve logic
3. Incident is persisted/cached and published to matching WebSocket channels
4. Dashboard clients receive updates and display role-specific queues/maps
5. Dispatch/resolution transitions update operational state and KPIs

## Testing & Validation

Run integration smoke tests:

```bash
bash scripts/test_integration.sh
```

Additional validation scripts:

```bash
bash scripts/integration_test.sh
bash scripts/validate_csos.sh
```

Frontend lint:

```bash
cd frontend && npm run lint
```

## Troubleshooting

- Backend start failure with `python main.py`
	- Use `python -m app.main` from `backend/`.
- Frontend can’t reach backend
	- Check `NEXT_PUBLIC_BACKEND_HTTP_BASE` and backend on `:8000`.
- WebSocket issues
	- Ensure backend is running and connect to `ws://localhost:8000/ws/<id>?dept=god-view`.
- Docker container issues
	- Check logs with `docker compose logs -f backend frontend db redis`.

## Documentation

- `docs/PROJECT_OVERVIEW.md`
- `docs/TECHNICAL_ARCHITECTURE.md`
- `docs/SETUP_AND_DEPLOYMENT.md`
- `docs/ROADMAP_AND_CHECKLIST.md`

## Current Status

The project is actively evolving with ongoing UI, integration, and ops improvements. Use `PROJECT_STATUS.md` and sprint reports for the latest delivery state.

## License

No license file is currently defined in this repository. Add one before public distribution.
