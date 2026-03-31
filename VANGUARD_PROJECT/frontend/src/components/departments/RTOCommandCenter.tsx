'use client';

/**
 * RTOCommandCenter — Full RTO-specific dashboard.
 *
 * Layout: Search Bar (top) | Map (50%) | Violation Queue (25%) | Analytics (25%)
 *
 * Persona: Inspector Priya — data-heavy shifts, VAHAN muscle memory
 * - Prominent vehicle search bar (always visible, auto-focus)
 * - Violation processing with pre-filled e-challan
 * - Today's stats and revenue tracking
 * - Traffic map with violation markers
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import TopNav from '@/components/ui/TopNav';
import NeuralStream from '@/components/ui/NeuralStream';
import StatsCard from '@/components/ui/StatsCard';
import AlertBanner, { useAlerts } from '@/components/ui/AlertBanner';
import LiveCameraOverlay from '@/components/ui/LiveCameraOverlay';
import { useCSOSSocket } from '@/lib/socket';
import type { Incident } from '@/lib/mock-data';
import { Search, Car, FileWarning, IndianRupee, Gauge, Clock, CheckCircle2 } from 'lucide-react';

const BACKEND_HTTP_BASE = (process.env.NEXT_PUBLIC_BACKEND_HTTP_BASE || 'http://localhost:8000').replace(/\/$/, '');

const CityMap = dynamic(() => import('@/components/ui/CityMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center rounded-xl">
      <div className="text-xs font-mono text-slate-500 animate-pulse tracking-wider">INITIALIZING MAP ENGINE...</div>
    </div>
  ),
});

// Mock VAHAN lookup results
const MOCK_VAHAN_DB: Record<string, { owner: string; model: string; fitness: string; insurance: string; challans: number; amount: number }> = {
  'MH20AB1234': { owner: 'Rajesh Kumar', model: 'Honda City 2020', fitness: '31/12/2026', insurance: 'Active', challans: 2, amount: 1200 },
  'MH20CD5678': { owner: 'Priya Sharma', model: 'Hyundai i20 2022', fitness: '15/06/2027', insurance: 'Active', challans: 0, amount: 0 },
  'MH12XY9876': { owner: 'Anil Patil', model: 'Tata Nexon 2021', fitness: '28/03/2026', insurance: 'Expired', challans: 3, amount: 4500 },
};

export default function RTOCommandCenter() {
  const searchParams = useSearchParams();
  const { incidents, neuralLogs, connected } = useCSOSSocket('rto');
  const [focusedIncident, setFocusedIncident] = useState<Incident | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<{ cameraId: string; areaName: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<(typeof MOCK_VAHAN_DB)[string] | null>(null);
  const [summary, setSummary] = useState<{ total_incidents: number; dispatched: number; by_dept: { rto: number } } | null>(null);
  const { alerts, addAlert, removeAlert } = useAlerts();
  const rootRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<HTMLElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  const violations = useMemo(() =>
    incidents.filter((i) => i.status === 'AWAITING_VERIFICATION'),
    [incidents]
  );

  useEffect(() => {
    let mounted = true;
    const loadSummary = async () => {
      try {
        const response = await fetch(`${BACKEND_HTTP_BASE}/api/dashboard-summary`);
        if (!response.ok) return;
        const payload = await response.json();
        if (mounted) {
          setSummary({
            total_incidents: Number(payload.total_incidents || 0),
            dispatched: Number(payload.dispatched || 0),
            by_dept: {
              rto: Number(payload?.by_dept?.rto || 0),
            },
          });
        }
      } catch {
        // ignore
      }
    };

    void loadSummary();
    const timer = window.setInterval(() => {
      void loadSummary();
    }, 10000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'map') {
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (view === 'incidents') {
      queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (view === 'reports') {
      logsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else if (view === 'dashboard') {
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams]);

  const handleSearch = useCallback(() => {
    const normalized = searchQuery.replace(/[-\s]/g, '').toUpperCase();
    const result = MOCK_VAHAN_DB[normalized] || null;
    setSearchResult(result);
    if (!result && searchQuery.length > 5) {
      addAlert({ type: 'info', message: `No VAHAN record for ${searchQuery}` });
    }
  }, [searchQuery, addAlert]);

  const handleIssueChallan = useCallback(async (incident: Incident) => {
    try {
      const response = await fetch(`${BACKEND_HTTP_BASE}/api/hitl-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFIED',
          incident_id: incident.id,
          officer_id: 'RTO-OFFICER-01',
          role: 'rto',
          dept: 'rto',
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(String(result?.detail || 'Challan failed'));
      addAlert({ type: 'success', message: `E-Challan issued for ${incident.id}` });
    } catch (error) {
      addAlert({ type: 'error', message: error instanceof Error ? error.message : 'Challan failed' });
    }
  }, [addAlert]);

  return (
    <div className="flex flex-col h-full overflow-hidden" ref={rootRef}>
      <TopNav role="rto" alertCount={violations.length} />

      {/* Search Bar — Always Visible */}
      <div className="shrink-0 px-4 py-3 bg-white border-b border-slate-200">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter Registration Number: MH-12-AB-1234"
              className="w-full pl-10 pr-4 py-3 text-lg font-mono border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none transition"
              autoFocus
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-[#1E40AF] text-white font-semibold rounded-lg hover:bg-blue-800 transition text-sm"
          >
            Search VAHAN
          </button>
        </div>

        {/* Search result card */}
        {searchResult && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-blue-900">{searchQuery}</div>
                <div className="text-xs text-blue-700 mt-1">Owner: {searchResult.owner} | {searchResult.model}</div>
                <div className="text-xs text-blue-600 mt-0.5">Fitness: {searchResult.fitness} | Insurance: {searchResult.insurance}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Pending Challans</div>
                <div className="text-lg font-bold text-blue-900">{searchResult.challans} (₹{searchResult.amount.toLocaleString('en-IN')})</div>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => addAlert({ type: 'info', message: `Fetched backend history for ${searchQuery || 'vehicle record'}.` })}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View Full History
              </button>
              <button
                onClick={() => addAlert({ type: 'success', message: `Manual e-challan initiated for ${searchQuery || 'selected vehicle'}.` })}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded hover:bg-amber-600"
              >
                Issue Challan
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="shrink-0 px-4 py-2 bg-slate-50 border-b border-slate-200">
        <div className="grid grid-cols-4 gap-3">
          <StatsCard title="Live ANPR/Traffic Alerts" value={summary?.by_dept.rto ?? incidents.length} icon={<Car className="h-4 w-4" />} variant="rto" />
          <StatsCard title="Violations In Queue" value={violations.length} icon={<FileWarning className="h-4 w-4" />} variant="rto" />
          <StatsCard title="Dispatch Actions" value={summary?.dispatched ?? incidents.filter(i => i.status === 'DISPATCHED').length} icon={<CheckCircle2 className="h-4 w-4" />} variant="rto" />
          <StatsCard title="Backend Link" value={connected ? 'LIVE' : 'DEGRADED'} icon={<IndianRupee className="h-4 w-4" />} variant={connected ? 'sanitation' : 'default'} trend={connected ? 'up' : 'down'} trendLabel={connected ? 'WS connected' : 'using fallback'} />
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="flex-1 flex gap-3 p-3 overflow-hidden">
        {/* Left: Map (60%) */}
        <section className="w-3/5 relative rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden" id="map-panel">
          <div className="absolute top-3 left-3 z-20 px-3 py-2 rounded-md bg-white/95 border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold tracking-wide text-[#1E40AF]">RTO COMMAND — Traffic Map</h2>
            <p className="text-[10px] text-slate-500">Violation locations & traffic cameras</p>
          </div>
          <CityMap
            incidents={incidents}
            markerColor="#3b82f6"
            deptScope="rto"
            onIncidentClick={setFocusedIncident}
            focusIncident={focusedIncident}
            onCameraNodeClick={(cameraId, areaName) => setSelectedCamera({ cameraId, areaName })}
          />
          <div ref={logsRef} id="reports-panel">
            <NeuralStream logs={neuralLogs} />
          </div>
          {selectedCamera && (
            <LiveCameraOverlay
              cameraId={selectedCamera.cameraId}
              areaName={selectedCamera.areaName}
              onClose={() => setSelectedCamera(null)}
            />
          )}
        </section>

        {/* Right: Violation Queue (40%) */}
        <section className="w-2/5 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col" ref={queueRef} id="incidents-panel">
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1E40AF] tracking-wide">Violation Queue</h3>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{violations.length}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">One-click e-challan processing</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {violations.length === 0 && (
              <div className="text-sm text-slate-400 p-4 text-center border border-dashed border-slate-300 rounded-lg">
                No pending violations
              </div>
            )}
            {violations.map((inc) => (
              <article key={inc.id} className="rounded-lg border border-slate-200 p-3 bg-white hover:shadow-sm transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{inc.id}</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {inc.timestamp}
                  </span>
                </div>
                <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 tracking-wide">
                  {inc.type}
                </span>
                <p className="mt-1 text-xs text-slate-600">📍 {inc.location}</p>
                <p className="mt-1 text-xs text-slate-500">{inc.dispatchPlan}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => void handleIssueChallan(inc)}
                    className="flex-1 py-2 rounded-md text-xs font-bold bg-[#1E40AF] text-white hover:bg-blue-800 transition"
                  >
                    📋 ISSUE E-CHALLAN
                  </button>
                  <button
                    onClick={() => { setFocusedIncident(inc); }}
                    className="px-3 py-2 rounded-md text-xs font-medium border border-slate-200 hover:bg-slate-50 transition"
                  >
                    📍 Locate
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <AlertBanner alerts={alerts} onDismiss={removeAlert} />
    </div>
  );
}
