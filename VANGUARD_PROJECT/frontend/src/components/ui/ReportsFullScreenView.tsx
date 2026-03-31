'use client';

/**
 * ReportsFullScreenView — Full-screen incident resolution analytics & audit trail
 * 
 * Features:
 * - Summary stats (total incidents, avg resolution time, SLA%)
 * - Historical incidents table with audit trail
 * - For god-view: cross-department analytics
 * - Export ready data structure
 */

import { useState, useMemo } from 'react';
import { TrendingDown, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import type { CSOSRole } from '@/lib/types';
import type { Incident } from '@/lib/mock-data';

interface ReportIncident extends Incident {
  resolvedAt?: number;
  assignedOfficer?: string;
  assignedUnit?: string;
  auditHash?: string;
  timeTaken?: number; // in minutes
}

interface ReportsFullScreenViewProps {
  incidents: Incident[];
  resolvedIncidents?: ReportIncident[];
  role: CSOSRole;
}

const MOCK_RESOLVED_INCIDENTS: ReportIncident[] = [
  {
    id: 'INC-2026-001',
    type: 'Weapon Detection',
    location: 'Kranti Chowk',
    dept: 'police',
    status: 'RESOLVED',
    detectedAt: Date.now() - 45 * 60000,
    resolvedAt: Date.now() - 15 * 60000,
    assignedOfficer: 'Inspector Rajesh Kumar',
    assignedUnit: 'Beat Marshal P-08',
    auditHash: 'SHA256-a1b2c3d4e5f6',
    timeTaken: 30,
    dispatchPlan: 'Direct dispatch',
  },
  {
    id: 'INC-2026-002',
    type: 'Traffic Violation (Speed)',
    location: 'N-6 Highway',
    dept: 'rto',
    status: 'RESOLVED',
    detectedAt: Date.now() - 35 * 60000,
    resolvedAt: Date.now() - 8 * 60000,
    assignedOfficer: 'RTO Officer Priya Singh',
    assignedUnit: 'E-Challan RTO-12',
    auditHash: 'SHA256-f6e5d4c3b2a1',
    timeTaken: 27,
    dispatchPlan: 'E-challan issuance',
  },
  {
    id: 'INC-2026-003',
    type: 'Pothole Detected',
    location: 'CIDCO Area',
    dept: 'sanitation',
    status: 'RESOLVED',
    detectedAt: Date.now() - 120 * 60000,
    resolvedAt: Date.now() - 50 * 60000,
    assignedOfficer: 'Sanitation Supervisor Amit Patil',
    assignedUnit: 'Ghanta Gaadi SWM-04',
    auditHash: 'SHA256-b1c2d3e4f5a6',
    timeTaken: 70,
    dispatchPlan: 'Road repair cell notification',
  },
];

function getMetrics(incidents: ReportIncident[]) {
  if (incidents.length === 0) {
    return {
      total: 0,
      avgTime: 0,
      slaCompliance: 0,
      closed: 0,
      open: 0,
    };
  }

  const closed = incidents.filter((i) => i.status === 'RESOLVED').length;
  const times = incidents
    .filter((i) => i.timeTaken)
    .map((i) => i.timeTaken || 0);
  const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b) / times.length) : 0;

  // SLA: 90% should resolve within their category SLA
  // Police: 10min, RTO: 20min, Sanitation: 60min
  const slaSizes: Record<string, number> = { police: 10, rto: 20, sanitation: 60 };
  const slaMet = incidents.filter((i) => {
    const sla = slaSizes[i.dept] || 30;
    return !i.timeTaken || i.timeTaken <= sla;
  }).length;
  const slaCompliance = Math.round((slaMet / incidents.length) * 100);

  return {
    total: incidents.length,
    avgTime,
    slaCompliance,
    closed,
    open: incidents.filter((i) => i.status !== 'RESOLVED').length,
  };
}

export default function ReportsFullScreenView({
  incidents,
  resolvedIncidents,
  role,
}: ReportsFullScreenViewProps) {
  const [dateFilter, setDateFilter] = useState<'24h' | '7d' | '30d'>('24h');
  const [deptFilter, setDeptFilter] = useState<string | null>(null);

  const isReadOnly = role === 'god-view';

  const allReportIncidents = useMemo(() => {
    const combined = [...(resolvedIncidents || MOCK_RESOLVED_INCIDENTS)];
    if (role !== 'god-view') {
      return combined.filter((i) => i.dept === role);
    }
    return combined;
  }, [resolvedIncidents, role]);

  const filteredIncidents = useMemo(() => {
    let filtered = allReportIncidents;

    // Dept filter for god-view
    if (deptFilter) {
      filtered = filtered.filter((i) => i.dept === deptFilter);
    }

    // Date filter
    const now = Date.now();
    const filterMs =
      dateFilter === '24h' ? 24 * 60 * 60 * 1000 : dateFilter === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((i) => now - i.detectedAt <= filterMs);

    return filtered.sort((a, b) => b.detectedAt - a.detectedAt);
  }, [allReportIncidents, dateFilter, deptFilter]);

  const metrics = useMemo(() => getMetrics(filteredIncidents), [filteredIncidents]);

  const deptOptions = isReadOnly
    ? [
        { value: null, label: 'All Departments' },
        { value: 'police', label: '🚔 Police' },
        { value: 'rto', label: '🚗 RTO' },
        { value: 'sanitation', label: '🧹 Sanitation' },
      ]
    : [];

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-lg border-2 border-slate-300 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b-2 border-slate-300 bg-white shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[#002147] flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Incident Resolution Reports
          </h2>
        </div>
        <p className="text-xs text-slate-600 mb-3">
          {isReadOnly ? 'Cross-department analytics & audit trail' : 'Incident history and resolution metrics'}
        </p>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">Time Period:</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as '24h' | '7d' | '30d')}
              className="px-2 py-1 text-[11px] rounded border border-slate-300 bg-white text-slate-700"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          {isReadOnly && deptOptions.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">Department:</label>
              <select
                value={deptFilter || ''}
                onChange={(e) => setDeptFilter(e.target.value || null)}
                className="px-2 py-1 text-[11px] rounded border border-slate-300 bg-white text-slate-700"
              >
                {deptOptions.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value || ''}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button className="ml-auto px-3 py-1.5 rounded text-xs font-medium bg-blue-900 text-white hover:bg-blue-800 transition-colors">
            📊 Export CSV
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-4 py-3 border-b border-slate-300 bg-white grid grid-cols-4 gap-2 shrink-0">
        <div className="p-2 rounded border border-slate-200 bg-slate-50">
          <p className="text-[10px] text-slate-600 font-semibold">Total Incidents</p>
          <p className="text-lg font-bold text-slate-900">{metrics.total}</p>
        </div>
        <div className="p-2 rounded border border-slate-200 bg-emerald-50">
          <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Resolved
          </p>
          <p className="text-lg font-bold text-emerald-900">{metrics.closed}</p>
        </div>
        <div className="p-2 rounded border border-slate-200 bg-amber-50">
          <p className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
            <Clock className="h-3 w-3" /> Avg Time
          </p>
          <p className="text-lg font-bold text-amber-900">{metrics.avgTime}m</p>
        </div>
        <div className={`p-2 rounded border border-slate-200 ${metrics.slaCompliance >= 90 ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <p className={`text-[10px] font-semibold flex items-center gap-1 ${metrics.slaCompliance >= 90 ? 'text-emerald-700' : 'text-red-700'}`}>
            {metrics.slaCompliance >= 90 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            SLA Compliance
          </p>
          <p className={`text-lg font-bold ${metrics.slaCompliance >= 90 ? 'text-emerald-900' : 'text-red-900'}`}>
            {metrics.slaCompliance}%
          </p>
        </div>
      </div>

      {/* Historical Table */}
      <div className="flex-1 overflow-y-auto shrink-1">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-slate-200 border-b-2 border-slate-300">
            <tr>
              <th className="px-2 py-1.5 text-left font-bold text-slate-900">Incident ID</th>
              <th className="px-2 py-1.5 text-left font-bold text-slate-900">Type</th>
              <th className="px-2 py-1.5 text-left font-bold text-slate-900">Location</th>
              <th className="px-2 py-1.5 text-left font-bold text-slate-900">Assigned To</th>
              <th className="px-2 py-1.5 text-left font-bold text-slate-900">Time Taken</th>
              <th className="px-2 py-1.5 text-left font-bold text-slate-900">Status</th>
              {isReadOnly && <th className="px-2 py-1.5 text-left font-bold text-slate-900">Audit Hash</th>}
            </tr>
          </thead>
          <tbody>
            {filteredIncidents.length === 0 ? (
              <tr>
                <td colSpan={isReadOnly ? 7 : 6} className="px-2 py-4 text-center text-slate-500">
                  No incidents found for the selected period
                </td>
              </tr>
            ) : (
              filteredIncidents.map((incident) => (
                <tr key={incident.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="px-2 py-1.5 font-mono font-semibold text-blue-700">{incident.id}</td>
                  <td className="px-2 py-1.5">{incident.type}</td>
                  <td className="px-2 py-1.5 text-slate-600">📍 {incident.location}</td>
                  <td className="px-2 py-1.5 text-slate-700">{incident.assignedOfficer || 'Pending'}</td>
                  <td className="px-2 py-1.5 font-semibold text-emerald-700">
                    {incident.timeTaken ? `${incident.timeTaken}m` : '-'}
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        incident.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-900'
                          : incident.status === 'DISPATCHED'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {incident.status}
                    </span>
                  </td>
                  {isReadOnly && (
                    <td className="px-2 py-1.5 font-mono text-[10px] text-slate-600">
                      {incident.auditHash ? incident.auditHash.slice(0, 12) + '...' : 'N/A'}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-slate-300 bg-white text-[10px] text-slate-600 shrink-0">
        Showing {filteredIncidents.length} of {allReportIncidents.length} total incidents
      </div>
    </div>
  );
}
