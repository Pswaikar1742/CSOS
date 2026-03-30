'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Incident } from '@/lib/mock-data';
import { INITIAL_LAYERS, shouldAutoEnableHospitals, type MapLayer } from '@/lib/layers';

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

const DEPT_COLORS: Record<string, string> = {
  police: '#ef4444',
  rto: '#3b82f6',
  sanitation: '#10b981',
};

export default function CityMap({ incidents, markerColor, onIncidentClick, focusIncident }: CityMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const incidentMarkersRef = useRef<maplibregl.Marker[]>([]);
  const layerMarkersRef = useRef<maplibregl.Marker[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [persistedIncidents, setPersistedIncidents] = useState<Incident[]>([]);
  const [layers, setLayers] = useState<MapLayer[]>(INITIAL_LAYERS);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE_URL,
      center: CENTER,
      zoom: 13.5,
      pitch: 60,
      bearing: -20,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-left');

    map.on('load', () => {
      setMapLoaded(true);

      const style = map.getStyle();
      const layersInStyle = style?.layers;
      const hasCompositeSource = Boolean(style?.sources && 'composite' in style.sources);

      if (layersInStyle && hasCompositeSource) {
        const labelLayerId = layersInStyle.find(
          (layer) => layer.type === 'symbol' && layer.layout && 'text-field' in (layer.layout as Record<string, unknown>)
        )?.id;

        try {
          if (!map.getLayer('3d-buildings')) {
            map.addLayer(
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
          // Ignore style incompatibilities.
        }
      }
    });

    mapRef.current = map;

    return () => {
      incidentMarkersRef.current.forEach((m) => m.remove());
      layerMarkersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const allIncidents = useMemo(() => {
    const merged = [...persistedIncidents, ...incidents];
    const unique = new Map<string, Incident>();
    merged.forEach((incident) => unique.set(incident.id, incident));
    return Array.from(unique.values());
  }, [incidents, persistedIncidents]);

  useEffect(() => {
    let mounted = true;

    const loadPersistedPoints = async () => {
      try {
        const response = await fetch(`${BACKEND_HTTP_BASE}/api/map-points?limit=200`);
        if (!response.ok) return;

        const payload = await response.json();
        const points: PersistedPoint[] = Array.isArray(payload?.points) ? (payload.points as PersistedPoint[]) : [];

        const hydrated: Incident[] = points
          .filter((point) => typeof point.latitude === 'number' && typeof point.longitude === 'number')
          .map((point) => ({
            id: String(point.incident_id || `DB-${point.camera_id || Date.now()}`),
            type: String(point.threat_type || 'INCIDENT').toUpperCase(),
            dept: String(point.dept || 'police') as Incident['dept'],
            lat: Number(point.latitude),
            lng: Number(point.longitude),
            location: String(point.camera_id || point.dept || 'DB point'),
            confidence: 0.8,
            status: 'AWAITING_VERIFICATION',
            timestamp: new Date(point.timestamp || Date.now()).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
            detectedAt: new Date(point.timestamp || Date.now()).getTime(),
            dispatchPlan: 'Loaded from PostgreSQL/PostGIS incident registry.',
          }));

        if (mounted) setPersistedIncidents(hydrated);
      } catch {
        // Ignore fetch failures.
      }
    };

    void loadPersistedPoints();
    const timer = window.setInterval(() => void loadPersistedPoints(), 10000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const hasCollision = allIncidents.some((incident) => shouldAutoEnableHospitals(incident.type));
    if (!hasCollision) return;

    setLayers((prev) => prev.map((layer) => (layer.id === 'hospitals' ? { ...layer, visible: true } : layer)));
  }, [allIncidents]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    incidentMarkersRef.current.forEach((m) => m.remove());
    incidentMarkersRef.current = [];

    allIncidents.forEach((incident) => {
      const color = DEPT_COLORS[incident.dept] || markerColor;
      const el = document.createElement('div');

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

      const marker = new maplibregl.Marker({ element: el }).setLngLat([incident.lng, incident.lat]).addTo(mapRef.current!);

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 20 }).setHTML(`
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

      incidentMarkersRef.current.push(marker);
    });
  }, [allIncidents, mapLoaded, markerColor, onIncidentClick]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !focusIncident) return;

    mapRef.current.flyTo({
      center: [focusIncident.lng, focusIncident.lat],
      zoom: 15,
      speed: 0.9,
      curve: 1.2,
      essential: true,
    });
  }, [focusIncident, mapLoaded]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    layerMarkersRef.current.forEach((m) => m.remove());
    layerMarkersRef.current = [];

    layers.forEach((layer) => {
      if (!layer.visible) return;

      layer.geojson.features.forEach((feature) => {
        if (feature.geometry.type !== 'Point') return;

        const [lng, lat] = feature.geometry.coordinates;
        const props = feature.properties as Record<string, unknown>;

        const el = document.createElement('div');
        el.innerHTML = `<div style="font-size:20px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3));cursor:pointer;">${layer.icon}</div>`;

        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 20 }).setHTML(`
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;color:#0f172a;font-size:12px;max-width:220px;">
            <div style="font-weight:700;color:${layer.color};">${String(props.name || 'Location')}</div>
            <div style="margin-top:4px;color:#475569;font-size:11px;line-height:1.4;">
              ${props.ward ? `Ward: ${String(props.ward)}<br/>` : ''}
              ${props.beds ? `Beds: ${String(props.beds)}<br/>` : ''}
              ${props.personnel ? `Personnel: ${String(props.personnel)}<br/>` : ''}
              ${props.emergency ? `Emergency: ${String(props.emergency)}` : ''}
            </div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(mapRef.current!);
        el.addEventListener('mouseenter', () => marker.setPopup(popup).togglePopup());
        el.addEventListener('mouseleave', () => popup.remove());

        layerMarkersRef.current.push(marker);
      });
    });
  }, [layers, mapLoaded]);

  const toggleLayer = (layerId: string) => {
    setLayers((prev) => prev.map((layer) => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer)));
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden" />

      <div className="absolute top-3 right-3 z-10 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md">
        <div className="mb-2 text-xs font-semibold tracking-wide text-slate-700">LAYERS</div>
        <div className="space-y-2">
          {layers.map((layer) => (
            <label key={layer.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={() => toggleLayer(layer.id)}
                className="h-4 w-4 accent-slate-700"
              />
              <span className="text-[11px] text-slate-700">
                {layer.icon} {layer.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="absolute bottom-20 left-3 rounded border border-slate-200 bg-white/95 px-3 py-1.5 shadow-sm md:bottom-3">
        <span className="text-[10px] font-mono text-slate-600">
          CSN [{CENTER[1].toFixed(4)}, {CENTER[0].toFixed(4)}] | PITCH: 60° | ALT: 3D
        </span>
      </div>

      <style jsx global>{`
        @keyframes ping {
          75%,
          100% {
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
