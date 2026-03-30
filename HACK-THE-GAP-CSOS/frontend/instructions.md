# 🎨 FRONTEND INSTRUCTIONS (Role: The Canvas)
**Goal:** Build the 3D Role-Based Command Center. 

### Phase 1 (Hours 0-4): The Shell & Map
1. Run `npx create-next-app@latest .` (Tailwind, App Router).
2. Install `mapbox-gl`, `react-map-gl`, `lucide-react`.
3. Build the Dark Theme UI. Center Mapbox on Chhatrapati Sambhajinagar (Lat: 19.8762, Lng: 75.3433).
4. Create 4 specific routes/pages: `/police` (Red), `/rto` (Blue), `/sanitation` (Green), `/god-view` (Purple).

### Phase 2 (Hours 4-10): Mock Data & UI Components
1. DO NOT WAIT FOR BACKEND. Create a mock JSON array of incidents (Weapons, Garbage).
2. Build `<ThreatCard />` component (Must have [VERIFY & DISPATCH] and [FALSE ALARM] buttons).
3. Build `<NeuralStream />` terminal sidebar on the right side (scrolling green hacker text).
4. At Hour 12, swap the mock JSON array for `socket.io-client` listening to `ws://localhost:8000/ws`.

**RULES:** Dark mode only. No laggy animations. It must look like a military OS.