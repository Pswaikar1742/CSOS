# 🧠 BACKEND CORE INSTRUCTIONS (Role: Architect)
**Goal:** Build the Neuro-Symbolic Sieve and the Inter-Agency Router.

### Phase 1 (Hours 0-4): The Sieve 
1. Initialize FastAPI with `uvicorn`.
2. Connect to `redis.asyncio` (localhost:6379).
3. Create `POST /api/ingest` to receive JSON from the Vision Emulator.
4. Implement the Math Sieve: When JSON hits, store `Threat_{ID}` in Redis with a 5-second TTL. If the same threat hits 5 times before TTL expires, push to Postgres.

### Phase 2 (Hours 4-10): The Router & WebSockets
1. Connect to Postgres/PostGIS (localhost:5432).
2. Build `ws://localhost:8000/ws`. When a threat clears the Redis Sieve, emit the JSON payload to connected Frontend clients.
3. Build the LangGraph agent using FastRouter/Claude API to handle WhatsApp NLP inputs.

**RULES:** Async everything. Keep FastAPI stateless.