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

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import TopNav from '@/components/ui/TopNav';
import NeuralStream from '@/components/ui/NeuralStream';
import StatsCard from '@/components/ui/StatsCard';
import { useCSOSSocket } from '@/lib/socket';
import { DEPARTMENT_SUMMARIES, CITY_KPIS, RECENT_CROSS_ALERTS } from '@/lib/mock-city-kpis';
import type { Incident } from '@/lib/mock-data';
import { ShieldCheck, Gauge, Sparkles, Star, ArrowRight } from 'lucide-react';

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
  const { incidents, neuralLogs } = useCSOSSocket('god-view');
  const [focusedIncident, setFocusedIncident] = useState<Incident | null>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F0F2F5]">
      <TopNav role="god-view" alertCount={incidents.filter(i => i.status === 'AWAITING_VERIFICATION').length} />

      {/* KPI Bar */}
      <div className="shrink-0 px-4 py-3 bg-white border-b border-slate-200">
        <div className="grid grid-cols-4 gap-3">
          <StatsCard
            title="Safety Index"
            value={CITY_KPIS.safetyIndex.value}
            icon={<ShieldCheck className="h-4 w-4" />}
            variant="city"
            trend={CITY_KPIS.safetyIndex.trend}
            trendLabel={CITY_KPIS.safetyIndex.label}
          />
          <StatsCard
            title="Traffic Efficiency"
            value={CITY_KPIS.trafficEfficiency.value}
            icon={<Gauge className="h-4 w-4" />}
            variant="rto"
            trend={CITY_KPIS.trafficEfficiency.trend}
            trendLabel={CITY_KPIS.trafficEfficiency.label}
          />
          <StatsCard
            title="Cleanliness Score"
            value={CITY_KPIS.cleanlinessScore.value}
            icon={<Sparkles className="h-4 w-4" />}
            variant="sanitation"
            trend={CITY_KPIS.cleanlinessScore.trend}
            trendLabel={CITY_KPIS.cleanlinessScore.label}
          />
          <StatsCard
            title="Citizen Satisfaction"
            value={CITY_KPIS.citizenSatisfaction.value}
            icon={<Star className="h-4 w-4" />}
            variant="city"
            trend={CITY_KPIS.citizenSatisfaction.trend}
            trendLabel={CITY_KPIS.citizenSatisfaction.label}
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
        <section className="w-1/2 relative rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="absolute top-3 left-3 z-20 px-3 py-2 rounded-md bg-white/95 border border-amber-200 shadow-sm">
            <h2 className="text-xs font-bold tracking-wide text-amber-800">CITY COMMAND CENTER</h2>
            <p className="text-[10px] text-slate-500">All departments — unified view</p>
          </div>
          <CityMap
            incidents={incidents}
            markerColor="#a855f7"
            onIncidentClick={setFocusedIncident}
            focusIncident={focusedIncident}
          />
          <NeuralStream logs={neuralLogs} />
        </section>

        {/* Right: Department Cards + Insights (50%) */}
        <div className="w-1/2 flex flex-col gap-3 overflow-y-auto">
          {/* Department Status Cards */}
          <div className="grid grid-cols-1 gap-3">
            {DEPARTMENT_SUMMARIES.map((dept) => (
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
                <button className="mt-2 text-[11px] text-[#1E3A8A] font-semibold hover:underline flex items-center gap-1">
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
                <span className="font-bold text-slate-900">{incidents.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Avg Response</span>
                <span className="font-bold text-slate-900">9 mins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Traffic Flow</span>
                <span className="font-bold text-emerald-600">Smooth</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Waste Collected</span>
                <span className="font-bold text-slate-900">124 Tons</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Citizen Complaints</span>
                <span className="font-bold text-slate-900">45 (38 ✓)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Revenue</span>
                <span className="font-bold text-slate-900">₹2,34,500</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
