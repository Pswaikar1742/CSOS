'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import NeuralStream from '@/components/ui/NeuralStream';
import ThreatCard from '@/components/ui/ThreatCard';
import CameraGrid from '@/components/ui/CameraGrid';
import { useCSOSSocket } from '@/lib/socket';
import { ROLE_THEMES } from '@/lib/types';
import type { CSOSRole } from '@/lib/types';
import type { Incident } from '@/lib/mock-data';

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

export default function CommandCenter({ role, dept }: CommandCenterProps) {
  const theme = ROLE_THEMES[role];
  const { incidents, neuralLogs } = useCSOSSocket(dept || role);
  const [focusedIncident, setFocusedIncident] = useState<Incident | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'cctv'>('map');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const backendHttpUrl = BACKEND_HTTP_BASE;

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
      const response = await fetch(`${backendHttpUrl}/api/hitl-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFIED',
          incident_id: incident.id,
          officer_id: `${(dept || role).toUpperCase()}-OFFICER-01`,
          role,
          dept: dept || role,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(String(result?.detail || 'HITL dispatch failed'));
      }

      const dispatchMessage = String(result?.assigned_unit || result?.dispatch_message || '').trim();
      const auditHash = String(result?.audit_hash || '').trim();
      setToastMessage(dispatchMessage ? `Unit Assigned: ${dispatchMessage}` : 'Dispatch completed successfully');
      window.setTimeout(() => setToastMessage(null), 2500);
      return auditHash;
    },
    [backendHttpUrl, dept, role]
  );

  const formatElapsed = useCallback((detectedAt: number) => {
    const sec = Math.max(1, Math.floor((Date.now() - detectedAt) / 1000));
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    return `${min}m ${sec % 60}s`;
  }, []);

  const potholeIncidents = incidents.filter((incident) => incident.type.toUpperCase().includes('POTHOLE'));
  const showPotholePanel = role === 'rto' || role === 'god-view';
  const latestPothole = potholeIncidents
    .slice()
    .sort((left, right) => right.detectedAt - left.detectedAt)[0] ?? null;

  return (
    <div className="h-[calc(100vh-4rem)] p-4 relative">
      <div className="grid grid-cols-10 gap-4 h-full">
        <section className="col-span-10 lg:col-span-7 h-full relative rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="absolute top-3 left-3 z-20 px-3 py-2 rounded-md bg-white/95 border border-slate-200 shadow-sm">
            <h2 className="text-xs font-semibold tracking-wide text-[#1E3A8A]">
              CSOS Live Map — {theme.label}
            </h2>
            <p className="text-xs text-slate-600">Real-time verified incident focus</p>
          </div>

          <div className="absolute top-3 right-3 z-20 rounded-md border border-slate-200 bg-white shadow-sm p-1 flex gap-1">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 text-xs font-medium rounded ${
                viewMode === 'map' ? 'bg-[#1E3A8A] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Map View
            </button>
            <button
              onClick={() => setViewMode('cctv')}
              className={`px-3 py-1.5 text-xs font-medium rounded ${
                viewMode === 'cctv' ? 'bg-[#1E3A8A] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              CCTV Grid
            </button>
          </div>

          {viewMode === 'map' ? (
            <CityMap
              incidents={incidents}
              markerColor={theme.markerColor}
              onIncidentClick={setFocusedIncident}
              focusIncident={focusedIncident}
            />
          ) : (
            <CameraGrid incidents={incidents} />
          )}

          <NeuralStream logs={neuralLogs} />
        </section>

        <aside className="col-span-10 lg:col-span-3 h-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 bg-[#F8FAFC]">
            <h3 className="text-sm font-semibold text-[#1E3A8A]">Live Work Queue</h3>
            <p className="text-xs text-slate-600">Verified threats awaiting administrative action</p>
          </div>

          {showPotholePanel && (
            <div className="mx-3 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wide text-amber-800">POTHOLE HEATPOINTS</span>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                  {potholeIncidents.length}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-amber-800">
                {latestPothole
                  ? `Latest: ${latestPothole.location} (${latestPothole.lat.toFixed(4)}, ${latestPothole.lng.toFixed(4)}) · ${formatElapsed(latestPothole.detectedAt)} ago`
                  : 'No active pothole detections yet.'}
              </p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {incidents.length === 0 && (
              <div className="text-sm text-slate-500 p-3 border border-dashed border-slate-300 rounded-lg">
                No verified incidents in queue.
              </div>
            )}

            {incidents.map((incident) => (
              <ThreatCard
                key={incident.id}
                incidentId={incident.id}
                type={incident.type}
                location={incident.location}
                elapsedText={formatElapsed(incident.detectedAt)}
                dispatchPlan={incident.dispatchPlan}
                dispatchLabel={resolveDispatchLabelForIncident(incident)}
                status={incident.status}
                onDispatch={() => {
                  setFocusedIncident(incident);
                  return sendHitlAction(incident);
                }}
              />
            ))}
          </div>
        </aside>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-md">
          <span className="text-sm font-semibold text-[#059669]">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
