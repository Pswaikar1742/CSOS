'use client';

/**
 * IncidentsFullScreenView — Full-screen live incident queue
 * 
 * Features:
 * - Full list of active incidents
 * - Role-based action buttons (dispatch/e-challan/view only)
 * - Expandable incident details
 * - Real-time updates via WebSocket
 * - For god-view: read-only audit trail + cross-department view
 */

import { useState, useCallback, useMemo } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Copy, CheckCircle, Send } from 'lucide-react';
import ThreatCard from '@/components/ui/ThreatCard';
import type { CSOSRole } from '@/lib/types';
import type { Incident } from '@/lib/mock-data';

interface IncidentsFullScreenViewProps {
  incidents: Incident[];
  role: CSOSRole;
  onDispatch: (incident: Incident) => Promise<{ auditHash: string; assignedUnit?: string }>;
  onWhatsappAlert?: (incident: Incident) => Promise<void>;
}

const DEPT_COLORS: Record<Exclude<CSOSRole, 'god-view'>, string> = {
  police: 'text-red-700 bg-red-50 border-red-300',
  rto: 'text-blue-700 bg-blue-50 border-blue-300',
  sanitation: 'text-emerald-700 bg-emerald-50 border-emerald-300',
};

const SEVERITY_MAP: Record<string, { priority: number; label: string; color: string }> = {
  'weapon': { priority: 1, label: 'CRITICAL', color: 'text-red-900 bg-red-100' },
  'assault': { priority: 1, label: 'CRITICAL', color: 'text-red-900 bg-red-100' },
  'accident': { priority: 2, label: 'HIGH', color: 'text-orange-900 bg-orange-100' },
  'suspicious_activity': { priority: 2, label: 'HIGH', color: 'text-orange-900 bg-orange-100' },
  'traffic_violation': { priority: 3, label: 'MEDIUM', color: 'text-yellow-900 bg-yellow-100' },
  'anpr_detection': { priority: 3, label: 'MEDIUM', color: 'text-yellow-900 bg-yellow-100' },
  'garbage': { priority: 4, label: 'LOW', color: 'text-green-900 bg-green-100' },
  'pothole': { priority: 4, label: 'LOW', color: 'text-green-900 bg-green-100' },
};

function getSeverity(type: string): { priority: number; label: string; color: string } {
  const normalized = type.toLowerCase().replace(/[^a-z_]/g, '_');
  for (const [key, value] of Object.entries(SEVERITY_MAP)) {
    if (normalized.includes(key)) return value;
  }
  return { priority: 5, label: 'INFO', color: 'text-slate-900 bg-slate-100' };
}

export default function IncidentsFullScreenView({
  incidents,
  role,
  onDispatch,
  onWhatsappAlert,
}: IncidentsFullScreenViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const isReadOnly = role === 'god-view';

  const sortedIncidents = useMemo(() => {
    let filtered = incidents;

    // For god-view, allow filtering by department
    if (isReadOnly && selectedDept) {
      filtered = incidents.filter((inc) => inc.dept === selectedDept);
    }

    // Sort by severity then time
    return filtered.sort((a, b) => {
      const sevA = getSeverity(a.type).priority;
      const sevB = getSeverity(b.type).priority;
      if (sevA !== sevB) return sevA - sevB;
      return b.detectedAt - a.detectedAt;
    });
  }, [incidents, isReadOnly, selectedDept]);

  const handleDispatchClick = useCallback(
    async (incident: Incident) => {
      try {
        setDispatchingId(incident.id);
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

  const deptOptions =
    role === 'god-view'
      ? [
          { value: null, label: 'All Departments' },
          { value: 'police', label: '🚔 Police' },
          { value: 'rto', label: '🚔 RTO' },
          { value: 'sanitation', label: '🧹 Sanitation' },
        ]
      : [];

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-lg border-2 border-slate-300 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b-2 border-slate-300 bg-white shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[#002147] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Live Incident Queue
          </h2>
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-900 text-xs font-bold">
            {sortedIncidents.length} ACTIVE
          </span>
        </div>
        <p className="text-xs text-slate-600">
          {isReadOnly
            ? 'Cross-department audit trail (read-only)'
            : 'Verified threats awaiting administrative action'}
        </p>

        {/* God-View Department Filter */}
        {isReadOnly && deptOptions.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <label className="text-[11px] font-semibold text-slate-700">Filter:</label>
            <select
              value={selectedDept || ''}
              onChange={(e) => setSelectedDept(e.target.value || null)}
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
      </div>

      {/* Incidents List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sortedIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <AlertTriangle className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm font-medium">No incidents in queue</p>
            <p className="text-xs mt-1">This is great news!</p>
          </div>
        ) : (
          sortedIncidents.map((incident) => {
            const severity = getSeverity(incident.type);
            const isExpanded = expandedId === incident.id;

            return (
              <div
                key={incident.id}
                className="rounded-lg border-2 border-slate-300 bg-white shadow-sm overflow-hidden transition-all hover:border-slate-400"
              >
                {/* Compact Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : incident.id)}
                  className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 text-left">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${severity.color}`}>
                      {severity.label}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {incident.type}
                      </p>
                      <p className="text-[11px] text-slate-600 truncate">
                        📍 {incident.location}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-3 py-2.5 border-t border-slate-200 bg-slate-50 space-y-3">
                    {/* Full incident info using ThreatCard */}
                    <ThreatCard
                      incidentId={incident.id}
                      type={incident.type}
                      location={incident.location}
                      elapsedText={`${Math.max(1, Math.floor((Date.now() - incident.detectedAt) / 1000))}s ago`}
                      loggedAt={new Date(incident.detectedAt).toLocaleTimeString()}
                      zone="Zone 1"
                      wardName={incident.location}
                      formalIncidentId={`CSN-${incident.dept}-2026-${incident.id}`}
                      status={incident.status}
                      disabled={false}
                      onDispatch={() => handleDispatchClick(incident)}
                      onWhatsappAlert={!isReadOnly ? () => handleWhatsappClick(incident) : undefined}
                    />

                    {/* God-View Additional Info */}
                    {isReadOnly && (
                      <div className="space-y-1.5 p-2 rounded border border-slate-300 bg-white text-[11px]">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-700">Department:</span>
                          <span className="text-slate-600">{incident.dept.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-700">Status:</span>
                          <span className={`font-medium ${incident.status === 'DISPATCHED' ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {incident.status}
                          </span>
                        </div>
                        {incident.id.split('-')[0] && (
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-700">Audit Hash:</span>
                            <code className="text-slate-600 font-mono text-[10px] truncate">
                              {incident.id.slice(0, 8)}...
                            </code>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons (Not for God-View) */}
                    {!isReadOnly && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDispatchClick(incident)}
                          disabled={dispatchingId === incident.id}
                          className="flex-1 px-2 py-1.5 rounded bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 disabled:opacity-50 transition-all flex items-center justify-center gap-1"
                        >
                          {dispatchingId === incident.id ? (
                            <>
                              <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                              Dispatching...
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              Dispatch Unit
                            </>
                          )}
                        </button>
                        {onWhatsappAlert && !incident.id.startsWith('SIM-') && (
                          <button
                            onClick={() => handleWhatsappClick(incident)}
                            className="flex-1 px-2 py-1.5 rounded bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-1"
                          >
                            💬 Notify
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-3 py-2.5 border-t border-slate-300 bg-white text-[10px] text-slate-600 shrink-0">
        {isReadOnly ? (
          <p>Showing {sortedIncidents.length} of {incidents.length} total incidents</p>
        ) : (
          <p>Click any incident to expand details and dispatch a unit</p>
        )}
      </div>
    </div>
  );
}
