'use client';

/**
 * SanitationCommandCenter — Full sanitation-specific dashboard.
 *
 * Layout: Summary Cards (top) | Fleet Map (60%) | Vehicle Status (20%) | Complaints (20%)
 *
 * Persona: Inspector Anil — field-first, low digital literacy
 * - Large buttons (60x60px minimum)
 * - Big fonts (16pt body)
 * - Icons + Text labels (no icon-only buttons)
 * - Simple color coding (green=active, yellow=stopped, red=idle)
 * - Big "Call Driver" button
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import TopNav from '@/components/ui/TopNav';
import NeuralStream from '@/components/ui/NeuralStream';
import StatsCard from '@/components/ui/StatsCard';
import StatusDot from '@/components/ui/StatusDot';
import AlertBanner, { useAlerts } from '@/components/ui/AlertBanner';
import LiveCameraOverlay from '@/components/ui/LiveCameraOverlay';
import { useCSOSSocket } from '@/lib/socket';
import { MOCK_TRUCKS, MOCK_COMPLAINTS } from '@/lib/mock-fleet-data';
import type { Incident } from '@/lib/mock-data';
import type { CitizenComplaint, SanitationTruck } from '@/lib/mock-fleet-data';
import { Recycle, Route, Users, MessageSquare, Phone, MapPin, Clock } from 'lucide-react';

const CityMap = dynamic(() => import('@/components/ui/CityMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-emerald-50 flex items-center justify-center rounded-xl">
      <div className="text-xs font-mono text-emerald-600 animate-pulse tracking-wider">LOADING FLEET MAP...</div>
    </div>
  ),
});

const STATUS_MAP: Record<string, 'available' | 'busy' | 'idle' | 'offline'> = {
  active: 'available',
  stopped: 'busy',
  idle: 'idle',
  offline: 'offline',
};

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

export default function SanitationCommandCenter() {
  const searchParams = useSearchParams();
  const { incidents, neuralLogs, connected } = useCSOSSocket('sanitation');
  const [fleet, setFleet] = useState<SanitationTruck[]>(MOCK_TRUCKS);
  const [complaints, setComplaints] = useState<CitizenComplaint[]>(MOCK_COMPLAINTS);
  const [focusedIncident, setFocusedIncident] = useState<Incident | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<{ cameraId: string; areaName: string } | null>(null);
  const [summary, setSummary] = useState<{ total_incidents: number; by_dept: { sanitation: number }; dispatched: number } | null>(null);
  const { alerts, addAlert, removeAlert } = useAlerts();
  const rootRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<HTMLElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  const complaintCoordinates: Record<string, { lat: number; lng: number }> = {
    'MG Road, Sector 12': { lat: 19.8782, lng: 75.3325 },
    'CIDCO N-6 Intersection': { lat: 19.8890, lng: 75.3620 },
    'Garkheda Colony': { lat: 19.8688, lng: 75.3515 },
    'Beed Bypass Service Road': { lat: 19.8550, lng: 75.3500 },
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFleet((prev) => prev.map((truck) => {
        if (truck.status === 'offline') return truck;
        const jitterLat = (Math.random() - 0.5) * 0.0012;
        const jitterLng = (Math.random() - 0.5) * 0.0012;
        const binsStep = truck.status === 'active' ? Math.round(Math.random()) : 0;
        return {
          ...truck,
          lat: Number((truck.lat + jitterLat).toFixed(6)),
          lng: Number((truck.lng + jitterLng).toFixed(6)),
          binsCollected: Math.min(truck.totalBins, truck.binsCollected + binsStep),
          lastUpdate: 'just now',
        };
      }));
    }, 8000);

    return () => window.clearInterval(timer);
  }, []);

  const complaintIncidents: Incident[] = complaints
    .filter((complaint) => complaint.status !== 'resolved')
    .map((complaint) => {
      const coord = complaintCoordinates[complaint.location] || { lat: 19.8762, lng: 75.3433 };
      return {
        id: complaint.id,
        type: `CITIZEN COMPLAINT — ${complaint.type}`,
        dept: 'sanitation',
        lat: coord.lat,
        lng: coord.lng,
        location: complaint.location,
        confidence: complaint.priority === 'high' ? 0.95 : complaint.priority === 'medium' ? 0.85 : 0.75,
        status: complaint.status === 'assigned' ? 'DISPATCHED' : 'AWAITING_VERIFICATION',
        timestamp: complaint.reportedAt,
        // eslint-disable-next-line react-hooks/purity
        detectedAt: Date.now() - 60_000,
        dispatchPlan: complaint.assignedTruck
          ? `Assigned ${complaint.assignedTruck}. ETA ${complaint.eta}.`
          : 'Awaiting truck assignment from sanitation fleet panel.',
      };
    });

  const fleetIncidents: Incident[] = fleet
    .filter((truck) => truck.status !== 'offline')
    .map((truck) => ({
      id: `TRK-${truck.id}`,
      type: `FLEET TRACKER — ${truck.status.toUpperCase()}`,
      dept: 'sanitation',
      lat: truck.lat,
      lng: truck.lng,
      location: `${truck.ward} (${truck.route})`,
      confidence: 0.99,
      status: truck.status === 'active' ? 'DISPATCHED' : 'AWAITING_VERIFICATION',
      timestamp: truck.lastUpdate,
      // eslint-disable-next-line react-hooks/purity
      detectedAt: Date.now() - 20_000,
      dispatchPlan: `${truck.id} collecting ${truck.binsCollected}/${truck.totalBins} bins. Driver: ${truck.driver}.`,
    }));

  const sanitationMapIncidents = [...incidents, ...complaintIncidents, ...fleetIncidents];

  useEffect(() => {
    let mounted = true;
    const loadSummary = async () => {
      try {
        const response = await fetch(`${(process.env.NEXT_PUBLIC_BACKEND_HTTP_BASE || 'http://localhost:8000').replace(/\/$/, '')}/api/dashboard-summary`);
        if (!response.ok) return;
        const payload = await response.json();
        if (mounted) {
          setSummary({
            total_incidents: Number(payload.total_incidents || 0),
            dispatched: Number(payload.dispatched || 0),
            by_dept: {
              sanitation: Number(payload?.by_dept?.sanitation || 0),
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

  const handleCallDriver = (driverName: string, phone: string) => {
    addAlert({ type: 'info', message: `Calling ${driverName} at ${phone}...` });
  };

  const handleAssignTruck = (complaintId: string) => {
    const availableTruck = fleet.find((truck) => truck.status === 'active' || truck.status === 'idle');
    if (!availableTruck) {
      addAlert({ type: 'warning', message: 'No truck is currently available for assignment.' });
      return;
    }

    setComplaints((prev) => prev.map((complaint) => (
      complaint.id === complaintId
        ? {
          ...complaint,
          status: 'assigned',
          assignedTruck: availableTruck.id,
          eta: '18 mins',
        }
        : complaint
    )));

    addAlert({ type: 'success', message: `Assigned ${availableTruck.id} to complaint ${complaintId}.` });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" ref={rootRef}>
      <TopNav role="sanitation" alertCount={complaints.filter(c => c.status !== 'resolved').length} />

      {/* Summary Cards Row */}
      <div className="shrink-0 px-4 py-3 bg-white border-b border-slate-200">
        <div className="grid grid-cols-4 gap-3">
          <StatsCard title="Sanitation Alerts" value={summary?.by_dept.sanitation ?? incidents.length} icon={<Recycle className="h-4 w-4" />} variant="sanitation" />
          <StatsCard title="Dispatch Actions" value={summary?.dispatched ?? incidents.filter((incident) => incident.status === 'DISPATCHED').length} icon={<Route className="h-4 w-4" />} variant="sanitation" />
          <StatsCard title="Queue Size" value={complaints.filter((complaint) => complaint.status !== 'resolved').length} icon={<Users className="h-4 w-4" />} variant="sanitation" />
          <StatsCard title="Backend Link" value={connected ? 'LIVE' : 'DEGRADED'} icon={<MessageSquare className="h-4 w-4" />} variant={connected ? 'sanitation' : 'default'} trend={connected ? 'up' : 'down'} trendLabel={connected ? 'WS connected' : 'using fallback'} />
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex gap-3 p-3 overflow-hidden">
        {/* Left: Fleet Map (60%) */}
        <section className="w-3/5 relative rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden" id="map-panel">
          <div className="absolute top-3 left-3 z-20 px-3 py-2 rounded-md bg-white/95 border border-emerald-200 shadow-sm">
            <h2 className="text-xs font-bold tracking-wide text-emerald-800">SANITATION — Fleet Map</h2>
            <p className="text-[10px] text-slate-500">Vehicle locations & bin coverage</p>
          </div>
          <CityMap
            incidents={sanitationMapIncidents}
            markerColor="#10b981"
            deptScope="sanitation"
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

        {/* Middle: Vehicle Status (20%) */}
        <section className="w-1/5 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col" ref={queueRef} id="incidents-panel">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-emerald-800 tracking-wide">Fleet Status</h3>
            <div className="mt-1 flex gap-2 text-[10px] font-semibold">
              <span className="flex items-center gap-1"><StatusDot status="available" size="sm" /> {fleet.filter(t => t.status === 'active').length}</span>
              <span className="flex items-center gap-1"><StatusDot status="idle" size="sm" /> {fleet.filter(t => t.status === 'idle').length}</span>
              <span className="flex items-center gap-1"><StatusDot status="offline" size="sm" /> {fleet.filter(t => t.status === 'offline').length}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {fleet.map((truck) => (
              <div key={truck.id} className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot status={STATUS_MAP[truck.status]} size="md" />
                    <span className="text-xs font-bold text-slate-800">{truck.id}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{truck.lastUpdate}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">{truck.ward} • {truck.route}</p>

                {/* Progress bar */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>Bins: {truck.binsCollected}/{truck.totalBins}</span>
                    <span>{Math.round(truck.binsCollected / truck.totalBins * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${(truck.binsCollected / truck.totalBins) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Call driver — BIG button for low digital literacy */}
                <button
                  onClick={() => handleCallDriver(truck.driver, truck.phone)}
                  className="mt-2 w-full py-2.5 rounded-md bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition min-h-[44px]"
                >
                  <Phone className="h-4 w-4" /> Call {truck.driver.split(' ')[0]}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Right: Complaint Queue (20%) */}
        <section className="w-1/5 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-emerald-800 tracking-wide">Complaints</h3>
            <p className="text-[10px] text-slate-500">{complaints.filter(c => c.status !== 'resolved').length} active</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {complaints.map((complaint) => (
              <article key={complaint.id} className={`rounded-lg border p-3 ${complaint.status === 'resolved' ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{complaint.id}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${PRIORITY_STYLES[complaint.priority]}`}>
                    {complaint.priority.toUpperCase()}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-[11px] font-semibold text-slate-700">{complaint.type}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {complaint.location}
                </p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" /> {complaint.reportedAt} • {complaint.reportedBy}
                </p>
                {complaint.assignedTruck && (
                  <p className="mt-1 text-[11px] text-emerald-700 font-medium">
                    🚛 {complaint.assignedTruck} • ETA: {complaint.eta}
                  </p>
                )}
                {complaint.status === 'resolved' && (
                  <p className="mt-1 text-[11px] text-slate-500 font-medium">✓ Resolved</p>
                )}
                {complaint.status === 'registered' && (
                  <button
                    onClick={() => handleAssignTruck(complaint.id)}
                    className="mt-2 w-full py-2 rounded-md bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition min-h-[40px]"
                  >
                    🚛 Assign Nearest Truck
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>

      <AlertBanner alerts={alerts} onDismiss={removeAlert} />
    </div>
  );
}
