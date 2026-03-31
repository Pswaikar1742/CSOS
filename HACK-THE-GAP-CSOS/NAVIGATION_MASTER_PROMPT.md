# 🎯 CSOS Left Navigation Bar — Master Implementation Prompt

## Overview
The left navigation bar (CommandLayout) currently has 4 tabs but lacks functional view switching. This prompt specifies the complete implementation for making each tab fully functional.

---

## Navigation Tabs & Behaviors

### 1. **LIVE MAP** (`?view=map`)
- **Display:** Full-screen interactive 3D city map
- **Content:** Only the map canvas with threat incident markers
- **Colors:** Role-based marker colors (Red=Police, Blue=RTO, Green=Sanitation, Gold=God-View)
- **Interaction:**
  - Click on incident marker → Shows incident popup with details
  - Toggle between Map View and CCTV Grid mode
  - Layer controls (Police Stations, Hospitals) visible
- **No sidebar shown** (hide incidents/reports panels)
- **Navigation:** Click "Dashboard" to return to mixed view

### 2. **DASHBOARD** (default, `?view=dashboard`)
- **Display:** Current 3-column layout (No change)
- **Layout:**
  - **Left (60%):** Interactive 3D city map with Map/CCTV toggle
  - **Right (40%):** 
    - Top: Available units panel
    - Bottom: Live incident queue with ThreatCard components
- **Features:**
  - Dispatch buttons active on each threat card
  - Real-time incident updates via WebSocket
  - Map/CCTV toggle
  - Stats bar showing active counts
- **This is the DEFAULT view when loading the page**

### 3. **INCIDENTS** (`?view=incidents`)
- **Display:** Full-screen incidents panel (maximize the right sidebar)
- **Header:**
  - Title: "LIVE INCIDENT QUEUE — [Department Label]"
  - Active incident count badge
  - Filter toggles (for god-view: by department)
- **Incident List:**
  - Full list of ALL active incidents (not just visible in queue)
  - Each incident shows: ThreatCard component with full information
  - Expandable incident details on click
- **Action Buttons:**
  - For Police/RTO/Sanitation: "DISPATCH" button
    - Assigns nearest available unit
    - Sends alert/e-challan
    - Updates incident status to DISPATCHED
  - For God-View (City Command): 
    - NO action buttons (read-only)
    - Shows dispatch status from other departments
    - Add "HISTORY" badge if incident was already handled
- **Sorting:** 
  - Priority by: Severity → Time → Status
  - Recent incidents at top
- **Maps hidden** (show incidents in full view)

### 4. **REPORTS** (`?view=reports`)
- **Display:** Full-screen analytics and incident history audit trail
- **Header:**
  - Title: "INCIDENT RESOLUTION REPORTS — [Department Label]"
  - Date range filter & export button
- **Report Sections:**
  
  **A. Summary Stats:**
  - Total incidents in last 24h
  - Average resolution time (SLA)
  - Closed vs. open incidents
  - Dispatch success rate %
  
  **B. Incident History Table with columns:**
  - Incident ID (formal CSN-POL-2026-XXXXX format)
  - Type (Weapon, Accident, Traffic Violation, etc.)
  - Location / Ward
  - Detected At (timestamp)
  - Assigned Officer (Who handled it)
  - Assigned Unit / E-Challan ID
  - Status (AWAITING_VERIFICATION → DISPATCHED → RESOLVED)
  - Time Taken (detection to resolution in minutes)
  - Audit Hash (SHA-256 for compliance)
  - Notes / Actions Taken
  
  **C. For God-View (City Command):**
  - Cross-department report view
  - Shows combined incidents from all departments
  - Filter by Department
  - Shows SLA compliance percentages per department
  - Can see which officer/unit handled each incident
  - Read-only (no action buttons)

---

## Implementation Requirements

### Component Structure
```
CommandCenter
├── render based on currentView (from URL ?view=)
├── if view='dashboard' → DashboardView (current layout)
├── if view='map' → MapFullScreenView
├── if view='incidents' → IncidentsFullScreenView
└── if view='reports' → ReportsFullScreenView
```

### Data Flow
1. **Incidents Data Source:** 
   - WebSocket from `useCSOSSocket(dept)`
   - Filter by role using `applyRoleThreatFilter()`
   
2. **Reports Data Source:**
   - Fetch from backend: `GET /api/incidents?status=RESOLVED` (historical)
   - Add audit trail data: officer_id, time_taken, audit_hash
   - For now, can use mock data if backend not ready

3. **Navigation:**
   - CommandLayout passes URL param via navigation
   - Browser URL updates: `/police?view=incidents`
   - CommandCenter reads `useSearchParams()` to determine view
   - Active nav item in CommandLayout highlights current view

### Role-Based Differences

| Aspect | Police | RTO | Sanitation | God-View (City Command) |
|--------|--------|-----|------------|-------------------------|
| **Live Map** | Show weapon/accident/suspicious | Show traffic violations & ANPR | Show garbage & potholes | Show ALL |
| **Incidents** | Can dispatch units | Can issue e-challans | Can dispatch sanitation | READ-ONLY (stats only) |
| **Reports** | Police-specific | RTO-specific | Sanitation-specific | All departments combined |
| **Action on Incidents** | [DISPATCH BEAT MARSHAL] | [ISSUE E-CHALLAN] | [DISPATCH GHANTA GAADI] | None (view only) |

### Styling Requirements
- **CommandLayout sidebar navigation:**
  - Active nav item: Blue highlight + underline
  - Hover: Pale blue background
  - Icons from Lucide (Map, LayoutDashboard, AlertTriangle, FileText)
  
- **Full-screen views:**
  - Remove gutters/padding (use full viewport height)
  - Maintain theme colors per role
  - Stats bar at top (from TopNav)
  - Content area uses `col-span-10 lg:col-span-10` (full width)

### Responsive Behavior
- **Desktop (≥1024px):** 
  - Sidebar always visible (collapse toggle available)
  - Full-screen views take right side only
  
- **Mobile (<1024px):**
  - Sidebar collapses to icons
  - Full-screen views go full width

---

## Testing Checklist

- [ ] Click "Live Map" → Map only, full screen, can toggle CCTV
- [ ] Click "Dashboard" → 2-column layout appears, incidents on right
- [ ] Click "Incidents" → Full incident list, action buttons work
- [ ] Click "Reports" → Audit trail table appears with history
- [ ] God-View Reports → Shows all departments, read-only
- [ ] Police Incidents → Dispatch button works, calls `/api/hitl-action`
- [ ] RTO Incidents → E-challan button works (alias for dispatch)
- [ ] Navigate back and forth → URL updates, view changes, active nav highlights
- [ ] Mobile → Sidebar collapses, views stack properly
- [ ] WebSocket Updates → Live incidents appear in all views
- [ ] Deep linking → `/police?view=incidents` loads directly to incidents

---

## Backend Endpoints Used

1. **POST /api/hitl-action**
   - Input: `{ action, incident_id, officer_id, role, dept, assigned_unit }`
   - Output: `{ accepted, status, assigned_unit, audit_hash }`

2. **GET /api/incidents?status=RESOLVED** (new, for reports)
   - Returns historical incidents with audit trail
   - Include: incident_id, officer_id, time_taken, audit_hash

3. **WebSocket /ws/{clientId}?dept={dept}**
   - Real-time incident streams
   - Current incidents with AWAITING_VERIFICATION status

---

## Implementation Priority

1. **Phase 1:** Create 4 view components + update CommandCenter to render them
2. **Phase 2:** Implement Reports component with mock data
3. **Phase 3:** Wire backend `/api/incidents?status=RESOLVED` endpoint
4. **Phase 4:** Test all navigation flows and role-based filtering

---

## Files to Create/Modify

### New Files
- `frontend/src/components/ui/IncidentsFullScreenView.tsx`
- `frontend/src/components/ui/ReportsFullScreenView.tsx`
- `frontend/src/components/ui/MapFullScreenView.tsx`
- `frontend/src/components/ui/DashboardView.tsx`

### Modified Files
- `frontend/src/components/ui/CommandCenter.tsx` (main logic dispatcher)
- `frontend/src/components/ui/CommandLayout.tsx` (nav already in place, minor tweaks)

---

**Status:** Ready for implementation ✅
