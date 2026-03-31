'use client';

/**
 * DashboardView — Default 2-column dashboard layout
 * 
 * Layout:
 * - Left (60%): Interactive 3D city map with Map/CCTV toggle
 * - Right (40%): Available units + live incident queue
 */

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Grid3x3, TrendingUp } from 'lucide-react';
import NeuralStream from '@/components/ui/NeuralStream';
import ThreatCard from '@/components/ui/ThreatCard';
import CameraGrid from '@/components/ui/CameraGrid';
import type { CSOSRole } from '@/lib/types';
import type { Incident } from '@/lib/mock-data';

interface AvailableUnit {
  id: string;
  name: string;
  status: 'available' | 'busy' | 'idle';
  lastUpdate: string;
}

interface DashboardViewProps {
  incidents: Incident[];
  role: CSOSRole;
  units: AvailableUnit[];
  neuralLogs: Array<{ type: string; content: string }>;
  onDispatch: (incident: Incident) => Promise<{ auditHash: string; assignedUnit?: string }>;
  onWhatsappAlert?: (incident: Incident) => Promise<void>;
}

const ROLE_MARKER_COLORS: Record<CSOSRole, string> = {
  police: '#ef4444',
  rto: '#3b82f6',
  sanitation: '#10b981',
  'god-view': '#f59e0b',
};

const ROLE_LABELS: Record<CSOSRole, string> = {
  police: 'Police Command',
  rto: 'RTO Command',
  sanitation: 'Sanitation Command',
  'god-view': 'City Command Center',
};

const CityMap = dynamic(() => import('@/components/ui/CityMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center rounded-xl">
      <div className="text-xs font-mono text-slate-500 animate-pulse tracking-wider">
        INITIALIZING MAP ENGINE...
      </div>
    </div>
  ),
});

export default function DashboardView({
  incidents,
  role,
  units,
  neuralLogs,
  onDispatch,
  onWhatsappAlert,
}: DashboardViewProps) {
  const [viewMode, setViewMode] = useState<'map' | 'cctv'>('map');
  const [focusedIncident, setFocusedIncident] = useState<Incident | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const mapRef = useRef<HTMLElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  const theme = {
    markerColor: ROLE_MARKER_COLORS[role],
    label: ROLE_LABELS[role],
  };

  const handleDispatchClick = useCallback(
    async (incident: Incident) => {
      try {
        setDispatchingId(incident.id);
        setFocusedIncident(incident);
        await onDispatch(incident);
      } catch (error) {
        console.error('Dispatch failed:', error);
      } finally {
        setDispatchingId(null);
      }
    },
    [onDispatch]
  );

  const handleWhatsappClick = useCallback(
    async (incident: Incident) => {
      if (!onWhatsappAlert) return;
      try {
        await onWhatsappAlert(incident);
      } catch (error) {
        console.error('WhatsApp alert failed:', error);
      }
    },
    [onWhatsappAlert]
  );

  return (
    <div className="grid grid-cols-10 gap-4 h-full">
      {/* Left Panel: Map (60%) */}
      <section
        className="col-span-10 lg:col-span-6 h-full relative rounded-lg border-2 border-slate-300 bg-white shadow-sm overflow-hidden"
        ref={mapRef}
        id="map-panel"
      >
        {/* Map Header */}
        <div className="absolute top-3 left-3 z-20 px-3 py-2 rounded-lg bg-white border-2 border-slate-300 shadow-sm">
          <h2 className="text-xs font-semibold tracking-wide uppercase text-[#002147]">
            CSOS Live Map — {theme.label}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            {incidents.length} incident{incidents.length !== 1 ? 's' : ''} detected
          </p>
        </div>

        {/* View Toggle */}
        <div className="absolute top-3 right-3 z-20 rounded-lg border-2 border-slate-300 bg-white shadow-sm p-1 flex gap-1">
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
              viewMode === 'map'
                ? 'bg-blue-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Map View
          </button>
          <button
            onClick={() => setViewMode('cctv')}
            className={`px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1.5 transition-colors ${
              viewMode === 'cctv'
                ? 'bg-blue-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            CCTV Grid
          </button>
        </div>

        {/* Map or CCTV */}
        <div className="flex-1 h-full">
          {viewMode === 'map' ? (
            <CityMap
              incidents={incidents}
              markerColor={theme.markerColor}
              deptScope={role === 'god-view' ? 'police' : role}
              incidentSource="input-only"
              enableTransientIncidents={false}
              onIncidentClick={setFocusedIncident}
              focusIncident={focusedIncident}
            />
          ) : (
            <CameraGrid incidents={incidents} />
          )}
        </div>

        {/* Neural Stream at bottom */}
        <div ref={logsRef} id="reports-panel" className="absolute bottom-0 left-0 right-0 max-h-[200px]">
          {neuralLogs.length > 0 && (
            <NeuralStream logs={neuralLogs} />
          )}
        </div>
      </section>

      {/* Right Panel: Incidents & Units (40%) */}
      <aside className="col-span-10 lg:col-span-4 h-full rounded-lg border-2 border-slate-300 bg-white shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b-2 border-slate-300 bg-slate-50 shrink-0">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-[#002147]">
            Live Work Queue
          </h3>
          <p className="text-xs text-slate-700 mt-1">
            Verified threats awaiting administrative action
          </p>
        </div>

        {/* Available Units Panel */}
        <div className="mx-3 mt-3 rounded-lg border-2 border-slate-300 bg-slate-50 px-3 py-2.5 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold tracking-wide uppercase text-[#002147]">
              Available Units
            </span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700">
              {units.filter((unit) => unit.status === 'available').length}/{units.length}
            </span>
          </div>
          <div className="space-y-1.5">
            {units.slice(0, 4).map((unit) => (
              <div key={unit.id} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-white">
                <span className="font-semibold text-slate-700">{unit.name || unit.id}</span>
                <span
                  className={`font-medium px-1.5 py-0.5 rounded text-[10px] ${
                    unit.status === 'busy'
                      ? 'bg-amber-100 text-amber-900'
                      : unit.status === 'available'
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {unit.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Incidents List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500">
              <p className="text-sm font-medium">No verified incidents in queue</p>
              <p className="text-xs mt-1">Green across the city</p>
            </div>
          ) : (
            incidents.map((incident) => (
              <ThreatCard
                key={incident.id}
                incidentId={incident.id}
                type={incident.type}
                location={incident.location}
                elapsedText={`${Math.max(1, Math.floor((Date.now() - incident.detectedAt) / 1000))}s ago`}
                loggedAt={new Date(incident.detectedAt).toLocaleTimeString()}
                zone="Zone 1"
                wardName={incident.location}
                formalIncidentId={`CSN-${incident.dept}-2026-${incident.id}`}
                status={incident.status}
                disabled={incident.id.startsWith('SIM-')}
                onDispatch={() => handleDispatchClick(incident)}
                onWhatsappAlert={!incident.id.startsWith('SIM-') ? () => handleWhatsappClick(incident) : undefined}
              />
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
