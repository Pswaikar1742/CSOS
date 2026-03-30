'use client';

/**
 * PoliceCommandCenter — Full police-specific dashboard.
 *
 * Layout: Map (60%) | Incident Queue (20%) | Resource Panel (20%)
 *
 * Persona: Inspector Rajesh — 3 AM shift, dim control room
 * - Dark-tinted map section for low-light readability
 * - Red incident markers with pulsing critical alerts
 * - Escalation timers on incident queue
 * - One-click patrol unit assignment
 * - Map/CCTV toggle (reuses existing CameraGrid)
 *
 * Backend Integration:
 * - Uses useCSOSSocket('police') for real-time WebSocket events
 * - POST /api/hitl-action for dispatch
 * - GET /api/map-points for persisted incidents
 */

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import TopNav from '@/components/ui/TopNav';
import NeuralStream from '@/components/ui/NeuralStream';
import CameraGrid from '@/components/ui/CameraGrid';
import IncidentQueue from '@/components/departments/police/IncidentQueue';
import ResourcePanel from '@/components/departments/police/ResourcePanel';
import AlertBanner, { useAlerts } from '@/components/ui/AlertBanner';
import StatsCard from '@/components/ui/StatsCard';
import { useCSOSSocket } from '@/lib/socket';
import type { Incident } from '@/lib/mock-data';
import { AlertTriangle, Shield, Radio, Siren } from 'lucide-react';

const BACKEND_HTTP_BASE = (process.env.NEXT_PUBLIC_BACKEND_HTTP_BASE || 'http://localhost:8000').replace(/\/$/, '');

const CityMap = dynamic(() => import('@/components/ui/CityMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center rounded-xl">
      <div className="text-xs font-mono text-slate-500 animate-pulse tracking-wider">INITIALIZING MAP ENGINE...</div>
    </div>
  ),
});

export default function PoliceCommandCenter() {
  const { incidents, neuralLogs, connected } = useCSOSSocket('police');
  const [focusedIncident, setFocusedIncident] = useState<Incident | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'cctv'>('map');
  const { alerts, addAlert, removeAlert } = useAlerts();

  const activeCount = incidents.filter((i) => i.status === 'AWAITING_VERIFICATION').length;

  const handleAssign = useCallback(async (incident: Incident) => {
    try {
      const response = await fetch(`${BACKEND_HTTP_BASE}/api/hitl-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFIED',
          incident_id: incident.id,
          officer_id: 'POLICE-OFFICER-01',
          role: 'police',
          dept: 'police',
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(String(result?.detail || 'Dispatch failed'));

      const unit = String(result?.assigned_unit || 'Beat Marshal').trim();
      addAlert({ type: 'success', message: `Unit "${unit}" dispatched to ${incident.location}` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Dispatch failed';
      addAlert({ type: 'error', message: msg });
    }
  }, [addAlert]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Nav */}
      <TopNav role="police" alertCount={activeCount} />

      {/* Stats Bar */}
      <div className="shrink-0 px-4 py-3 bg-white border-b border-slate-200">
        <div className="grid grid-cols-4 gap-3">
          <StatsCard title="Active Incidents" value={activeCount} icon={<AlertTriangle className="h-4 w-4" />} variant="police" />
          <StatsCard title="Total Detected" value={incidents.length} icon={<Shield className="h-4 w-4" />} variant="police" />
          <StatsCard
            title="Connection"
            value={connected ? 'LIVE' : 'MOCK'}
            icon={<Radio className="h-4 w-4" />}
            variant={connected ? 'sanitation' : 'default'}
          />
          <StatsCard title="Response SLA" value="< 10 min" icon={<Siren className="h-4 w-4" />} variant="police" trend="up" trendLabel="↓2m" />
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex gap-3 p-3 overflow-hidden">
        {/* Left: Map (60%) */}
        <section className="w-3/5 relative rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          {/* Map header */}
          <div className="absolute top-3 left-3 z-20 px-3 py-2 rounded-md bg-white/95 border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold tracking-wide text-[#1E3A8A]">POLICE COMMAND — Live Map</h2>
            <p className="text-[10px] text-slate-500">Real-time incident locations</p>
          </div>

          {/* View toggle */}
          <div className="absolute top-3 right-3 z-20 rounded-md border border-slate-200 bg-white shadow-sm p-1 flex gap-1">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 text-xs font-medium rounded ${
                viewMode === 'map' ? 'bg-[#1E3A8A] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setViewMode('cctv')}
              className={`px-3 py-1.5 text-xs font-medium rounded ${
                viewMode === 'cctv' ? 'bg-[#1E3A8A] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              CCTV
            </button>
          </div>

          {/* Map or CCTV */}
          <div className="flex-1">
            {viewMode === 'map' ? (
              <CityMap
                incidents={incidents}
                markerColor="#ef4444"
                onIncidentClick={setFocusedIncident}
                focusIncident={focusedIncident}
              />
            ) : (
              <CameraGrid incidents={incidents} />
            )}
          </div>

          {/* Neural Stream overlay */}
          <NeuralStream logs={neuralLogs} />
        </section>

        {/* Middle: Incident Queue (20%) */}
        <section className="w-1/5 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <IncidentQueue
            incidents={incidents}
            onAssign={handleAssign}
            onSelect={(inc) => {
              setFocusedIncident(inc);
              setViewMode('map');
            }}
          />
        </section>

        {/* Right: Resource Panel (20%) */}
        <section className="w-1/5 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <ResourcePanel />
        </section>
      </div>

      {/* Alert Toasts */}
      <AlertBanner alerts={alerts} onDismiss={removeAlert} />
    </div>
  );
}
