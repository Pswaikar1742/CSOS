'use client';

import { useState, useCallback } from 'react';
import { useEffect } from 'react';
import { useMemo } from 'react';
import { useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import NeuralStream from '@/components/ui/NeuralStream';
import ThreatCard from '@/components/ui/ThreatCard';
import CameraGrid from '@/components/ui/CameraGrid';
import MapFullScreenView from '@/components/ui/MapFullScreenView';
import IncidentsFullScreenView from '@/components/ui/IncidentsFullScreenView';
import ReportsFullScreenView from '@/components/ui/ReportsFullScreenView';
import DashboardView from '@/components/ui/DashboardView';
import { useCSOSSocket } from '@/lib/socket';
import { ROLE_THEMES } from '@/lib/types';
import { withPersonaCoverage } from '@/lib/incident-augmentation';
import type { CSOSRole } from '@/lib/types';
import type { Incident } from '@/lib/mock-data';
import availableUnitsData from '@/lib/available_units.json';

type UnitStatus = 'available' | 'busy' | 'idle';

type AvailableUnit = {
  id: string;
  name: string;
  area: string;
  status: UnitStatus;
  lastUpdate: string;
};

const BACKEND_HTTP_BASE = (process.env.NEXT_PUBLIC_BACKEND_HTTP_BASE || 'http://localhost:8000').replace(/\/$/, '');

// Dynamic import for CityMap (needs browser APIs)
const CityMap = dynamic(() => import('@/components/ui/CityMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#F9FAFB] flex items-center justify-center border border-slate-200 rounded-xl">
      <div className="text-xs font-mono text-slate-500 animate-pulse tracking-wider">
        INITIALIZING MAP ENGINE...
      </div>
    </div>
  ),
});

// ─── CSOS v2.0 Command Center Layout ───
// Shared layout for all department pages:
// Left: 3D CityMap with threat markers
// Right: NeuralStream terminal sidebar
// Overlay: ThreatCard popup on marker click

interface CommandCenterProps {
  role: CSOSRole;
  dept?: string; // Department filter for incidents
}

type ThreatBucket = 'weapon' | 'accident' | 'suspicious_activity' | 'anpr_detection' | 'traffic_violation' | 'garbage' | 'pothole' | 'other';

function normalizeThreatBucket(type: string): ThreatBucket {
  const normalized = type.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (normalized.includes('weapon')) return 'weapon';
  if (normalized.includes('accident') || normalized.includes('collision')) return 'accident';
  if (normalized.includes('suspicious')) return 'suspicious_activity';
  if (normalized.includes('anpr')) return 'anpr_detection';
  if (normalized.includes('traffic') || normalized.includes('violation') || normalized.includes('helmet') || normalized.includes('speed') || normalized.includes('challan')) {
    return 'traffic_violation';
  }
  if (normalized.includes('garbage') || normalized.includes('waste') || normalized.includes('debris')) return 'garbage';
  if (normalized.includes('pothole')) return 'pothole';
  return 'other';
}

function applyRoleThreatFilter(items: Incident[], role: CSOSRole): Incident[] {
  if (role === 'god-view') return items;

  const roleAllow: Record<Exclude<CSOSRole, 'god-view'>, ThreatBucket[]> = {
    police: ['weapon', 'accident', 'suspicious_activity'],
    rto: ['anpr_detection', 'traffic_violation'],
    sanitation: ['garbage', 'pothole'],
  };

  const allowed = new Set<ThreatBucket>(roleAllow[role]);
  return items.filter((incident) => allowed.has(normalizeThreatBucket(incident.type)));
}

function deriveZone(location: string): string {
  const text = location.toLowerCase();
  if (text.includes('cidco') || text.includes('n-6')) return 'Zone 4';
  if (text.includes('kranti') || text.includes('aurangpura')) return 'Zone 2';
  if (text.includes('beed') || text.includes('bypass')) return 'Zone 5';
  return 'Zone 1';
}

function buildFormalIncidentId(incident: Incident): string {
  const year = new Date().getFullYear();
  const deptTag = incident.dept === 'sanitation' ? 'SWM' : incident.dept === 'rto' ? 'RTO' : 'POL';
  const suffix = incident.id.replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase() || '000001';
  return `CSN-${deptTag}-${year}-${suffix}`;
}

export default function CommandCenter({ role, dept }: CommandCenterProps) {
  const searchParams = useSearchParams();
  const { incidents, neuralLogs } = useCSOSSocket(dept || role);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [units, setUnits] = useState<AvailableUnit[]>([]);
  const backendHttpUrl = BACKEND_HTTP_BASE;
  const rootRef = useRef<HTMLDivElement>(null);

  const scopedIncidents = useMemo(() => applyRoleThreatFilter(incidents, role), [incidents, role]);
  const activeIncidents = useMemo(
    () => scopedIncidents.filter((incident) => incident.status === 'AWAITING_VERIFICATION'),
    [scopedIncidents]
  );
  const alignedActiveIncidents = useMemo(
    () => withPersonaCoverage(activeIncidents, role),
    [activeIncidents, role]
  );

  useEffect(() => {
    const loadUnits = async () => {
      const loaded = availableUnitsData as AvailableUnit[];
      setUnits(loaded);
    };
    void loadUnits();
  }, []);

  const resolveDispatchLabel = useCallback((incidentRole: Incident['dept']) => {
    if (incidentRole === 'police') return '[DISPATCH BEAT MARSHAL]';
    if (incidentRole === 'rto') return '[ISSUE E-CHALLAN]';
    return '[DISPATCH GHANTA GAADI]';
  }, []);

  const resolveDispatchLabelForIncident = useCallback(
    (incident: Incident) => {
      if (incident.type.toUpperCase().includes('INTER-AGENCY ALERT')) {
        return '[AUTO-GENERATE COMBINED NOTICE]';
      }
      if (incident.type.toUpperCase().includes('POTHOLE')) {
        return '[NOTIFY ROAD REPAIR CELL]';
      }
      return resolveDispatchLabel(incident.dept);
    },
    [resolveDispatchLabel]
  );

  const sendHitlAction = useCallback(
    async (incident: Incident) => {
      const assignableUnit = units.find((unit) => unit.status === 'available') || units.find((unit) => unit.status === 'idle');
      const response = await fetch(`${backendHttpUrl}/api/hitl-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFIED',
          incident_id: incident.id,
          officer_id: `${(dept || role).toUpperCase()}-OFFICER-01`,
          role,
          dept: dept || role,
          assigned_unit: assignableUnit?.id,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(String(result?.detail || 'HITL dispatch failed'));
      }

      const dispatchMessage = String(result?.assigned_unit || assignableUnit?.id || result?.dispatch_message || '').trim();
      const auditHash = String(result?.audit_hash || '').trim();
      setToastMessage(dispatchMessage ? `✓ DISPATCHED: ${dispatchMessage}` : 'Dispatch completed successfully');
      window.setTimeout(() => setToastMessage(null), 4000);

      if (assignableUnit) {
        setUnits((prev) => prev.map((unit) => (
          unit.id === assignableUnit.id
            ? { ...unit, status: 'busy', lastUpdate: 'just now' }
            : unit
        )));

        window.setTimeout(() => {
          setUnits((prev) => prev.map((unit) => (
            unit.id === assignableUnit.id
              ? { ...unit, status: 'available', lastUpdate: '5 mins ago' }
              : unit
          )));
        }, 5 * 60 * 1000);
      }

      return {
        auditHash,
        assignedUnit: dispatchMessage,
      };
    },
    [backendHttpUrl, dept, role, units]
  );

  const formatElapsed = useCallback((detectedAt: number) => {
    const sec = Math.max(1, Math.floor((Date.now() - detectedAt) / 1000));
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    return `${min}m ${sec % 60}s`;
  }, []);

  const formatLoggedAt = useCallback((detectedAt: number) => {
    const value = new Date(detectedAt || Date.now());
    const dd = String(value.getDate()).padStart(2, '0');
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const yyyy = value.getFullYear();
    const hh = String(value.getHours()).padStart(2, '0');
    const min = String(value.getMinutes()).padStart(2, '0');
    const ss = String(value.getSeconds()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
  }, []);

  const sendWhatsappAlert = useCallback(
    async (incident: Incident) => {
      const formalId = buildFormalIncidentId(incident);
      const zone = deriveZone(incident.location);
      const message = [
        'CSMC ICCC ALERT',
        `Incident ID: ${formalId}`,
        `Type: ${incident.type}`,
        `Zone: ${zone}`,
        `Ward: ${incident.location}`,
        `Status: ${incident.status}`,
      ].join('\n');

      const response = await fetch(`${backendHttpUrl}/api/wa_send_alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dept: incident.dept,
          incident_id: incident.id,
          message,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result?.accepted) {
        throw new Error(String(result?.detail || 'WhatsApp alert failed'));
      }
      setToastMessage('✓ WHATSAPP ALERT SENT');
      window.setTimeout(() => setToastMessage(null), 3500);
    },
    [backendHttpUrl]
  );

  const potholeIncidents = alignedActiveIncidents.filter((incident) => incident.type.toUpperCase().includes('POTHOLE'));
  const navigateView = useCallback((view: string | null) => {
    // No-op: view switching is now handled by CommandLayout navigation
    // This function kept for event compatibility
    return;
  }, []);

  const currentView = useMemo(() => {
    const view = searchParams.get('view');
    if (view === 'map' || view === 'incidents' || view === 'reports') {
      return view;
    }
    return 'dashboard';
  }, [searchParams]);

  // Render based on current view
  return (
    <div className="h-[calc(100vh-4rem)] p-4 relative bg-slate-50 font-sans" ref={rootRef}>
      {currentView === 'map' && (
        <MapFullScreenView incidents={alignedActiveIncidents} role={role} />
      )}

      {currentView === 'incidents' && (
        <IncidentsFullScreenView
          incidents={alignedActiveIncidents}
          role={role}
          onDispatch={(incident) => {
            if (incident.id.startsWith('SIM-')) {
              setToastMessage('Simulation incident is synced for map/queue realism only. Awaiting backend verification.');
              window.setTimeout(() => setToastMessage(null), 3500);
              return Promise.resolve({ auditHash: 'SIMULATED' });
            }
            return sendHitlAction(incident);
          }}
          onWhatsappAlert={(incident) => {
            if (incident.id.startsWith('SIM-')) return Promise.resolve();
            return sendWhatsappAlert(incident);
          }}
        />
      )}

      {currentView === 'reports' && (
        <ReportsFullScreenView incidents={alignedActiveIncidents} role={role} />
      )}

      {currentView === 'dashboard' && (
        <DashboardView
          incidents={alignedActiveIncidents}
          role={role}
          units={units}
          neuralLogs={neuralLogs}
          onDispatch={(incident) => {
            if (incident.id.startsWith('SIM-')) {
              setToastMessage('Simulation incident is synced for map/queue realism only. Awaiting backend verification.');
              window.setTimeout(() => setToastMessage(null), 3500);
              return Promise.resolve({ auditHash: 'SIMULATED' });
            }
            setFocusedIncident(incident);
            return sendHitlAction(incident);
          }}
          onWhatsappAlert={(incident) => {
            if (incident.id.startsWith('SIM-')) return Promise.resolve();
            return sendWhatsappAlert(incident);
          }}
        />
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded border-2 border-[#138808] bg-emerald-50 px-4 py-2 shadow-sm">
          <span className="text-sm font-semibold text-[#138808]">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
