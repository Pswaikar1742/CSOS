'use client';

/**
 * CityCommandCenter — Unified god-view executive dashboard.
 *
 * Layout: KPI Bar (top) | Unified Map (40%) | Department Cards + Insights (60%)
 *
 * Persona: Dr. Meera (IAS) — presenting to the Mayor
 * - Key metrics above the fold (no scrolling needed)
 * - High contrast for large screen projection
 * - Real-time updates via WebSocket
 * - All 3 department data on one unified map
 * - Scrolling alerts ticker for cross-department events
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import TopNav from '@/components/ui/TopNav';
import NeuralStream from '@/components/ui/NeuralStream';
import StatsCard from '@/components/ui/StatsCard';
import AlertBanner, { useAlerts } from '@/components/ui/AlertBanner';
import CCTVFeeds from '@/components/ui/CCTVFeeds';
import { useCSOSSocket } from '@/lib/socket';
import { RECENT_CROSS_ALERTS } from '@/lib/mock-city-kpis';
import type { Incident } from '@/lib/mock-data';
import { withPersonaCoverage } from '@/lib/incident-augmentation';
import LiveCameraOverlay from '@/components/ui/LiveCameraOverlay';
import { ShieldCheck, Gauge, Sparkles, Star, ArrowRight } from 'lucide-react';

const BACKEND_HTTP_BASE = (process.env.NEXT_PUBLIC_BACKEND_HTTP_BASE || 'http://localhost:8000').replace(/\/$/, '');

const CityMap = dynamic(() => import('@/components/ui/CityMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-800 flex items-center justify-center rounded-xl">
      <div className="text-xs font-mono text-amber-400 animate-pulse tracking-wider">LOADING UNIFIED MAP...</div>
    </div>
  ),
});

const STATUS_EMOJI: Record<string, string> = {
  operational: '🟢',
  warning: '🟠',
  critical: '🔴',
};

export default function CityCommandCenter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { incidents, neuralLogs } = useCSOSSocket('god-view');
  const [focusedIncident, setFocusedIncident] = useState<Incident | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<{ cameraId: string; areaName: string } | null>(null);
  const [summary, setSummary] = useState<{
    total_incidents: number;
    awaiting_verification: number;
    dispatched: number;
    resolved: number;
    by_dept: { police: number; rto: number; sanitation: number };
    units: { police: number; rto: number; sanitation: number };
  } | null>(null);
  const tickerRef = useRef<HTMLDivElement>(null);
  const seenIncidentIds = useRef<Set<string>>(new Set());
  const { alerts, addAlert, removeAlert } = useAlerts();
  const rootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLElement>(null);
  const incidentsRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  const activeIncidents = incidents.filter((incident) => incident.status === 'AWAITING_VERIFICATION');
  const alignedActiveIncidents = useMemo(
    () => withPersonaCoverage(activeIncidents, 'god-view'),
    [activeIncidents]
  );
  const alignedCounts = useMemo(() => ({
    police: alignedActiveIncidents.filter((incident) => incident.dept === 'police').length,
    rto: alignedActiveIncidents.filter((incident) => incident.dept === 'rto').length,
    sanitation: alignedActiveIncidents.filter((incident) => incident.dept === 'sanitation').length,
  }), [alignedActiveIncidents]);

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
            awaiting_verification: Number(payload.awaiting_verification || 0),
            dispatched: Number(payload.dispatched || 0),
            resolved: Number(payload.resolved || 0),
            by_dept: {
              police: Number(payload?.by_dept?.police || 0),
              rto: Number(payload?.by_dept?.rto || 0),
              sanitation: Number(payload?.by_dept?.sanitation || 0),
            },
            units: {
              police: Number(payload?.units?.police || 0),
              rto: Number(payload?.units?.rto || 0),
              sanitation: Number(payload?.units?.sanitation || 0),
            },
          });
        }
      } catch {
        // ignore dashboard summary failures
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

  // Auto-scroll ticker
  useEffect(() => {
    const ticker = tickerRef.current;
    if (!ticker) return;

    let animFrame: number;
    let scrollPos = 0;

    const scroll = () => {
      scrollPos += 0.5;
      if (scrollPos >= ticker.scrollWidth / 2) scrollPos = 0;
      ticker.scrollLeft = scrollPos;
      animFrame = requestAnimationFrame(scroll);
    };

    animFrame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  const navigateView = (view: string | null) => {
    if (view === 'map') {
      mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (view === 'reports') {
      logsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return;
    }
    if (view === 'incidents') {
      incidentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    navigateView(searchParams.get('view'));
  }, [searchParams]);

  useEffect(() => {
    const onNavigate = (event: Event) => {
      const customEvent = event as CustomEvent<{ target?: string }>;
      navigateView(customEvent.detail?.target || 'dashboard');
    };

    window.addEventListener('csos:navigate', onNavigate as EventListener);
    return () => window.removeEventListener('csos:navigate', onNavigate as EventListener);
  }, []);

  useEffect(() => {
    incidents.forEach((incident) => {
      if (seenIncidentIds.current.has(incident.id)) return;
      seenIncidentIds.current.add(incident.id);
      addAlert({ type: 'info', message: `${incident.type} detected at ${incident.location}` });
    });
  }, [incidents, addAlert]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F0F2F5]" ref={rootRef}>
      <TopNav role="god-view" alertCount={alignedActiveIncidents.length} />

      {/* KPI Bar */}
      <div className="shrink-0 px-4 py-3 bg-white border-b border-slate-200">
        <div className="grid grid-cols-4 gap-3">
          <StatsCard
            title="Open Alerts"
            value={alignedActiveIncidents.length}
            icon={<ShieldCheck className="h-4 w-4" />}
            variant="city"
            trend="same"
            trendLabel="from backend queue"
          />
          <StatsCard
            title="RTO Alerts"
            value={alignedCounts.rto}
            icon={<Gauge className="h-4 w-4" />}
            variant="rto"
            trend="same"
            trendLabel="live dept count"
          />
          <StatsCard
            title="Sanitation Alerts"
            value={alignedCounts.sanitation}
            icon={<Sparkles className="h-4 w-4" />}
            variant="sanitation"
            trend="same"
            trendLabel="live dept count"
          />
          <StatsCard
            title="Total Incidents"
            value={alignedActiveIncidents.length}
            icon={<Star className="h-4 w-4" />}
            variant="city"
            trend="same"
            trendLabel="verified incident log"
          />
        </div>
      </div>

      {/* Alerts Ticker */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-700 overflow-hidden">
        <div
          ref={tickerRef}
          className="flex gap-8 px-4 py-2 overflow-x-hidden whitespace-nowrap"
        >
          {/* Render alerts twice for seamless scroll loop */}
          {[...RECENT_CROSS_ALERTS, ...RECENT_CROSS_ALERTS].map((alert, i) => (
            <span key={i} className="text-xs text-slate-300 font-mono shrink-0">
              {alert}
            </span>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex gap-3 p-3 overflow-hidden">
        {/* Left: Unified Map (50%) */}
        <section className="w-1/2 relative rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden" ref={mapRef} id="map-panel">
          <div className="absolute top-3 left-3 z-20 px-3 py-2 rounded-md bg-white/95 border border-amber-200 shadow-sm">
            <h2 className="text-xs font-bold tracking-wide text-amber-800">CITY COMMAND CENTER</h2>
            <p className="text-[10px] text-slate-500">All departments — unified view</p>
          </div>
          <CityMap
            incidents={alignedActiveIncidents}
            markerColor="#a855f7"
            deptScope="god-view"
            incidentSource="input-only"
            enableTransientIncidents={false}
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

        {/* Right: Department Cards + Insights (50%) */}
        <div className="w-1/2 flex flex-col gap-3 overflow-y-auto" ref={incidentsRef} id="incidents-panel">
          {/* CCTV Feeds Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Live CCTV Coverage</h3>
            <CCTVFeeds department="god-view" maxFeeds={6} compact={true} />
          </div>

          {/* Department Status Cards */}
          <div className="grid grid-cols-1 gap-3">
            {[
              {
                name: 'Police Command',
                role: 'police',
                color: '#DC2626',
                activeIncidents: alignedCounts.police,
                responseTime: 'Live via dispatch logs',
                unitsAvailable: `${summary?.units.police ?? 0} configured`,
                status: (summary?.by_dept.police ?? 0) > 0 ? 'operational' : 'warning',
                highlight: 'Counts are sourced from verified_incidents + backend unit registry.',
              },
              {
                name: 'RTO Command',
                role: 'rto',
                color: '#1E40AF',
                activeIncidents: alignedCounts.rto,
                responseTime: 'Live via dispatch logs',
                unitsAvailable: `${summary?.units.rto ?? 0} configured`,
                status: (summary?.by_dept.rto ?? 0) > 0 ? 'operational' : 'warning',
                highlight: 'Queue and dispatch metrics are backend-generated.',
              },
              {
                name: 'Sanitation Control',
                role: 'sanitation',
                color: '#059669',
                activeIncidents: alignedCounts.sanitation,
                responseTime: 'Live via dispatch logs',
                unitsAvailable: `${summary?.units.sanitation ?? 0} configured`,
                status: (summary?.by_dept.sanitation ?? 0) > 0 ? 'operational' : 'warning',
                highlight: 'Node-level hazard counts are sourced from verified incidents.',
              },
            ].map((dept) => (
              <article
                key={dept.role}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition animate-fade-in"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                    <h3 className="text-sm font-bold text-slate-800">{dept.name}</h3>
                  </div>
                  <span className="text-xs font-semibold">
                    {STATUS_EMOJI[dept.status]} {dept.status.toUpperCase()}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-slate-900">{dept.activeIncidents}</div>
                    <div className="text-[10px] text-slate-500">Active Incidents</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900">{dept.responseTime}</div>
                    <div className="text-[10px] text-slate-500">Response Time</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900">{dept.unitsAvailable}</div>
                    <div className="text-[10px] text-slate-500">Units Available</div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500 italic">{dept.highlight}</p>
                <button
                  onClick={() => router.push(`/${dept.role}?view=dashboard`)}
                  className="mt-2 text-[11px] text-[#1E3A8A] font-semibold hover:underline flex items-center gap-1"
                >
                  View Details <ArrowRight className="h-3 w-3" />
                </button>
              </article>
            ))}
          </div>

          {/* Today's Summary */}
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Today&apos;s City Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Incidents</span>
                <span className="font-bold text-slate-900">{alignedActiveIncidents.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Open Queue</span>
                <span className="font-bold text-slate-900">{alignedActiveIncidents.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dispatched</span>
                <span className="font-bold text-emerald-600">{summary?.dispatched ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Resolved</span>
                <span className="font-bold text-slate-900">{summary?.resolved ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Police Unit Registry</span>
                <span className="font-bold text-slate-900">{summary?.units.police ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">RTO Unit Registry</span>
                <span className="font-bold text-slate-900">{summary?.units.rto ?? 0}</span>
              </div>
            </div>
          </article>
        </div>
      </div>

      <AlertBanner alerts={alerts} onDismiss={removeAlert} />
    </div>
  );
}
