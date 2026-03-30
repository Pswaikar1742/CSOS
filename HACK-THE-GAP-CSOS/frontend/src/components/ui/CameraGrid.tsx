'use client';

import type { Incident } from '@/lib/mock-data';

interface CameraGridProps {
  incidents: Incident[];
}

type CameraCard = {
  cameraId: string;
  backendId: string;
  wardName: string;
  status: 'LIVE' | 'ALERT' | 'OFFLINE';
  lastEvent: string;
};

// Map to actual backend camera IDs from multi_stream_detector.py
const BACKEND_CAMERA_IDS = [
  'CAM_CIDCO_N6',
  'CAM_KRANTI_CHOWK',
  'CAM_AURANGPURA',
  'CAM_BEED_BYPASS',
  'CAM_RAILWAY_STATION_ROAD',
];

const BACKEND_HTTP_BASE = (process.env.NEXT_PUBLIC_BACKEND_HTTP_BASE || 'http://localhost:8000').replace(/\/$/, '');

const BASE_CAMERAS: CameraCard[] = [
  {
    cameraId: 'CSN-CAM-001',
    backendId: 'CAM_KRANTI_CHOWK',
    wardName: 'WARD 12 - KRANTI CHOWK',
    status: 'LIVE',
    lastEvent: 'Routine traffic surveillance',
  },
  {
    cameraId: 'CSN-CAM-014',
    backendId: 'CAM_BEED_BYPASS',
    wardName: 'WARD 22 - BEED BYPASS',
    status: 'LIVE',
    lastEvent: 'Vehicle monitoring active',
  },
  {
    cameraId: 'CSN-CAM-023',
    backendId: 'CAM_CIDCO_N6',
    wardName: 'WARD 31 - CIDCO N-6',
    status: 'LIVE',
    lastEvent: 'Municipal watch active',
  },
  {
    cameraId: 'CSN-CAM-031',
    backendId: 'CAM_AURANGPURA',
    wardName: 'WARD 17 - AURANGPURA',
    status: 'LIVE',
    lastEvent: 'Crowd density tracking',
  },
];

function deriveCameraCards(incidents: Incident[]): CameraCard[] {
  const incidentCards = incidents.slice(0, 4).map((incident, index) => ({
    cameraId: `CSN-CAM-${String(index + 101).padStart(3, '0')}`,
    backendId: BACKEND_CAMERA_IDS[index % BACKEND_CAMERA_IDS.length],
    wardName: `WARD ${String(index + 1).padStart(2, '0')} - ${incident.location.toUpperCase()}`,
    status: incident.status === 'AWAITING_VERIFICATION' ? ('ALERT' as const) : ('LIVE' as const),
    lastEvent: `${incident.type} (${Math.round(incident.confidence * 100)}%)`,
  }));

  return [...incidentCards, ...BASE_CAMERAS].slice(0, 4);
}

export default function CameraGrid({ incidents }: CameraGridProps) {
  const cards = deriveCameraCards(incidents);

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cards.map((card) => {
          const streamUrl = `${BACKEND_HTTP_BASE}/api/video_feed/${card.backendId}`;
          return (
            <article
              key={`${card.cameraId}-${card.backendId}`}
              className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="relative aspect-video bg-slate-900 border-b border-slate-200 flex items-center justify-center overflow-hidden">
                {/* MJPEG Stream Container */}
                <img
                  src={streamUrl}
                  alt={`Live stream: ${card.wardName}`}
                  className="absolute inset-0 w-full h-full object-cover bg-black"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                  }}
                />

                {/* Fallback text if stream unavailable */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                  <div className="text-center">
                    <div className="text-sm font-semibold text-slate-400 mb-2">📹 STREAM LOADING...</div>
                    <div className="text-xs text-slate-500">{card.backendId}</div>
                  </div>
                </div>

                {/* Camera ID Badge */}
                <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-semibold px-2 py-1 rounded z-10">
                  CAM-ID: {card.cameraId}
                </div>

                {/* Ward Name Badge */}
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-semibold px-2 py-1 rounded z-10">
                  {card.wardName}
                </div>

                {/* Status Indicator */}
                <div
                  className={`absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold ${
                    card.status === 'ALERT'
                      ? 'bg-red-500/90 text-white animate-pulse'
                      : card.status === 'OFFLINE'
                        ? 'bg-slate-500/90 text-white'
                        : 'bg-emerald-500/90 text-white'
                  }`}
                >
                  <span className="w-2 h-2 bg-white rounded-full" aria-hidden="true" />
                  {card.status}
                </div>
              </div>

              {/* Camera Metadata */}
              <div className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1E3A8A]">{card.cameraId}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      card.status === 'ALERT'
                        ? 'bg-red-100 text-[#B91C1C]'
                        : card.status === 'OFFLINE'
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-emerald-100 text-[#059669]'
                    }`}
                  >
                    {card.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">{card.wardName}</p>
                <p className="text-xs text-slate-500">Last event: {card.lastEvent}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
