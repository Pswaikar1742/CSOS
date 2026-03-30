# CSOS v2.0 — Frontend

> Chhatrapati Sambhajinagar Operating System

Scope: Next.js 14 UI, role-based dashboards, and Mapbox integrations.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — select a department role to enter the command center.

## Architecture

- **Middleware** (`src/middleware.ts`): Zero-trust RBAC using `csos_role` cookie
- **TopNav** (`src/components/ui/TopNav.tsx`): Glassmorphism header with role-based theming
- **ThreatCard** (`src/components/ui/ThreatCard.tsx`): HITL action cards with confidence bars
- **Routes**: `/police` (Red), `/rto` (Blue), `/sanitation` (Green), `/god-view` (Purple)
