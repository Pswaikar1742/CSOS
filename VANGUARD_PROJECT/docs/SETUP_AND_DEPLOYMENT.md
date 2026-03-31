# CSOS v2.0: Setup & Deployment Guide

## Quick Start (Development)

### Prerequisites
- **Docker & Docker Compose** (v20.10+)
- **Node.js** (v18+) — for frontend development
- **Python** (v3.9+) — for backend development
- **Git** (for version control)

### 1. Clone & Navigate

```bash
git clone https://github.com/<your-org>/CSOS.git
cd HACK-THE-GAP-CSOS
```

### 2. Environment Setup

**Frontend Configuration:**
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your backend URL
```

**.env.local contents:**
```env
NEXT_PUBLIC_BACKEND_HTTP_BASE=http://localhost:8000
NEXT_PUBLIC_BACKEND_WS_BASE=ws://localhost:8000
```

**Backend Configuration:**
```bash
cd backend
cp .env.example .env
# Edit .env with database and Redis URLs
```

**.env contents:**
```env
DATABASE_URL=postgresql://csos_user:csos_pass@db:5432/csos_db
REDIS_URL=redis://redis:6379
DEBUG=False
PYTHONUNBUFFERED=1
```

### 3. Docker Compose Deployment

```bash
# Build and start all services
docker-compose up -d

# Check service status
docker-compose ps
```

**Expected Output:**
```
NAME                    STATUS
csos-frontend          Up (localhost:3000)
csos-backend           Up (localhost:8000)
csos-db                Up (localhost:5432)
csos-redis             Up (localhost:6379)
```

### 4. Access the Application

| Service | URL | Default Login |
|---------|-----|---|
| **Frontend** | http://localhost:3000 | — |
| **API Docs** | http://localhost:8000/docs | — |
| **Database** | localhost:5432 | `csos_user / csos_pass` |

### 5. Test the System

```bash
# Run integration tests
bash scripts/test_integration.sh

# Expected: All 8 tests pass
```

---

## Container Architecture

### docker-compose.yml Overview

```yaml
services:
  frontend:
    image: hack-the-gap-csos-frontend:latest
    ports: ["3000:3000"]
    environment:
      NEXT_PUBLIC_BACKEND_HTTP_BASE: http://backend:8000
      NEXT_PUBLIC_BACKEND_WS_BASE: ws://backend:8000
    depends_on:
      - backend
    networks:
      - csos-network

  backend:
    image: hack-the-gap-csos-backend:latest
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql://csos_user:csos_pass@db:5432/csos_db
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis
    networks:
      - csos-network
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

  db:
    image: postgis/postgis:15-3.3
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: csos_user
      POSTGRES_PASSWORD: csos_pass
      POSTGRES_DB: csos_db
    volumes:
      - csos-db-data:/var/lib/postgresql/data
    networks:
      - csos-network

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    networks:
      - csos-network
```

---

## Frontend Setup (Development)

### Install Dependencies

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
# Frontend available at http://localhost:3000
# Hot reload enabled
```

### Build for Production

```bash
npm run build
npm run start
```

### Linting & Type Checking

```bash
npm run lint    # Run ESLint
npm run type    # Run TypeScript compiler
```

---

## Backend Setup (Development)

### Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Initialize Database

```bash
# Run migrations (if using Alembic)
alembic upgrade head

# Seed initial data
python app/seed_db.py
```

### Start API Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**API Documentation:** http://localhost:8000/docs (Swagger UI)

---

## Database Setup

### PostgreSQL + PostGIS

**Create Database:**
```bash
psql -U postgres -h localhost
CREATE DATABASE csos_db OWNER csos_user;
\c csos_db
CREATE EXTENSION postgis;
```

**Create Tables:**
```sql
-- Incidents table
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    incident_id VARCHAR(50) UNIQUE,
    type VARCHAR(100),
    dept VARCHAR(50),
    location VARCHAR(200),
    lat NUMERIC(10, 8),
    lng NUMERIC(11, 8),
    confidence NUMERIC(3, 2),
    status VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Geospatial index
CREATE INDEX idx_incidents_location ON incidents USING GIST(
    ST_SetSRID(ST_Point(lng, lat), 4326)
);

-- Status index
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_dept ON incidents(dept);
```

**Unit Registry:**
```sql
CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    dept VARCHAR(50),
    unit_type VARCHAR(50),  -- officer, vehicle, crew
    unit_id VARCHAR(100) UNIQUE,
    call_sign VARCHAR(50),
    status VARCHAR(50),     -- available, on_duty, on_call
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Environment-Specific Deployments

### Staging (Azure Container Apps)

```bash
# Build and push image
docker build -t csos-backend:v1.0 ./backend
docker tag csos-backend:v1.0 myregistry.azurecr.io/csos-backend:v1.0
docker push myregistry.azurecr.io/csos-backend:v1.0

# Deploy to ACA
az containerapp create \
  --image myregistry.azurecr.io/csos-backend:v1.0 \
  --name csos-backend-staging \
  --environment staging \
  --target-port 8000 \
  --ingress external
```

### Production (Kubernetes)

```bash
# Create namespace
kubectl create namespace csos-prod

# Deploy using Helm
helm install csos ./helm-charts/csos \
  --namespace csos-prod \
  --values helm-charts/csos/values-prod.yaml
```

---

## Troubleshooting

### Frontend Won't Load

**Symptom:** White screen at http://localhost:3000

**Solution:**
```bash
# Check backend connectivity
curl http://localhost:8000/api/health

# Check frontend build
npm run build
npm run start
```

### Backend API Errors

**Symptom:** 500 errors from /api/incidents

**Check logs:**
```bash
docker-compose logs csos-backend
```

**Common fixes:**
- Database not initialized: Run `python app/seed_db.py`
- Redis not running: `docker-compose up -d redis`
- Environment variables missing: Copy `.env.example` → `.env`

### Database Connection Issues

**Symptom:** `psycopg2.OperationalError: could not connect to server`

**Verify:**
```bash
# Check PostgreSQL running
docker-compose exec db psql -U csos_user -d csos_db -c "SELECT 1"

# Test from backend container
docker-compose exec backend python -c "import psycopg2; conn = psycopg2.connect(...)"
```

### WebSocket Connection Failures

**Symptom:** Incidents not appearing in real-time

**Check:**
```bash
# Verify WebSocket endpoint
curl -i http://localhost:8000/ws/client1?dept=police

# Should return 101 Switching Protocols
```

---

## Performance Tuning

### Database Query Optimization

**Enable query logging:**
```sql
ALTER SYSTEM SET log_min_duration_statement = 100;  -- Log queries > 100ms
SELECT pg_reload_conf();
```

**Analyze slow queries:**
```sql
EXPLAIN ANALYZE
SELECT * FROM incidents 
WHERE dept = 'police' AND status = 'AWAITING_VERIFICATION'
ORDER BY created_at DESC
LIMIT 50;
```

### Redis Cache Optimization

**Monitor cache hit ratio:**
```bash
redis-cli INFO stats | grep keyspace_hits
```

**Clear cache (if needed):**
```bash
redis-cli FLUSHDB
```

### Frontend Bundle Size

```bash
npm run build
# Check build output for large modules
npx webpack-bundle-analyzer frontend/.next/static/webpack/...
```

---

## Scaling to Production

### Horizontal Scaling

**Backend:**
```yaml
# docker-compose-prod.yml
services:
  backend:
    image: csos-backend:v1.0
    deploy:
      replicas: 3
    environment:
      - DATABASE_URL=postgresql://...
```

**Load Balancer:** Use nginx or Azure Load Balancer

### Database Scaling

**Read Replicas:**
```sql
-- On primary
SELECT pg_start_backup('backup', false);

-- Promote replica when needed
SELECT pg_wal_replay_resume();
```

**Connection Pooling:**
```env
PGBOUNCER_POOL_MODE=transaction
PGBOUNCER_MAX_CLIENT_CONN=1000
PGBOUNCER_DEFAULT_POOL_SIZE=25
```

### Caching Strategy

**Redis Persistence:**
```redis
CONFIG SET save "900:1 300:10 60:10000"
# Save if 900 sec passed with >= 1 key change
```

---

## Monitoring & Alerts

### Application Performance Monitoring (APM)

**Setup Application Insights:**
```bash
# Add to backend
pip install opencensus-ext-azure

# Add to frontend
npm install @azure/monitor-opentelemetry
```

### Health Check Endpoints

```bash
# Frontend health
curl http://localhost:3000/api/health

# Backend health
curl http://localhost:8000/api/health

# Database health
curl http://localhost:8000/api/db-status
```

### Alert Triggers

- API response time > 1000ms
- Database query time > 500ms
- WebSocket disconnects > 5 per minute
- Incident queue growing (backlog detected)

---

## Backup & Disaster Recovery

### Database Backup

```bash
# Automated daily backup
docker-compose exec db pg_dump -U csos_user csos_db > backup_$(date +%Y%m%d).sql

# Restore from backup
docker-compose exec db psql -U csos_user csos_db < backup_20240101.sql
```

### Environmental Backup

```bash
# Archive all configs
tar -czf csos-backup-$(date +%Y%m%d).tar.gz \
  docker-compose.yml \
  .env \
  frontend/.env.local \
  backend/app/seed_db.py
```

---

*CSOS is designed for high-availability, multi-department operations. This guide ensures consistent, reproducible deployments across development, staging, and production environments.*
