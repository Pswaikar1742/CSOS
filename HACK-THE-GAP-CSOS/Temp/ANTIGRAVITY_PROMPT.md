# PROMPT FOR ANTIGRAVITY CODE EDITOR (Claude Opus)

## Context: You are working on the CSOS (City Smart Operations System) project

### Project Repository
Path: `./CSOS` (local directory - same location as this prompt)

### Project Architecture
```
HACK-THE-GAP-CSOS/
├── backend/        # FastAPI + Redis TTL + LangGraph (Port 8000)
├── frontend/       # Next.js 14 + Mapbox + Tailwind (Port 3000)
│   ├── src/app/
│   │   ├── police/      # Red UI theme
│   │   ├── rto/         # Blue UI theme
│   │   └── sanitation/  # Green UI theme
│   └── components/      # Mapbox Core & Neural Stream Sidebar
├── vision/         # Python Emulator (YOLO detection)
└── data/           # Mock databases (ANPR, SOPs)
```

---

## Your Mission: Think as the END USER

You are NOT just a code generator. You are a **UX-first engineer** who deeply understands the operational realities of Indian government officers working in command centers. I have conducted extensive research into:

1. **Traditional Systems These Officers Use Daily:**
   - Police: CCTNS (Crime Tracking), i3C dashboards, Dial 100 systems
   - RTO: VAHAN (vehicle registration), SARATHI (driving licenses)
   - Sanitation: Swachh Bharat dashboards, GPS tracking systems, RFID bin monitoring

2. **Their Actual Pain Points:**
   - Police Inspector Rajesh (42): Overwhelmed by 200+ CCTV feeds, manual FIR compilation
   - RTO Inspector Priya (38): Delayed challan processing, form-heavy interfaces
   - Sanitation Inspector Anil (45): Worker attendance fraud, missed collection routes
   - IAS Officer Dr. Meera (48): Fragmented data silos, lack of inter-department coordination

3. **Design Patterns They're Already Comfortable With:**
   - Top menu bar navigation (not hamburger menus)
   - Left sidebar with icon+text labels
   - Search-first workflows (enter vehicle plate → see all data)
   - Color-coded status indicators (Red=critical, Yellow=warning, Green=good)
   - Big buttons (minimum 48x48px) for touchscreens
   - Form layouts with tabbed sections
   - Map-centric dashboards with side panels

---

## Your Approach: User-Centered Development

### Step 1: Deep Empathy (Before Writing Any Code)

For EVERY component you build, ask yourself:

1. **"Is Inspector Rajesh working a 12-hour night shift. It's 3 AM. An incident alert pops up. Can he:**
   - Understand it in 2 seconds? (clear labels, big text)
   - Take action in 1 click? (no nested menus)
   - Do this without his reading glasses? (minimum 16pt fonts)

2. **"Inspector Priya needs to process 50 challans before her shift ends. Will this UI:**
   - Let her use keyboard shortcuts? (Ctrl+Enter to submit)
   - Auto-fill data from VAHAN database? (reduce typing)
   - Show validation errors immediately? (not after form submission)

3. **"Inspector Anil's sanitation workers are not tech-savvy. Can they:**
   - Mark a bin as collected with one tap? (big green button)
   - Upload a photo without confusion? (camera icon, no text needed)
   - Work offline when in areas with poor network? (local storage)

4. **"Dr. Meera is presenting to the Mayor. Does this dashboard:**
   - Show key metrics above the fold? (no scrolling needed)
   - Use colors that project well on a large screen? (high contrast)
   - Update in real-time without manual refresh? (websockets)

### Step 2: Respect the Traditional Workflows

**DO NOT reinvent the wheel.** These officers have muscle memory from years of using government systems. Your job is to **enhance, not replace** their mental models.

#### Police Module: Borrow from CCTNS
```typescript
// GOOD: Familiar incident workflow
const incidentStages = [
  "Detected",      // Auto from AI or manual entry
  "Assigned",      // Officer selects patrol unit on map
  "En Route",      // Unit marks when leaving
  "Arrived",       // GPS confirms arrival
  "Resolved",      // Officer closes incident
  "Reported"       // FIR auto-generated
];

// BAD: New terminology that confuses users
const incidentStages = ["Created", "Triaged", "Dispatched", "Completed"];
// ❌ They don't say "triaged" - they say "assigned to beat constable"
```

#### RTO Module: Borrow from VAHAN
```typescript
// GOOD: Familiar search-first design
<SearchBar 
  placeholder="Enter Registration Number: MH-12-AB-1234"
  autoFocus={true}
  onSearch={fetchVehicleDetails}
  historyDropdown={last10Searches}
/>

// BAD: Modern minimal design with no context
<SearchBar placeholder="Search..." />
// ❌ Search for what? Vehicle? License? Owner?
```

#### Sanitation Module: Borrow from Swachh Bharat
```typescript
// GOOD: Simple status cards they recognize
<VehicleCard>
  <StatusDot color={truck.isMoving ? "green" : "red"} />
  <TruckNumber>Truck #12</TruckNumber>
  <Route>Ward 3-A</Route>
  <Progress>45/60 bins (75%)</Progress>
  <CallButton>📞 Call Driver</CallButton>
</VehicleCard>

// BAD: Fancy modern UI with hidden info
<VehicleCard onClick={showDetails}>
  <TruckIcon /> #12
</VehicleCard>
// ❌ Where's the route? Status? How to call driver? (hidden behind click)
```

### Step 3: Implement with Accessibility & Performance

#### Accessibility Requirements (Government Standard)
```typescript
// All interactive elements must:
- Have minimum 48x48px touch targets
- Support keyboard navigation (Tab, Enter, Esc)
- Include ARIA labels for screen readers
- Show focus indicators (blue outline)
- Work with high contrast mode
- Allow font size adjustment

// Example:
<Button
  className="min-w-48 min-h-48 text-lg"
  aria-label="Assign incident to patrol unit"
  tabIndex={0}
  onKeyPress={(e) => e.key === 'Enter' && handleAssign()}
>
  🚓 Assign Unit
</Button>
```

#### Performance Requirements (Low Bandwidth Areas)
```typescript
// Map optimization:
- Use Mapbox GL JS with vector tiles (not raster)
- Implement clustering for 1000+ markers
- Lazy load off-screen data
- Cache map tiles locally (IndexedDB)

// Real-time updates:
- WebSockets for incident alerts (not polling)
- Debounce search inputs (500ms delay)
- Virtualize long lists (react-window)
- Progressive image loading (blur-up technique)

// Example:
const { data, isLoading } = useQuery({
  queryKey: ['vehicles'],
  queryFn: fetchVehicles,
  staleTime: 30000, // Refetch every 30 seconds
  cacheTime: 3600000, // Keep in cache for 1 hour
  refetchOnWindowFocus: false, // Don't refetch when user switches tabs
});
```

---

## Specific Implementation Tasks

### Task 1: Police Command Dashboard

**File to modify:** `frontend/src/app/police/page.tsx`

**Requirements:**
1. **Map-Centric Layout (60% screen width)**
   - Mapbox GL JS with dark theme
   - Vehicle markers (color-coded by status)
   - Incident pins (size based on severity)
   - Click incident → Show details card
   - Click vehicle → Show officer details + call button

2. **Incident Queue Panel (20% width)**
   - Real-time incident list (WebSocket feed)
   - Sort by: Time (newest first), Severity, Location
   - One-click "Assign Unit" button
   - Auto-highlight if unattended >5 minutes

3. **Resource Panel (20% width)**
   - Available patrol units (green dot)
   - On-duty units (yellow dot)
   - Busy units (red dot)
   - Click unit → Show location on map

4. **ANPR Alert System**
   - Auto-popup when wanted vehicle detected
   - Play sound alert (can be muted)
   - Show vehicle photo + owner details
   - Quick actions: "Alert All Units", "Track Vehicle"

**Code Pattern:**
```typescript
// frontend/src/app/police/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function PoliceCommand() {
  const { incidents, vehicles } = useWebSocket('/api/police/stream');
  const [selectedIncident, setSelectedIncident] = useState(null);

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Main Map */}
      <div className="w-3/5 relative">
        <Map
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={{ longitude: 73.8567, latitude: 18.5204, zoom: 12 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
        >
          {incidents.map(incident => (
            <Marker
              key={incident.id}
              longitude={incident.longitude}
              latitude={incident.latitude}
              onClick={() => setSelectedIncident(incident)}
            >
              <IncidentPin severity={incident.severity} />
            </Marker>
          ))}
        </Map>
      </div>

      {/* Incident Queue */}
      <div className="w-1/5 bg-gray-800 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Active Incidents</h2>
        {incidents.map(incident => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            onAssign={handleAssignUnit}
          />
        ))}
      </div>

      {/* Resource Panel */}
      <div className="w-1/5 bg-gray-800 p-4">
        <h2 className="text-xl font-bold text-white mb-4">Available Units</h2>
        <ResourceList units={vehicles} />
      </div>
    </div>
  );
}
```

### Task 2: RTO Command Dashboard

**File to modify:** `frontend/src/app/rto/page.tsx`

**Requirements:**
1. **Vehicle Search Bar (Top, Always Visible)**
   - Large input field (minimum 60px height)
   - Placeholder: "Enter Registration: MH-12-AB-1234"
   - Auto-complete with history
   - Real-time VAHAN database lookup

2. **Traffic Map with Layers**
   - Color-coded roads (green=smooth, yellow=moderate, red=congested)
   - Traffic camera locations (click to view feed)
   - Violation markers (auto-detected by AI)

3. **Violation Processing Panel**
   - Auto-detected violations (ANPR + Vision AI)
   - Pre-filled challan form (one-click approval)
   - SMS notification to vehicle owner
   - Payment tracking

4. **Analytics Dashboard**
   - Today's stats: Vehicles, Violations, Revenue
   - Trend charts: Hourly traffic flow
   - Top 5 violation zones

**Code Pattern:**
```typescript
// frontend/src/app/rto/page.tsx
'use client';

export default function RTOCommand() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: vehicleDetails } = useQuery({
    queryKey: ['vehicle', searchQuery],
    queryFn: () => fetchFromVAHAN(searchQuery),
    enabled: searchQuery.length >= 10, // MH-12-AB-1234 = 13 chars
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Bar */}
      <div className="bg-white shadow-md p-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
          placeholder="Enter Registration Number: MH-12-AB-1234"
          className="w-full text-2xl p-4 border-2 border-blue-500 rounded-lg"
          autoFocus
        />
      </div>

      {/* Main Content */}
      <div className="flex gap-4 p-4">
        <div className="w-1/2">
          <TrafficMap />
        </div>
        <div className="w-1/4">
          <ViolationQueue />
        </div>
        <div className="w-1/4">
          <AnalyticsDashboard />
        </div>
      </div>
    </div>
  );
}
```

### Task 3: Sanitation Control Dashboard

**File to modify:** `frontend/src/app/sanitation/page.tsx`

**Requirements:**
1. **Fleet Tracking Map (Simple, Clean)**
   - Color-coded truck markers (green=active, yellow=stopped, red=idle alert)
   - Planned route (dotted line)
   - Actual route (solid line - divergence highlighted)
   - Bin locations (last collection time)

2. **Vehicle Status List**
   - Simple cards with truck number, route, progress
   - Big "Call Driver" button
   - Filter: All | Active | Idle | Offline

3. **Complaint Management**
   - Citizen complaints (with photo)
   - Auto-assign to nearest truck
   - Before/after resolution photos

4. **Daily Summary**
   - Large number cards: Waste Collected, Routes Completed, Workers Present
   - Simple bar charts (last 7 days)

**Code Pattern:**
```typescript
// frontend/src/app/sanitation/page.tsx
'use client';

export default function SanitationControl() {
  const { trucks, bins, complaints } = useSanitationData();

  return (
    <div className="min-h-screen bg-green-50">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-4 gap-4 p-4">
        <SummaryCard title="Waste Collected" value="124 Tons" icon="♻️" />
        <SummaryCard title="Routes Completed" value="45/50" icon="✓" />
        <SummaryCard title="Workers Present" value="387/400" icon="👷" />
        <SummaryCard title="Complaints" value="12 (8 resolved)" icon="📞" />
      </div>

      {/* Main Content */}
      <div className="flex gap-4 p-4">
        <div className="w-3/5">
          <FleetMap trucks={trucks} bins={bins} />
        </div>
        <div className="w-1/5">
          <VehicleStatusList trucks={trucks} />
        </div>
        <div className="w-1/5">
          <ComplaintQueue complaints={complaints} />
        </div>
      </div>
    </div>
  );
}
```

### Task 4: City Command Center (Integrated View)

**File to modify:** `frontend/src/app/city-command/page.tsx`

**Requirements:**
1. **Unified Map (All 3 Departments)**
   - Layer toggle: Police | RTO | Sanitation | All
   - Combined incident heatmap
   - Department-specific markers with color coding

2. **Department Status Cards**
   - Police: Active incidents, Response time, Units available
   - RTO: Violations today, Traffic flow, Avg speed
   - Sanitation: Collection rate, Trucks active, Complaints

3. **City-Wide KPIs**
   - Safety Index, Traffic Efficiency, Cleanliness Score
   - Citizen Satisfaction
   - Overall Status (Green/Yellow/Red)

4. **Predictive Insights**
   - High crime risk zones (next 24 hours)
   - Expected traffic congestion
   - Predicted waste generation

**Code Pattern:**
```typescript
// frontend/src/app/city-command/page.tsx
'use client';

export default function CityCommand() {
  const { policeData, rtoData, sanitationData } = useCityData();

  return (
    <div className="min-h-screen bg-gray-800">
      {/* City KPI Bar */}
      <div className="bg-gray-900 p-4 grid grid-cols-4 gap-4">
        <KPICard title="Safety Index" value="87/100" trend="up" />
        <KPICard title="Traffic Efficiency" value="92/100" trend="up" />
        <KPICard title="Cleanliness" value="95/100" trend="up" />
        <KPICard title="Citizen Satisfaction" value="4.2/5.0" trend="same" />
      </div>

      {/* Main Dashboard */}
      <div className="flex gap-4 p-4">
        <div className="w-2/5">
          <UnifiedMap layers={['police', 'rto', 'sanitation']} />
        </div>
        <div className="w-1/5">
          <DepartmentCard title="Police Command" data={policeData} theme="red" />
          <DepartmentCard title="RTO Command" data={rtoData} theme="blue" />
          <DepartmentCard title="Sanitation" data={sanitationData} theme="green" />
        </div>
        <div className="w-2/5">
          <PredictiveInsights />
          <RecentAlerts />
        </div>
      </div>
    </div>
  );
}
```

---

## Component Library to Create

### Shared Components (All Departments)

1. **`<CommandLayout />`**
   - Standard layout wrapper
   - Top nav bar with logo, search, alerts, user menu
   - Left sidebar with collapsible menu
   - Main content area

2. **`<MapContainer />`**
   - Mapbox GL JS wrapper
   - Props: theme, markers, layers, onMarkerClick
   - Built-in controls: zoom, geolocation, layer toggle

3. **`<IncidentCard />`** (Police)
   - Display incident details
   - Color-coded by severity
   - Quick action buttons

4. **`<VehicleCard />`** (RTO & Sanitation)
   - Display vehicle/truck details
   - Status indicator
   - Call driver button

5. **`<AlertBanner />`**
   - Top banner for critical alerts
   - Auto-dismiss after 5 seconds
   - Sound notification (optional)

6. **`<StatsCard />`**
   - Large number display
   - Icon + label
   - Trend indicator (up/down arrow)

7. **`<SearchBar />`**
   - Auto-complete
   - Search history dropdown
   - Keyboard shortcuts (Ctrl+K to focus)

8. **`<DataTable />`**
   - Sortable columns
   - Inline filters
   - Export to CSV/PDF

---

## Design System Tokens

### Colors (Department-Specific)

```typescript
// tailwind.config.ts
const colors = {
  police: {
    primary: '#DC2626',    // Red
    secondary: '#991B1B',  // Dark red
    bg: '#1A1A1A',         // Black
    text: '#FFFFFF',       // White
  },
  rto: {
    primary: '#1E40AF',    // Blue
    secondary: '#1E3A8A',  // Dark blue
    bg: '#F5F5F5',         // Light grey
    text: '#1F2937',       // Dark grey
  },
  sanitation: {
    primary: '#059669',    // Green
    secondary: '#047857',  // Dark green
    bg: '#FAFAFA',         // Off-white
    text: '#1F2937',       // Dark grey
  },
  city: {
    primary: '#F59E0B',    // Amber
    secondary: '#D97706',  // Dark amber
    bg: '#2D3748',         // Charcoal
    text: '#FFFFFF',       // White
  },
};
```

### Typography

```typescript
const typography = {
  heading: {
    h1: 'text-4xl font-bold',    // 36px
    h2: 'text-2xl font-semibold', // 24px
    h3: 'text-xl font-medium',    // 20px
  },
  body: {
    large: 'text-lg',             // 18px
    base: 'text-base',            // 16px (default)
    small: 'text-sm',             // 14px
  },
  button: {
    primary: 'text-lg font-semibold', // 18px
    secondary: 'text-base',           // 16px
  },
};
```

### Spacing (Generous for Touch Targets)

```typescript
const spacing = {
  minButtonSize: '48px',  // WCAG 2.1 AAA
  cardPadding: '16px',
  panelGap: '16px',
  mapMarkerSize: '32px',
};
```

---

## Testing Requirements

### Manual Testing Checklist (Before Every Commit)

1. **Responsive Design:**
   - [ ] Desktop (1920x1080): All panels visible
   - [ ] Tablet (1024x768): Sidebar collapses
   - [ ] Mobile (375x667): Bottom tab navigation

2. **Accessibility:**
   - [ ] All buttons have minimum 48x48px size
   - [ ] Keyboard navigation works (Tab, Enter, Esc)
   - [ ] Screen reader announces all content
   - [ ] High contrast mode doesn't break layout

3. **Performance:**
   - [ ] Page loads in <3 seconds on 3G
   - [ ] Map renders 1000+ markers without lag
   - [ ] Real-time updates work without page refresh
   - [ ] Offline mode caches last 1 hour of data

4. **User Flows:**
   - [ ] Police: Report incident → Assign unit → Resolve (< 1 minute)
   - [ ] RTO: Search vehicle → View details → Issue challan (< 30 seconds)
   - [ ] Sanitation: View truck → Call driver → Mark route deviation (< 20 seconds)

### Automated Testing (Setup with Playwright)

```typescript
// e2e/police-workflow.spec.ts
test('Police officer can assign incident to patrol unit', async ({ page }) => {
  await page.goto('http://localhost:3000/police');
  
  // Wait for map to load
  await page.waitForSelector('[data-testid="mapbox-map"]');
  
  // Click on incident marker
  await page.click('[data-testid="incident-marker-001"]');
  
  // Incident details should appear
  await expect(page.locator('[data-testid="incident-card"]')).toBeVisible();
  
  // Click "Assign Unit" button
  await page.click('button:has-text("Assign Unit")');
  
  // Select patrol unit from dropdown
  await page.selectOption('[data-testid="unit-selector"]', 'QRT-01');
  
  // Confirm assignment
  await page.click('button:has-text("Confirm")');
  
  // Success toast should appear
  await expect(page.locator('.toast-success')).toBeVisible();
});
```

---

## Documentation Requirements

### Code Comments (Write for Non-Technical Maintainers)

```typescript
// GOOD: Explains WHY and CONTEXT
/**
 * ANPR Alert Component
 * 
 * Displays real-time alerts when ANPR system detects a wanted vehicle.
 * This component is critical for Inspector Rajesh's workflow - he needs to:
 * 1. See vehicle details instantly (no clicks)
 * 2. Hear audio alert (his monitor might be off-focus)
 * 3. Take action within 10 seconds (suspect might flee)
 * 
 * Integration: Connects to backend WebSocket at /api/police/anpr-stream
 * Data format: { plateNumber, ownerName, wantedReason, lastSeen, confidence }
 * 
 * Accessibility: High contrast red theme, large fonts (18pt), screen reader support
 */
export function ANPRAlert({ alert, onAlertAll, onTrackVehicle }) {
  // Play sound alert when new wanted vehicle detected
  useEffect(() => {
    if (alert.isWanted && alert.confidence > 0.85) {
      audioRef.current.play(); // Sound: /sounds/alert-critical.mp3
    }
  }, [alert]);

  return (
    // Rest of component...
  );
}

// BAD: No context, just code
export function ANPRAlert(props) {
  useEffect(() => { /* ... */ }, [props.alert]);
  return <div>...</div>;
}
```

### README for Each Module

```markdown
# Police Command Dashboard

## For Developers
This dashboard is used by police officers in 24/7 control rooms. They monitor CCTV feeds, track patrol vehicles, and respond to incidents.

**Key User Persona:** Inspector Rajesh (42 years old, 18 years experience)
- Works 8-12 hour shifts
- Monitors 200+ CCTV cameras
- Responds to 50+ incidents per shift
- Uses CCTNS system daily (familiar with that interface)

**Design Priorities:**
1. Map-centric layout (incidents and vehicles visible at a glance)
2. One-click actions (assign unit, alert all, track vehicle)
3. High contrast theme (control rooms have dim lighting)
4. Audio alerts (officers might be looking at other screens)

## Running Locally
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:3000/police

## Testing
```bash
npm run test:e2e -- police-workflow.spec.ts
```

## API Endpoints Used
- `GET /api/police/incidents` - Fetch active incidents
- `GET /api/police/vehicles` - Fetch patrol unit locations
- `WS /api/police/stream` - Real-time incident updates
- `POST /api/police/assign` - Assign incident to unit
```

---

## Final Reminder: You Are Building for THEM, Not for Silicon Valley

- **Not "Users"** → They are **Inspector Rajesh, Inspector Priya, Inspector Anil**
- **Not "Features"** → They are **Time-Saving Workflows**
- **Not "Modern UI"** → It's **Familiar, Fast, and Functional**

**Your success metric:** When Inspector Rajesh says "This is easier than CCTNS", when Inspector Priya processes challans 3x faster, and when Inspector Anil's sanitation workers actually use the app without training.

**Start by asking:** "What would make Inspector Rajesh's 3 AM shift easier?"

Then code that. Nothing more. Nothing less.

---

## Questions to Ask Me Before You Start Coding

1. **Data Format:** What does the backend API return for incidents/vehicles/complaints?
2. **Authentication:** How do users log in? (Employee ID + Password or SSO?)
3. **Real-Time:** Are we using WebSockets or polling for live updates?
4. **Deployment:** Where is this hosted? (On-premise servers or cloud?)
5. **Device Support:** What devices will they use? (Desktop only or tablets too?)

Please review the attached analysis document (`CSOS_UIUX_Analysis.md`) for full persona details and traditional system integration requirements.

Let's build something that actually helps these officers do their jobs better. 🚀
