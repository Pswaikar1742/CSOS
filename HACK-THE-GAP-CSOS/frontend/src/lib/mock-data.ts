// ─── CSOS v2.0 Mock Incident Data ───
// From chomu handbook — used when backend/WebSocket is unavailable

export interface Incident {
  id: string;
  type: string;
  dept: 'police' | 'rto' | 'sanitation';
  lat: number;
  lng: number;
  location: string;
  confidence: number;
  status: 'AWAITING_VERIFICATION' | 'DISPATCHED' | 'RESOLVED' | 'FALSE_ALARM' | 'DISMISSED';
  imageUrl?: string;
  timestamp: string;
  detectedAt: number;
  dispatchPlan: string;
}

export const MOCK_INCIDENTS: Incident[] = [
  // ── Police ──
  {
    id: 'INC-992',
    type: 'WEAPON DETECTED',
    dept: 'police',
    lat: 19.8762,
    lng: 75.3433,
    location: 'Kranti Chowk',
    confidence: 0.94,
    status: 'AWAITING_VERIFICATION',
    imageUrl: '/mock_weapon.jpg',
    timestamp: '12:42:18 IST',
    detectedAt: Date.now() - 45_000,
    dispatchPlan: 'Deploy nearest BEAT MARSHAL to secure perimeter and notify local command.',
  },
  {
    id: 'INC-994',
    type: 'VEHICLE COLLISION',
    dept: 'police',
    lat: 19.8730,
    lng: 75.3500,
    location: 'Jalna Road Flyover',
    confidence: 0.87,
    status: 'AWAITING_VERIFICATION',
    timestamp: '12:43:05 IST',
    detectedAt: Date.now() - 80_000,
    dispatchPlan: 'Alert traffic patrol, secure collision zone, and request ambulance dispatch.',
  },
  {
    id: 'INC-996',
    type: 'SUSPICIOUS ACTIVITY',
    dept: 'police',
    lat: 19.8800,
    lng: 75.3380,
    location: 'Mondha Market',
    confidence: 0.72,
    status: 'AWAITING_VERIFICATION',
    timestamp: '12:50:22 IST',
    detectedAt: Date.now() - 120_000,
    dispatchPlan: 'Initiate CCTV zoom lock, dispatch beat vehicle, and start nearby checkpoint screening.',
  },

  // ── RTO ──
  {
    id: 'RTO-301',
    type: 'ANPR HIT — STOLEN VEHICLE',
    dept: 'rto',
    lat: 19.8790,
    lng: 75.3460,
    location: 'Cidco Bus Stand',
    confidence: 0.98,
    status: 'AWAITING_VERIFICATION',
    timestamp: '12:44:30 IST',
    detectedAt: Date.now() - 52_000,
    dispatchPlan: 'Issue auto-flag to patrol squad and trigger digital challan workflow for stolen vehicle watch.',
  },
  {
    id: 'RTO-302',
    type: 'SPEED VIOLATION — 120KM/H',
    dept: 'rto',
    lat: 19.8710,
    lng: 75.3550,
    location: 'Bypass NH-211',
    confidence: 0.91,
    status: 'AWAITING_VERIFICATION',
    timestamp: '12:45:12 IST',
    detectedAt: Date.now() - 65_000,
    dispatchPlan: 'Generate speed violation docket, capture number plate evidence, and notify control room.',
  },
  {
    id: 'RTO-305',
    type: 'NO HELMET — TWO-WHEELER',
    dept: 'rto',
    lat: 19.8840,
    lng: 75.3400,
    location: 'Seven Hills Circle',
    confidence: 0.85,
    status: 'AWAITING_VERIFICATION',
    timestamp: '12:48:44 IST',
    detectedAt: Date.now() - 95_000,
    dispatchPlan: 'Issue e-challan with helmet violation code and route case to traffic adjudication queue.',
  },
  {
    id: 'RTO-307',
    type: 'POTHOLE DETECTED',
    dept: 'rto',
    lat: 19.8766,
    lng: 75.3434,
    location: 'Railway Station Road',
    confidence: 0.89,
    status: 'AWAITING_VERIFICATION',
    timestamp: '12:49:17 IST',
    detectedAt: Date.now() - 40_000,
    dispatchPlan: 'Geo-tag pothole and notify road repair cell to barricade and patch within rapid response SLA.',
  },

  // ── Sanitation ──
  {
    id: 'SAN-107',
    type: 'ILLEGAL GARBAGE DUMP',
    dept: 'sanitation',
    lat: 19.8820,
    lng: 75.3210,
    location: 'CIDCO N-6',
    confidence: 0.98,
    status: 'AWAITING_VERIFICATION',
    imageUrl: '/mock_garbage.jpg',
    timestamp: '12:46:50 IST',
    detectedAt: Date.now() - 50_000,
    dispatchPlan: 'Dispatch nearest GHANTA GAADI, assign sweep crew, and mark site for follow-up inspection.',
  },
  {
    id: 'SAN-108',
    type: 'HAZARDOUS WASTE',
    dept: 'sanitation',
    lat: 19.8700,
    lng: 75.3300,
    location: 'Waluj Industrial Area',
    confidence: 0.76,
    status: 'AWAITING_VERIFICATION',
    timestamp: '12:47:33 IST',
    detectedAt: Date.now() - 110_000,
    dispatchPlan: 'Escalate to hazardous waste team and block area until safe containment is completed.',
  },
  {
    id: 'SAN-110',
    type: 'UNAUTHORIZED CONSTRUCTION DEBRIS',
    dept: 'sanitation',
    lat: 19.8860,
    lng: 75.3350,
    location: 'Beed Bypass Road',
    confidence: 0.82,
    status: 'AWAITING_VERIFICATION',
    timestamp: '12:52:15 IST',
    detectedAt: Date.now() - 130_000,
    dispatchPlan: 'Dispatch GHANTA GAADI and alert ward supervisor for enforcement notice issuance.',
  },
];

// ── Neural Stream Log Templates ──
export const NEURAL_LOG_TEMPLATES = [
  '[GOVERNANCE] [ACTION_TAKEN] Neural Sieve v3.1 initialized — Redis TTL: 30s, Bloom filter: k=7',
  '[GOVERNANCE] [SIEVE] Analyzing persistence for object {id} on frame {frame}...',
  '[GOVERNANCE] [MATH] Confidence vector: σ = {sigma}, μ = {mean} → threshold exceeded',
  '[GOVERNANCE] [DETECT] Classification: {type} — bounding box [x1:{x1}, y1:{y1}, x2:{x2}, y2:{y2}]',
  '[GOVERNANCE] [MATH] IoU verified. Threat confirmed as STATIONARY.',
  '[GOVERNANCE] [ACTION_TAKEN] Bloom filter de-dup complete → duplicate_probability: {prob}',
  '[GOVERNANCE] [ACTION_TAKEN] Triggering Inter-Agency Bridge ({dept})...',
  '[GOVERNANCE] [DETECT] ANPR plate extraction: {plate} — OCR confidence: {conf}',
  '[GOVERNANCE] [MATH] Spatial clustering: DBSCAN ε=0.001, min_samples=2 → cluster_id: {cluster}',
  '[GOVERNANCE] [ACTION_TAKEN] WebSocket broadcast → channel: god_view, payload_size: {size}B',
  '[GOVERNANCE] [DETECT] Motion delta: {delta}px² — threshold: 500px²',
  '[GOVERNANCE] [MATH] Kalman filter prediction — next_position: [{lat}, {lng}]',
  '[GOVERNANCE] [ACTION_TAKEN] Incident {id} promoted to AWAITING_VERIFICATION — TTL reset',
  '[GOVERNANCE] [DETECT] Heatmap anomaly detected at grid [{gx},{gy}] — z-score: {zscore}',
  '[GOVERNANCE] [MATH] Bayesian update → P(threat|evidence) = {posterior}',
];

export function generateRandomLog(): string {
  const template = NEURAL_LOG_TEMPLATES[Math.floor(Math.random() * NEURAL_LOG_TEMPLATES.length)];
  return template
    .replace('{frame}', String(Math.floor(Math.random() * 9000) + 1000))
    .replace('{count}', String(Math.floor(Math.random() * 12) + 1))
    .replace('{sigma}', (Math.random() * 0.3 + 0.7).toFixed(4))
    .replace('{mean}', (Math.random() * 0.2 + 0.8).toFixed(4))
    .replace('{type}', ['WEAPON', 'VEHICLE', 'GARBAGE', 'PERSON', 'HELMET_MISS'][Math.floor(Math.random() * 5)])
    .replace('{x1}', String(Math.floor(Math.random() * 400)))
    .replace('{y1}', String(Math.floor(Math.random() * 300)))
    .replace('{x2}', String(Math.floor(Math.random() * 400) + 400))
    .replace('{y2}', String(Math.floor(Math.random() * 300) + 300))
    .replace('{prob}', (Math.random() * 1e-6).toExponential(1))
    .replace('{hash}', Math.random().toString(36).substring(2, 10))
    .replace('{dept}', ['police', 'rto', 'sanitation'][Math.floor(Math.random() * 3)])
    .replace('{plate}', `MH20-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(Math.random() * 9000) + 1000}`)
    .replace('{conf}', (Math.random() * 0.15 + 0.85).toFixed(2))
    .replace('{cluster}', String(Math.floor(Math.random() * 20)))
    .replace('{size}', String(Math.floor(Math.random() * 2000) + 200))
    .replace('{delta}', String(Math.floor(Math.random() * 2000) + 100))
    .replace('{lat}', (19.87 + Math.random() * 0.02).toFixed(4))
    .replace('{lng}', (75.33 + Math.random() * 0.03).toFixed(4))
    .replace('{id}', `INC-${Math.floor(Math.random() * 999)}`)
    .replace('{gx}', String(Math.floor(Math.random() * 50)))
    .replace('{gy}', String(Math.floor(Math.random() * 50)))
    .replace('{zscore}', (Math.random() * 3 + 2).toFixed(2))
    .replace('{posterior}', (Math.random() * 0.3 + 0.7).toFixed(4));
}
