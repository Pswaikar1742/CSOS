'use client';

// ─── CSOS v2.0 WebSocket Client ───
// Connects to backend WebSocket for real-time threat events.
// Falls back to mock data when backend is unavailable.

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Incident } from './mock-data';
import { MOCK_INCIDENTS, generateRandomLog } from './mock-data';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:8000';

function getDeptFromThreatClass(threatClass: string): Incident['dept'] {
  const normalized = String(threatClass).toLowerCase();
  if (normalized === 'garbage') return 'sanitation';
  if (normalized === 'anpr') return 'rto';
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
    '[SYS] CSOS v2.0 Neural Sieve booting...',
    '[SYS] Connecting to threat detection pipeline...',
    '[SYS] Bloom filter initialized — false positive rate: 1.2e-7',
  ]);
  const wsRef = useRef<WebSocket | null>(null);
  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((log: string) => {
    setNeuralLogs((prev) => [...prev.slice(-200), log]);
  }, []);

  useEffect(() => {
    // Filter mock incidents by department (god-view sees all)
    const filtered = dept && dept !== 'god-view'
      ? MOCK_INCIDENTS.filter((inc) => inc.dept === dept)
      : MOCK_INCIDENTS;
    setIncidents(filtered);

    // Try WebSocket connection
    try {
      const wsDept = dept && dept !== 'god-view' ? dept : 'god-view';
      const wsClientId = `frontend-${wsDept}`;
      const wsUrl = `${WS_BASE_URL}/ws/${wsClientId}?dept=${encodeURIComponent(wsDept)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        addLog(`[SYS] WebSocket CONNECTED — channel: ${wsDept}`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'verified_threat') {
            const payload = data.payload || {};
            const threatClass = String(payload.class || 'unknown').toUpperCase();
            const deptFromThreat = getDeptFromThreatClass(payload.class || '');
            const incident: Incident = {
              id: data.threat_key || `INC-${Date.now()}`,
              type: threatClass,
              dept: deptFromThreat,
              lat: payload.lat || 19.8762,
              lng: payload.lng || 75.3433,
              location: payload.description || payload.camera_id || 'Unknown',
              confidence: Number(payload.confidence ?? 0.5),
              status: 'AWAITING_VERIFICATION',
              timestamp: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
            };
            setIncidents((prev) => [incident, ...prev]);
            addLog(
              `[DETECT] New threat: ${incident.type} at ${incident.location} — conf: ${incident.confidence.toFixed(2)}`
            );
          } else if (data.type === 'hitl_action') {
            const incidentId = String(data.incident_id || '');
            const status = String(data.status || 'AWAITING_VERIFICATION') as Incident['status'];
            setIncidents((prev) => prev.map((incident) => (
              incident.id === incidentId ? { ...incident, status } : incident
            )));
            addLog(`[HITL] ${incidentId} → ${status}`);
          }
        } catch {
          addLog(`[SYS] Raw message: ${event.data}`);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        addLog('[SYS] WebSocket disconnected — falling back to mock data');
      };

      ws.onerror = () => {
        setConnected(false);
        addLog('[SYS] WebSocket error — using mock data pipeline');
      };
    } catch {
      addLog('[SYS] WebSocket unavailable — mock mode active');
    }

    // Generate mock neural logs on interval for demo
    mockIntervalRef.current = setInterval(() => {
      addLog(generateRandomLog());
    }, 1500 + Math.random() * 2000);

    return () => {
      wsRef.current?.close();
      if (mockIntervalRef.current) clearInterval(mockIntervalRef.current);
    };
  }, [dept, addLog]);

  return { connected, incidents, neuralLogs, addLog };
}
