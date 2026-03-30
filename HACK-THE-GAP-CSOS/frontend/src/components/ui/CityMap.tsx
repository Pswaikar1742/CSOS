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
  deptScope?: Incident['dept'] | 'god-view';
  incidentSource?: 'merged' | 'input-only';
  onIncidentClick?: (incident: Incident) => void;
  focusIncident?: Incident | null;
  onCameraNodeClick?: (cameraId: string, areaName: string) => void;
}

type PersistedPoint = {
  incident_id?: string;
  threat_type?: string;
  dept?: string;
  camera_id?: string;
  area_name?: string;
  node_id?: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
};

type CameraNode = {
  node_id: string;
  camera_id: string;
  area_name: string;
  latitude: number;
  longitude: number;
};

const CCTV_GRID_NODES: CameraNode[] = [
  { node_id: 'CSN-001', camera_id: 'CAM_CSN_001', area_name: 'Kranti Chowk', latitude: 19.8725, longitude: 75.3255 },
  { node_id: 'CSN-002', camera_id: 'CAM_CSN_002', area_name: 'CIDCO (Connaught Place)', latitude: 19.8829, longitude: 75.3618 },
  { node_id: 'CSN-003', camera_id: 'CAM_CSN_003', area_name: 'Mukundwadi Circle', latitude: 19.865, longitude: 75.381 },
  { node_id: 'CSN-004', camera_id: 'CAM_CSN_004', area_name: 'Nirala Bazar', latitude: 19.8786, longitude: 75.3258 },
  { node_id: 'CSN-005', camera_id: 'CAM_CSN_005', area_name: 'TV Center / Jalgaon Road', latitude: 19.895, longitude: 75.334 },
  { node_id: 'CSN-006', camera_id: 'CAM_CSN_006', area_name: 'Central Bus Stand (CBS)', latitude: 19.876, longitude: 75.32 },
  { node_id: 'CSN-007', camera_id: 'CAM_CSN_007', area_name: 'Railway Station Area', latitude: 19.86, longitude: 75.31 },
  { node_id: 'CSN-008', camera_id: 'CAM_CSN_008', area_name: 'Beed Bypass Road (Devlai Sq)', latitude: 19.845, longitude: 75.34 },
  { node_id: 'CSN-009', camera_id: 'CAM_CSN_009', area_name: 'Osmanpura', latitude: 19.868, longitude: 75.322 },
  { node_id: 'CSN-010', camera_id: 'CAM_CSN_010', area_name: 'Gulmandi Market', latitude: 19.88, longitude: 75.33 },
  { node_id: 'CSN-011', camera_id: 'CAM_CSN_011', area_name: 'Shahganj Clock Tower', latitude: 19.885, longitude: 75.34 },
  { node_id: 'CSN-012', camera_id: 'CAM_CSN_012', area_name: 'Roshan Gate', latitude: 19.882, longitude: 75.35 },
  { node_id: 'CSN-013', camera_id: 'CAM_CSN_013', area_name: 'Bhadkal Gate', latitude: 19.89, longitude: 75.32 },
  { node_id: 'CSN-014', camera_id: 'CAM_CSN_014', area_name: 'Mill Corner', latitude: 19.895, longitude: 75.315 },
  { node_id: 'CSN-015', camera_id: 'CAM_CSN_015', area_name: 'Waluj MIDC (Oasis Chowk)', latitude: 19.84, longitude: 75.25 },
  { node_id: 'CSN-016', camera_id: 'CAM_CSN_016', area_name: 'Chikalthana MIDC', latitude: 19.87, longitude: 75.4 },
  { node_id: 'CSN-017', camera_id: 'CAM_CSN_017', area_name: 'Harsul T-Point', latitude: 19.92, longitude: 75.345 },
  { node_id: 'CSN-018', camera_id: 'CAM_CSN_018', area_name: 'Pundalik Nagar', latitude: 19.865, longitude: 75.355 },
  { node_id: 'CSN-019', camera_id: 'CAM_CSN_019', area_name: 'Gajanan Maharaj Mandir Chowk', latitude: 19.86, longitude: 75.35 },
  { node_id: 'CSN-020', camera_id: 'CAM_CSN_020', area_name: 'Akashwani Chowk', latitude: 19.87, longitude: 75.34 },
  { node_id: 'CSN-021', camera_id: 'CAM_CSN_021', area_name: 'Mahavir Chowk (Baba Petrol Pump)', latitude: 19.875, longitude: 75.315 },
  { node_id: 'CSN-022', camera_id: 'CAM_CSN_022', area_name: 'Seven Hills Flyover', latitude: 19.872, longitude: 75.35 },
  { node_id: 'CSN-023', camera_id: 'CAM_CSN_023', area_name: 'Garkheda Parisar', latitude: 19.86, longitude: 75.345 },
  { node_id: 'CSN-024', camera_id: 'CAM_CSN_024', area_name: 'Sutgirni Chowk', latitude: 19.855, longitude: 75.34 },
  { node_id: 'CSN-025', camera_id: 'CAM_CSN_025', area_name: 'Prozone Mall Intersection', latitude: 19.885, longitude: 75.365 },
  { node_id: 'CSN-026', camera_id: 'CAM_CSN_026', area_name: 'Cannaught Garden', latitude: 19.882, longitude: 75.362 },
  { node_id: 'CSN-027', camera_id: 'CAM_CSN_027', area_name: 'Delhi Gate', latitude: 19.895, longitude: 75.325 },
  { node_id: 'CSN-028', camera_id: 'CAM_CSN_028', area_name: 'Makai Gate', latitude: 19.905, longitude: 75.31 },
  { node_id: 'CSN-029', camera_id: 'CAM_CSN_029', area_name: 'Cantonment Area (Chhawani)', latitude: 19.89, longitude: 75.3 },
  { node_id: 'CSN-030', camera_id: 'CAM_CSN_030', area_name: 'Padegaon', latitude: 19.895, longitude: 75.28 },
];

// Map dept to marker colors
const DEPT_COLORS: Record<string, string> = {
  police: '#ef4444',
  rto: '#3b82f6',
  sanitation: '#10b981',
};

const FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-base',
      type: 'raster',
      source: 'osm',
    },
  ],
};

export default function CityMap({
  incidents,
  markerColor,
  deptScope = 'god-view',
  incidentSource = 'merged',
  onIncidentClick,
  focusIncident,
  onCameraNodeClick,
}: CityMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const incidentClickRef = useRef<typeof onIncidentClick>(null);
  const cameraNodeClickRef = useRef<typeof onCameraNodeClick>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [persistedIncidents, setPersistedIncidents] = useState<Incident[]>([]);
  const [cameraNodes, setCameraNodes] = useState<CameraNode[]>([]);
  const [transientIncidents, setTransientIncidents] = useState<Incident[]>([]);
  const [mapView, setMapView] = useState<'active' | 'cctv'>('active');

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

    const handleMapError = () => {
      if (!map.current) return;
      const currentStyle = map.current.getStyle();
      const hasLayers = Array.isArray(currentStyle?.layers) && currentStyle.layers.length > 0;
      if (!hasLayers) {
        map.current.setStyle(FALLBACK_STYLE);
      }
    };

    map.current.on('error', handleMapError);

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
      map.current?.off('error', handleMapError);
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, []);

  // Update markers when incidents change
  const allIncidents = useMemo(() => {
    const merged = incidentSource === 'input-only'
      ? [...incidents, ...transientIncidents]
      : [...persistedIncidents, ...incidents, ...transientIncidents];
    const unique = new Map<string, Incident>();
    merged.forEach((incident) => {
      if (deptScope !== 'god-view' && incident.dept !== deptScope) return;
      unique.set(incident.id, incident);
    });
    return Array.from(unique.values());
  }, [incidents, persistedIncidents, transientIncidents, deptScope, incidentSource]);

  useEffect(() => {
    const onTransientMarker = (event: Event) => {
      const customEvent = event as CustomEvent<{ lat?: number; lng?: number; dept?: Incident['dept'] }>;
      const lat = Number(customEvent.detail?.lat);
      const lng = Number(customEvent.detail?.lng);
      const dept = customEvent.detail?.dept || 'police';
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (deptScope !== 'god-view' && dept !== deptScope) return;

      const markerIncident: Incident = {
        id: `RT-${Date.now()}`,
        type: 'REALTIME THREAT',
        dept,
        lat,
        lng,
        location: 'Realtime ingress',
        confidence: 0.7,
        status: 'AWAITING_VERIFICATION',
        timestamp: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
        detectedAt: Date.now(),
        dispatchPlan: 'Realtime marker synchronized from socket event.',
      };

      setTransientIncidents((prev) => [...prev.slice(-24), markerIncident]);
      window.setTimeout(() => {
        setTransientIncidents((prev) => prev.filter((item) => item.id !== markerIncident.id));
      }, 20000);
    };

    window.addEventListener('csos:add-marker', onTransientMarker as EventListener);
    return () => window.removeEventListener('csos:add-marker', onTransientMarker as EventListener);
  }, [deptScope]);

  useEffect(() => {
    if (incidentSource === 'input-only') {
      setPersistedIncidents([]);
      return;
    }

    let isMounted = true;

    const loadPersistedPoints = async () => {
      try {
        const response = await fetch(`${BACKEND_HTTP_BASE}/api/map-points?limit=200`);
        if (!response.ok) return;
        const payload = await response.json();
        const points: PersistedPoint[] = Array.isArray(payload?.points) ? payload.points as PersistedPoint[] : [];

        const hydrated: Incident[] = points
          .filter((point: PersistedPoint) => typeof point?.latitude === 'number' && typeof point?.longitude === 'number')
          .filter((point: PersistedPoint) => {
            if (deptScope === 'god-view') return true;
            return String(point.dept || '').toLowerCase() === deptScope;
          })
          .map((point) => ({
            id: String(point.incident_id || `DB-${point.camera_id || Date.now()}`),
            type: String(point.threat_type || 'INCIDENT').toUpperCase(),
            dept: (String(point.dept || 'police') as Incident['dept']),
            lat: Number(point.latitude),
            lng: Number(point.longitude),
            location: String(point.area_name || point.node_id || point.camera_id || point.dept || 'DB point'),
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

    const loadCameraNodes = async () => {
      try {
        const response = await fetch(`${BACKEND_HTTP_BASE}/api/camera-nodes`);
        if (!response.ok) return;
        const payload = await response.json();
        const nodes: CameraNode[] = Array.isArray(payload?.nodes) ? payload.nodes as CameraNode[] : [];
        if (isMounted) {
          setCameraNodes(nodes.filter((node) => typeof node.latitude === 'number' && typeof node.longitude === 'number'));
        }
      } catch {
        // Ignore; map still renders incidents.
      }
    };

    void loadPersistedPoints();
    void loadCameraNodes();
    const timer = window.setInterval(() => {
      void loadPersistedPoints();
    }, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [deptScope, incidentSource]);

  useEffect(() => {
    incidentClickRef.current = onIncidentClick;
  }, [onIncidentClick]);

  useEffect(() => {
    cameraNodeClickRef.current = onCameraNodeClick;
  }, [onCameraNodeClick]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const incidentsToRender = mapView === 'active' ? allIncidents : [];

    incidentsToRender.forEach((incident) => {
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
      el.addEventListener('click', () => incidentClickRef.current?.(incident));

      markersRef.current.push(marker);
    });

    if (mapView === 'cctv') {
      const nodesToRender = CCTV_GRID_NODES.length ? CCTV_GRID_NODES : cameraNodes;
      nodesToRender.forEach((node) => {
      const nodeEl = document.createElement('button');
      nodeEl.type = 'button';
      nodeEl.setAttribute('aria-label', `${node.area_name} camera node`);
      nodeEl.style.width = '8px';
      nodeEl.style.height = '8px';
      nodeEl.style.borderRadius = '999px';
      nodeEl.style.border = '1px solid #64748b';
      nodeEl.style.background = '#94a3b8';
      nodeEl.style.boxShadow = '0 0 0 2px rgba(148,163,184,0.18)';
      nodeEl.style.cursor = 'pointer';

      const nodeMarker = new maplibregl.Marker({ element: nodeEl })
        .setLngLat([node.longitude, node.latitude])
        .addTo(map.current!);

      const nodePopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        className: 'csos-popup',
      }).setHTML(`
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;color:#0f172a;font-family:monospace;font-size:11px;min-width:170px;">
          <div style="font-weight:700;color:#334155;">Status: ONLINE</div>
          <div style="margin-top:3px;color:#475569;">Node: ${node.node_id}</div>
        </div>
      `);

      nodeEl.addEventListener('mouseenter', () => nodeMarker.setPopup(nodePopup).togglePopup());
      nodeEl.addEventListener('mouseleave', () => nodePopup.remove());
      nodeEl.addEventListener('click', () => cameraNodeClickRef.current?.(node.camera_id, node.area_name));

      markersRef.current.push(nodeMarker);
      });
    }
  }, [allIncidents, markerColor, mapLoaded, cameraNodes, mapView]);

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
      <div className="absolute top-3 left-1/2 z-30 -translate-x-1/2 rounded-md border border-slate-200 bg-white/95 p-1 shadow-sm">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMapView('active')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded ${mapView === 'active' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            🚨 ACTIVE THREATS
          </button>
          <button
            onClick={() => setMapView('cctv')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded ${mapView === 'cctv' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            📹 CCTV GRID
          </button>
        </div>
      </div>

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
