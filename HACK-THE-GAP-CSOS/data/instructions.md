# 📊 DATA & PITCH INSTRUCTIONS (Role: Research + Narrative Ops)
**Goal:** Prepare high-signal mock data and a crisp hackathon pitch narrative that supports the CSOS Neuro-Symbolic architecture.

### Phase 1 (Hours 0-6): Data Foundation
1. Create and maintain `anpr_db.csv` with realistic mock Indian plate records and owner metadata.
2. Curate 3 SOP/rule documents under `data/sops/` for Police, RTO, and Sanitation workflows.
3. Validate naming consistency for event classes used across stack: `weapon`, `anpr`, `garbage`, `hazard`.
4. Keep data deterministic and lightweight for demo reliability (no oversized assets, no random schema changes).

### Phase 2 (Hours 6-14): Story + Evidence Pack
1. Build a concise incident-story pack mapping each Problem Statement (PS1–PS5) to expected alert flow.
2. Maintain evidence snippets (sample rows + SOP excerpts) that explain why each routed alert is valid.
3. Prepare judge-facing talking points: "Math Sieve first, Agentic Router second, Role UI delivery third."
4. Freeze demo dataset before final run to avoid late-stage drift.

### Phase 3 (Hours 14-23): Demo Hardening
1. Run sanity checks that ANPR sample values match backend parsing assumptions.
2. Ensure SOP docs are present and readable for potential RAG demonstrations.
3. Coordinate with backend/frontend leads before any structural data changes.

**RULES:**
- No property-tax dataset or logic in this build.
- Do not break deterministic demo flow with unreviewed data edits.
- Keep all changes traceable through `docs/data-prep` commits.