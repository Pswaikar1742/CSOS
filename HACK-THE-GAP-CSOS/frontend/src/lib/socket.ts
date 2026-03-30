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

export function useCSOSSocket(dept?: string): SocketState {
  const [connected, setConnected] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [neuralLogs, setNeuralLogs] = useState<string[]>([
    '[GOVERNANCE] [ACTION_TAKEN] CSOS v2.0 Neural Sieve booting...',
    '[GOVERNANCE] [ACTION_TAKEN] Connecting to threat detection pipeline...',
    '[GOVERNANCE] [MATH] Bloom filter initialized — false positive rate: 1.2e-7',
  ]);
  const wsRef = useRef<WebSocket | null>(null);
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((log: string) => {
    setNeuralLogs((prev) => [...prev.slice(-200), log]);
  }, []);

  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }

    // Filter mock incidents by department (god-view sees all)
    const filtered = dept && dept !== 'god-view'
      ? MOCK_INCIDENTS.filter((inc) => inc.dept === dept)
      : MOCK_INCIDENTS;
    setIncidents(filtered);

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
            const incident: Incident = {
              id: data.incident_id || data.threat_key || `INC-${Date.now()}`,
              type: threatClass,
              dept: deptFromThreat,
              lat: payload.lat || 19.8762,
              lng: payload.lng || 75.3433,
              location: resolveLandmark(
                Number(payload.lat ?? 19.8762),
                Number(payload.lng ?? 75.3433),
                String(payload.ward || payload.description || payload.camera_id || 'Unknown')
              ),
              confidence: Number(payload.confidence ?? 0.5),
              status: 'AWAITING_VERIFICATION',
              timestamp: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
              detectedAt: Date.now(),
              dispatchPlan:
                payload.dispatch_plan ||
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
      };

      ws.onerror = () => {
        setConnected(false);
        addLog('[GOVERNANCE] [ACTION_TAKEN] WebSocket error — using mock data pipeline');
      };
    } catch {
      addLog('[GOVERNANCE] [ACTION_TAKEN] WebSocket unavailable — mock mode active');
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
  }, [dept, addLog]);

  return { connected, incidents, neuralLogs, addLog };
}
