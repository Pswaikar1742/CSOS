# BACKEND CHRONICLE
| Time | Task Completed | Next Action | Blockers |
| :--- | :--- | :--- | :--- |
| 09:15 | Repo init, docker-compose up | FastAPI skeleton | None |
| 12:30 | FastAPI core up: `/health`, `/api/ingest`, `/ws/{client_id}` | Add RBAC event routing and webhook alias `/webhook/vision` | None |
| 13:10 | Redis TTL Sieve integrated with Postgres logging (`verified_incidents`) | Add Bloom filter path for ANPR and DEMO_MODE config constant | None |
| 14:00 | ANPR enrichment agent integrated (CSV lookup for owner metadata) | Replace in-memory CSV lookup with SQL join / proper table-backed flow | RTO CSV currently empty in this branch |