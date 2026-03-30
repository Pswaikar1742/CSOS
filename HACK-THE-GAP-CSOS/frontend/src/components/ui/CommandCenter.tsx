'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import NeuralStream from '@/components/ui/NeuralStream';
import ThreatCard from '@/components/ui/ThreatCard';
import { useCSOSSocket } from '@/lib/socket';
import { ROLE_THEMES } from '@/lib/types';
import type { CSOSRole } from '@/lib/types';
import type { Incident } from '@/lib/mock-data';

// Dynamic import for CityMap (needs browser APIs)
const CityMap = dynamic(() => import('@/components/ui/CityMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-950 flex items-center justify-center">
      <div className="text-xs font-mono text-slate-600 animate-pulse tracking-wider">
        INITIALIZING 3D MAP ENGINE...
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
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [hitlBusy, setHitlBusy] = useState(false);
  const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';

  const handleIncidentClick = useCallback((incident: Incident) => {
    setSelectedIncident(incident);
  }, []);

  const sendHitlAction = useCallback(
    async (action: 'dispatch' | 'false_alarm') => {
      if (!selectedIncident || hitlBusy) return;

      setHitlBusy(true);
      try {
        await fetch(`${backendApiUrl}/api/hitl-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            incident_id: selectedIncident.id,
            role,
            dept: dept || role,
            incident: selectedIncident,
          }),
        });
      } finally {
        setHitlBusy(false);
        setSelectedIncident(null);
      }
    },
    [backendApiUrl, dept, hitlBusy, role, selectedIncident]
  );

  const handleDispatch = useCallback(() => {
    void sendHitlAction('dispatch');
  }, [sendHitlAction]);

  const handleFalseAlarm = useCallback(() => {
    void sendHitlAction('false_alarm');
  }, [sendHitlAction]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Left: Map Area ── */}
      <div className="flex-1 relative">
        {/* Department Header Overlay */}
        <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md border border-slate-800 rounded-lg px-4 py-3">
          <h1 className={`text-sm font-bold tracking-[0.2em] font-mono ${theme.textClass}`}>
            [{theme.label}] COMMAND CENTER
          </h1>
          <p className="text-[10px] font-mono text-slate-600 mt-0.5">
            {role === 'police' && 'Weapons Detection • Accident Response • Crime Surveillance'}
            {role === 'rto' && 'ANPR Surveillance • Traffic Violations • Speed Enforcement'}
            {role === 'sanitation' && 'Illegal Dumping Detection • Waste Management • Environmental Ops'}
            {role === 'god-view' && 'All Feeds • Cross-Department Intelligence • City-Wide Oversight'}
          </p>
        </div>

        {/* Incident count */}
        <div className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-2">
          <span className="text-[10px] font-mono text-slate-500 tracking-wider">
            ACTIVE THREATS:{' '}
            <span className={`font-bold ${theme.textClass}`}>{incidents.length}</span>
          </span>
        </div>

        {/* CityMap */}
        <CityMap
          incidents={incidents}
          markerColor={theme.markerColor}
          onIncidentClick={handleIncidentClick}
        />

        {/* ThreatCard overlay on selected incident */}
        {selectedIncident && (
          <div className="absolute top-20 left-4 z-20 animate-in fade-in slide-in-from-left-2 duration-300">
            <ThreatCard
              incidentId={selectedIncident.id}
              type={selectedIncident.type}
              confidence={Math.round(selectedIncident.confidence * 100)}
              themeColor={theme.color}
              snapshotUrl={selectedIncident.imageUrl}
              timestamp={selectedIncident.timestamp}
              dispatchLabel={theme.dispatchAction}
              onDispatch={handleDispatch}
              onFalseAlarm={handleFalseAlarm}
            />
          </div>
        )}
      </div>

      {/* ── Right: Neural Stream Sidebar ── */}
      <div className="w-80 xl:w-96 shrink-0">
        <NeuralStream logs={neuralLogs} />
      </div>
    </div>
  );
}
