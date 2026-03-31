'use client';

/**
 * MapFullScreenView — Full-screen interactive 3D city map
 * 
 * Features:
 * - Map/CCTV toggle mode
 * - Layer controls (Police Stations, Hospitals)
 * - Incident marker click to show details
 * - Role-based marker colors
 */

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, Grid3x3 } from 'lucide-react';
import CameraGrid from '@/components/ui/CameraGrid';
import type { CSOSRole } from '@/lib/types';
import type { Incident } from '@/lib/mock-data';

const CityMap = dynamic(() => import('@/components/ui/CityMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
      <div className="text-xs font-mono text-slate-500 animate-pulse tracking-wider">
        INITIALIZING MAP ENGINE...
      </div>
    </div>
  ),
});

interface MapFullScreenViewProps {
  incidents: Incident[];
  role: CSOSRole;
}

const ROLE_MARKER_COLORS: Record<CSOSRole, string> = {
  police: '#ef4444',
  rto: '#3b82f6',
  sanitation: '#10b981',
  'god-view': '#f59e0b',
};

export default function MapFullScreenView({ incidents, role }: MapFullScreenViewProps) {
  const [viewMode, setViewMode] = useState<'map' | 'cctv'>('map');
  const [focusedIncident, setFocusedIncident] = useState<Incident | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const markerColor = ROLE_MARKER_COLORS[role];

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative bg-slate-50 rounded-lg border-2 border-slate-300 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="absolute top-3 left-3 z-20 px-3 py-2 rounded-lg bg-white border-2 border-slate-300 shadow-sm">
        <h2 className="text-xs font-semibold tracking-wide uppercase text-[#002147]">
          CSOS Live Map — Full Screen
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
          title="Map View (Alt+M)"
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
          title="CCTV Grid View"
        >
          <Grid3x3 className="h-3.5 w-3.5" />
          CCTV Grid
        </button>
      </div>

      {/* Incident Count Badge */}
      {incidents.length > 0 && (
        <div className="absolute bottom-6 left-4 z-20 px-3 py-1.5 rounded-lg bg-red-100 border-2 border-red-300 shadow-sm">
          <span className="text-sm font-semibold text-red-900">
            🔴 {incidents.length} Active Threat{incidents.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Keyboard Shortcut Hint */}
      <div className="absolute bottom-4 right-4 z-10 text-[10px] text-slate-500 pointer-events-none">
        <p>Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[9px] font-mono">Alt+M</kbd> to go back to Dashboard</p>
      </div>

      {/* Map or CCTV Content */}
      <div className="w-full h-full">
        {viewMode === 'map' ? (
          <CityMap
            incidents={incidents}
            markerColor={markerColor}
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

      {/* Focused Incident Detail (bottom-center popup) */}
      {focusedIncident && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 max-w-sm bg-white border-2 border-slate-300 rounded-lg shadow-lg p-3">
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                {focusedIncident.type}
              </h3>
              <button
                onClick={() => setFocusedIncident(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold leading-none"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">📍 {focusedIncident.location}</p>
            <p className="text-xs text-slate-500">
              Detected: {new Date(focusedIncident.detectedAt).toLocaleTimeString()}
            </p>
            <p className="text-xs font-mono text-slate-700 bg-slate-50 p-1.5 rounded">
              ID: {focusedIncident.id}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
