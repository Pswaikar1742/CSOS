'use client';

// ─── CSOS v2.0 WebSocket Client ───
// Connects to backend WebSocket for real-time threat events.
// Falls back to mock data when backend is unavailable.

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Incident } from './mock-data';
import { MOCK_INCIDENTS, generateRandomLog } from './mock-data';
import { get_csn_landmark, resolveLandmark } from './landmark-resolver';

const BACKEND_HTTP_BASE = (process.env.NEXT_PUBLIC_BACKEND_HTTP_BASE || 'http://localhost:8000').replace(/\/$/, '');
const BACKEND_WS_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_WS_BASE || BACKEND_HTTP_BASE.replace(/^http/i, 'ws')
).replace(/\/$/, '');

type MapPoint = {
  incident_id?: string;
  threat_type?: string;
  dept?: string;
  camera_id?: string;
  area_name?: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  status?: Incident['status'];
};

type SocketOptions = {
  onVerifiedThreat?: (incident: Incident) => void;
};

function buildWsUrl(wsDept: string): string {
  return `${BACKEND_WS_BASE}/ws/client1?dept=${encodeURIComponent(wsDept)}`;
}

function getDeptFromThreatClass(threatClass: string): Incident['dept'] {
  const normalized = String(threatClass).toLowerCase();
  if (normalized === 'garbage') return 'sanitation';
  if (normalized === 'pothole') return 'sanitation';
  if (normalized === 'anpr' || normalized === 'anpr_detection') return 'rto';
  if (normalized === 'accident' || normalized === 'weapon' || normalized === 'hazard') return 'police';
  return 'police';
}

export interface SocketState {
  connected: boolean;
  incidents: Incident[];
  neuralLogs: string[];
  addLog: (log: string) => void;
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value.trim()) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hashToOffset(input: string, spread = 0.01): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  const normalized = ((hash % 1000) + 1000) % 1000;
  return (normalized / 1000 - 0.5) * spread;
}

function resolveThreatCoordinates(payload: Record<string, unknown>, seed: string): { lat: number; lng: number } {
  const latCandidates = [payload.lat, payload.latitude, payload.y, payload.geo_lat];
  const lngCandidates = [payload.lng, payload.lon, payload.longitude, payload.x, payload.geo_lng];

  const lat = latCandidates.map(toFiniteNumber).find((value) => value !== null) ?? null;
  const lng = lngCandidates.map(toFiniteNumber).find((value) => value !== null) ?? null;

  if (lat !== null && lng !== null) {
    return { lat, lng };
  }

  const baseLat = 19.8762;
  const baseLng = 75.3433;
  return {
    lat: baseLat + hashToOffset(`${seed}-lat`),
    lng: baseLng + hashToOffset(`${seed}-lng`),
  };
}

function addMarkerToMap(lat: number, lng: number, dept: Incident['dept']) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('csos:add-marker', { detail: { lat, lng, dept } }));
}

export function useCSOSSocket(dept?: string, options?: SocketOptions): SocketState {
  const [connected, setConnected] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [neuralLogs, setNeuralLogs] = useState<string[]>([
    '[GOVERNANCE] [ACTION_TAKEN] CSOS v2.0 Neural Sieve booting...',
    '[GOVERNANCE] [ACTION_TAKEN] Connecting to threat detection pipeline...',
    '[GOVERNANCE] [MATH] Bloom filter initialized — false positive rate: 1.2e-7',
  ]);
  const wsRef = useRef<WebSocket | null>(null);
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onVerifiedThreat = options?.onVerifiedThreat;

  const addLog = useCallback((log: string) => {
    setNeuralLogs((prev) => [...prev.slice(-200), log]);
  }, []);

  const hydrateIncidentsFromBackend = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${BACKEND_HTTP_BASE}/api/map-points?limit=200`);
      if (!response.ok) {
        return false;
      }

      const payload = await response.json();
      const points: MapPoint[] = Array.isArray(payload?.points) ? payload.points as MapPoint[] : [];
      if (!points.length) {
        return false;
      }

      const normalized = points
        .filter((point) => typeof point.latitude === 'number' && typeof point.longitude === 'number')
        .map((point): Incident => {
          const lat = Number(point.latitude);
          const lng = Number(point.longitude);
          return {
            id: String(point.incident_id || `DB-${point.camera_id || Date.now()}`),
            type: String(point.threat_type || 'INCIDENT').toUpperCase(),
            dept: (String(point.dept || 'police') as Incident['dept']),
            lat,
            lng,
            location: String(point.area_name || point.camera_id || resolveLandmark(lat, lng, 'Unknown Area')),
            confidence: 0.8,
            status: (point.status || 'AWAITING_VERIFICATION') as Incident['status'],
            timestamp: new Date(point.timestamp || Date.now()).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
            detectedAt: new Date(point.timestamp || Date.now()).getTime(),
            dispatchPlan: 'Loaded from backend incident registry.',
          };
        });

      if (!normalized.length) {
        return false;
      }

      const scoped = dept && dept !== 'god-view'
        ? normalized.filter((incident) => incident.dept === dept)
        : normalized;

      if (scoped.length) {
        setIncidents(scoped);
        addLog(`[GOVERNANCE] [ACTION_TAKEN] Hydrated ${scoped.length} incident(s) from backend map registry.`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [addLog, dept]);

  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }

    const filtered = dept && dept !== 'god-view'
      ? MOCK_INCIDENTS.filter((inc) => inc.dept === dept)
      : MOCK_INCIDENTS;
    setIncidents([]);

    void (async () => {
      const hydrated = await hydrateIncidentsFromBackend();
      if (!hydrated) {
        addLog('[GOVERNANCE] [ACTION_TAKEN] No persisted incidents available from backend map registry.');
      }
    })();

    // Try WebSocket connection
    try {
      const wsDept = dept && dept !== 'god-view' ? dept : 'god-view';
      const wsUrl = buildWsUrl(wsDept);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        addLog(`[GOVERNANCE] [ACTION_TAKEN] WebSocket CONNECTED — channel: ${wsDept}`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'verified_threat') {
            const payload = data.payload || {};
            const threatClass = String(payload.class || 'unknown').toUpperCase();
            const deptFromThreat = getDeptFromThreatClass(payload.class || '');
            const seed = String(data.incident_id || data.threat_key || payload.camera_id || Date.now());
            const { lat, lng } = resolveThreatCoordinates(payload, seed);
            const incident: Incident = {
              id: seed,
              type: threatClass,
              dept: deptFromThreat,
              lat,
              lng,
              location: resolveLandmark(
                lat,
                lng,
                String(payload.ward || payload.location || payload.camera_id || payload.description || 'Unknown Area')
              ),
              confidence: Number(payload.confidence ?? 0.5),
              status: 'AWAITING_VERIFICATION',
              timestamp: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
              detectedAt: Date.now(),
              dispatchPlan:
                payload.dispatch_plan ||
                data.dispatch_plan ||
                payload.dispatchPlan ||
                (deptFromThreat === 'police'
                  ? 'Deploy nearest BEAT MARSHAL and secure the threat perimeter.'
                  : deptFromThreat === 'rto'
                    ? String(payload.class || '').toLowerCase() === 'pothole'
                      ? 'Notify road maintenance squad with geo-tagged pothole coordinates for immediate repair action.'
                      : 'Issue e-challan and alert enforcement unit for plate interception.'
                    : 'Dispatch nearest GHANTA GAADI and assign field crew for immediate cleanup.'),
            };
            setIncidents((prev) => [incident, ...prev]);
            addMarkerToMap(incident.lat, incident.lng, incident.dept);
            onVerifiedThreat?.(incident);
            addLog(
              `[DETECT] New threat: ${incident.type} at ${incident.location} — conf: ${incident.confidence.toFixed(2)}`
            );
          } else if (data.type === 'incident_resolved') {
            const incidentId = String(data.incident_id || '');
            const status = String(data.status || 'AWAITING_VERIFICATION') as Incident['status'];
            setIncidents((prev) => prev.map((incident) => (
              incident.id === incidentId ? { ...incident, status } : incident
            )));
            addLog(`[HITL] ${incidentId} → ${status}`);
          } else if (data.type === 'inter_agency_alert') {
            const payload = data.payload || {};
            const lat = Number(payload.lat ?? 19.8762);
            const lng = Number(payload.lng ?? 75.3433);
            const incident: Incident = {
              id: String(data.incident_id || `IAA-${Date.now()}`),
              type: 'INTER-AGENCY ALERT',
              dept: 'rto',
              lat,
              lng,
              location: get_csn_landmark(lat, lng),
              confidence: 0.99,
              status: 'AWAITING_VERIFICATION',
              timestamp: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
              detectedAt: Date.now(),
              dispatchPlan:
                'Sanitation Violation by Blacklisted Vehicle. Owner: [UUID-MASKED]. Auto-generating Combined E-Challan + Sanitation Notice.',
            };
            setIncidents((prev) => [incident, ...prev]);
            addLog('[GOVERNANCE] [ACTION_TAKEN] [INTER-AGENCY ALERT] Waste-to-Wheel bridge activated.');
          } else if (data.type === 'neural_log') {
            const logMessage = String(data.message || '[SYS] Neural log event');
            addLog(logMessage);
          }
        } catch {
          addLog(`[SYS] Raw message: ${event.data}`);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        addLog('[GOVERNANCE] [ACTION_TAKEN] WebSocket disconnected — falling back to mock data');
        setIncidents((prev) => (prev.length ? prev : filtered));
      };

      ws.onerror = () => {
        setConnected(false);
        addLog('[GOVERNANCE] [ACTION_TAKEN] WebSocket error — using mock data pipeline');
        setIncidents((prev) => (prev.length ? prev : filtered));
      };
    } catch {
      addLog('[GOVERNANCE] [ACTION_TAKEN] WebSocket unavailable — mock mode active');
      setIncidents((prev) => (prev.length ? prev : filtered));
    }

    // Generate mock neural logs on interval for demo
    mockIntervalRef.current = setInterval(() => {
      addLog(generateRandomLog());
    }, 1500 + Math.random() * 2000);

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current);
        mockIntervalRef.current = null;
      }
    };
  }, [dept, addLog, hydrateIncidentsFromBackend, onVerifiedThreat]);

  return { connected, incidents, neuralLogs, addLog };
}
