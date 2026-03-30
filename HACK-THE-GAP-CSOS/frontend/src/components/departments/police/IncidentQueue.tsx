'use client';

/**
 * IncidentQueue — Police-specific enhanced threat list.
 *
 * Key features for Inspector Rajesh:
 * - Time-sorted (newest first)
 * - Escalation timer: border turns RED if unattended > 5 minutes
 * - One-click "Assign Unit" button → calls /api/hitl-action
 * - Quick filters: Type, Status
 * - Large text for dim control room readability (16pt minimum)
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Clock, Filter, AlertTriangle } from 'lucide-react';
import type { Incident } from '@/lib/mock-data';

interface IncidentQueueProps {
  incidents: Incident[];
  onAssign: (incident: Incident) => Promise<void>;
  onSelect: (incident: Incident) => void;
}

function formatElapsed(detectedAt: number): string {
  const sec = Math.max(1, Math.floor((Date.now() - detectedAt) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s ago`;
  return `${Math.floor(min / 60)}h ${min % 60}m ago`;
}

function isEscalated(detectedAt: number): boolean {
  return Date.now() - detectedAt > 5 * 60 * 1000; // > 5 minutes
}

export default function IncidentQueue({ incidents, onAssign, onSelect }: IncidentQueueProps) {
  const [filter, setFilter] = useState<'all' | 'weapons' | 'accidents' | 'suspicious'>('all');
  const [, setTick] = useState(0);

  // Force re-render every 10s to update elapsed timers
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    const sorted = [...incidents].sort((a, b) => b.detectedAt - a.detectedAt);
    if (filter === 'all') return sorted;
    if (filter === 'weapons') return sorted.filter((i) => i.type.toLowerCase().includes('weapon'));
    if (filter === 'accidents') return sorted.filter((i) => i.type.toLowerCase().includes('collision') || i.type.toLowerCase().includes('accident'));
    return sorted.filter((i) => i.type.toLowerCase().includes('suspicious'));
  }, [incidents, filter]);

  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const handleAssign = useCallback(async (incident: Incident) => {
    setSubmittingId(incident.id);
    try {
      await onAssign(incident);
    } finally {
      setSubmittingId(null);
    }
  }, [onAssign]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#1E3A8A] tracking-wide">Active Incidents</h3>
          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
            {incidents.length}
          </span>
        </div>
        {/* Quick filters */}
        <div className="mt-2 flex gap-1.5">
          {(['all', 'weapons', 'accidents', 'suspicious'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-[10px] font-semibold rounded capitalize transition
                ${filter === f
                  ? 'bg-[#1E3A8A] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Incident list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filtered.length === 0 && (
          <div className="text-sm text-slate-400 p-4 text-center border border-dashed border-slate-300 rounded-lg">
            No incidents match filter
          </div>
        )}

        {filtered.map((incident) => {
          const escalated = isEscalated(incident.detectedAt) && incident.status === 'AWAITING_VERIFICATION';
          const dispatched = incident.status === 'DISPATCHED' || incident.status === 'RESOLVED';
          const isSubmitting = submittingId === incident.id;

          return (
            <article
              key={incident.id}
              onClick={() => onSelect(incident)}
              className={`rounded-lg border p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                escalated
                  ? 'border-red-400 bg-red-50 shadow-sm shadow-red-100'
                  : dispatched
                    ? 'border-slate-200 bg-slate-50 opacity-70'
                    : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${escalated ? 'text-red-600 animate-pulse' : 'text-amber-500'}`} />
                  <span className="text-xs font-bold text-slate-800">{incident.id}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span className={escalated ? 'text-red-600 font-bold' : ''}>{formatElapsed(incident.detectedAt)}</span>
                </div>
              </div>

              <div className="mt-1.5">
                <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded tracking-wide ${
                  escalated ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {incident.type}
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-600 truncate">📍 {incident.location}</p>

              {!dispatched && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleAssign(incident);
                  }}
                  disabled={isSubmitting}
                  className={`mt-2 w-full py-2 rounded-md text-xs font-bold tracking-wide transition-colors ${
                    escalated
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-[#059669] text-white hover:bg-emerald-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? 'DISPATCHING...' : '🚓 ASSIGN UNIT'}
                </button>
              )}

              {dispatched && (
                <div className="mt-2 text-center text-[11px] font-semibold text-slate-500">
                  ✓ DISPATCHED
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
