'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Incident } from '@/lib/mock-data';

// ─── CSOS v2.0 City Map Component ───
// 3D MapLibre GL map centered on Chhatrapati Sambhajinagar
// Pitch: 60° | Bearing: -20° | Dark style

// CSN coordinates
const CENTER: [number, number] = [75.3433, 19.8762];
const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.stadiamaps.com/styles/alidade_smooth.json';
const BACKEND_HTTP_BASE = (process.env.NEXT_PUBLIC_BACKEND_HTTP_BASE || 'http://localhost:8000').replace(/\/$/, '');

interface CityMapProps {
  incidents: Incident[];
  markerColor: string;
  onIncidentClick?: (incident: Incident) => void;
  focusIncident?: Incident | null;
}

type PersistedPoint = {
  incident_id?: string;
  threat_type?: string;
  dept?: string;
  camera_id?: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
};

// Map dept to marker colors
const DEPT_COLORS: Record<string, string> = {
  police: '#ef4444',
  rto: '#3b82f6',
  sanitation: '#10b981',
};

export default function CityMap({ incidents, markerColor, onIncidentClick, focusIncident }: CityMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [persistedIncidents, setPersistedIncidents] = useState<Incident[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE_URL,
      center: CENTER,
      zoom: 13.5,
      pitch: 60,
      bearing: -20,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-left');

    map.current.on('load', () => {
      setMapLoaded(true);

      // Add 3D building layer for cinematic effect
      const style = map.current!.getStyle();
      const layers = style?.layers;
      const hasCompositeSource = Boolean(style?.sources && 'composite' in style.sources);
      if (layers && hasCompositeSource) {
        const labelLayerId = layers.find(
          (layer) => layer.type === 'symbol' && layer.layout && 'text-field' in (layer.layout as Record<string, unknown>)
        )?.id;

        try {
          if (!map.current!.getLayer('3d-buildings')) {
            map.current!.addLayer(
              {
                id: '3d-buildings',
                source: 'composite',
                'source-layer': 'building',
                filter: ['==', 'extrude', 'true'],
                type: 'fill-extrusion',
                minzoom: 12,
                paint: {
                  'fill-extrusion-color': '#cbd5e1',
                  'fill-extrusion-height': ['get', 'height'],
                  'fill-extrusion-base': ['get', 'min_height'],
                  'fill-extrusion-opacity': 0.55,
                },
              },
              labelLayerId
            );
          }
        } catch {
          // Ignore 3D layer injection errors for non-Mapbox style sources.
        }
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, []);

  // Update markers when incidents change
  const allIncidents = useMemo(() => {
    const merged = [...persistedIncidents, ...incidents];
    const unique = new Map<string, Incident>();
    merged.forEach((incident) => {
      unique.set(incident.id, incident);
    });
    return Array.from(unique.values());
  }, [incidents, persistedIncidents]);

  useEffect(() => {
    let isMounted = true;

    const loadPersistedPoints = async () => {
      try {
        const response = await fetch(`${BACKEND_HTTP_BASE}/api/map-points?limit=200`);
        if (!response.ok) return;
        const payload = await response.json();
        const points: PersistedPoint[] = Array.isArray(payload?.points) ? payload.points as PersistedPoint[] : [];

        const hydrated: Incident[] = points
          .filter((point: PersistedPoint) => typeof point?.latitude === 'number' && typeof point?.longitude === 'number')
          .map((point) => ({
            id: String(point.incident_id || `DB-${point.camera_id || Date.now()}`),
            type: String(point.threat_type || 'INCIDENT').toUpperCase(),
            dept: (String(point.dept || 'police') as Incident['dept']),
            lat: Number(point.latitude),
            lng: Number(point.longitude),
            location: String(point.camera_id || point.dept || 'DB point'),
            confidence: 0.8,
            status: 'AWAITING_VERIFICATION',
            timestamp: new Date(point.timestamp || Date.now()).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
            detectedAt: new Date(point.timestamp || Date.now()).getTime(),
            dispatchPlan: 'Loaded from PostgreSQL/PostGIS incident registry.',
          }));

        if (isMounted) {
          setPersistedIncidents(hydrated);
        }
      } catch {
        // Ignore fetch failures and continue with realtime/mock incidents.
      }
    };

    void loadPersistedPoints();
    const timer = window.setInterval(() => {
      void loadPersistedPoints();
    }, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    allIncidents.forEach((incident) => {
      // Create custom marker element
      const el = document.createElement('div');
      const color = DEPT_COLORS[incident.dept] || markerColor;
      el.innerHTML = `
        <div style="
          width: 14px;
          height: 14px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 1px 4px rgba(15,23,42,0.25);
          cursor: pointer;
          position: relative;
        ">
          <div style="
            position: absolute;
            top: -4px; left: -4px;
            width: 24px; height: 24px;
            border-radius: 50%;
            border: 1px solid ${color}55;
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([incident.lng, incident.lat])
        .addTo(map.current!);

      // Popup on hover
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 20,
        className: 'csos-popup',
      }).setHTML(`
        <div style="
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 12px;
          color: #0f172a;
          font-family: monospace;
          font-size: 11px;
        ">
          <div style="color: #1E3A8A; font-weight: bold; letter-spacing: 0.08em;">${incident.id}</div>
          <div style="margin-top: 4px;">${incident.type}</div>
          <div style="color: #475569; margin-top: 2px;">${incident.location}</div>
          <div style="color: ${color}; margin-top: 4px;">CONFIDENCE: ${Math.round(incident.confidence * 100)}%</div>
        </div>
      `);

      el.addEventListener('mouseenter', () => marker.setPopup(popup).togglePopup());
      el.addEventListener('mouseleave', () => popup.remove());
      el.addEventListener('click', () => onIncidentClick?.(incident));

      markersRef.current.push(marker);
    });
  }, [allIncidents, markerColor, mapLoaded, onIncidentClick]);

  useEffect(() => {
    if (!map.current || !mapLoaded || !focusIncident) return;

    map.current.flyTo({
      center: [focusIncident.lng, focusIncident.lat],
      zoom: 15,
      speed: 0.9,
      curve: 1.2,
      essential: true,
    });
  }, [focusIncident, mapLoaded]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden" />

      {/* Map overlay — coordinates display */}
      <div className="absolute bottom-20 md:bottom-3 left-3 bg-white/95 border border-slate-200 rounded px-3 py-1.5 shadow-sm">
        <span className="text-[10px] font-mono text-slate-600">
          CSN [{CENTER[1].toFixed(4)}, {CENTER[0].toFixed(4)}] | PITCH: 60° | ALT: 3D
        </span>
      </div>

      {/* Marker ping animation */}
      <style jsx global>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .maplibregl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .maplibregl-popup-tip {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
