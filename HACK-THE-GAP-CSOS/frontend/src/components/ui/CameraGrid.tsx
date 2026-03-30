'use client';

import type { Incident } from '@/lib/mock-data';

interface CameraGridProps {
  incidents: Incident[];
}

type CameraCard = {
  cameraId: string;
  wardName: string;
  status: 'LIVE' | 'ALERT' | 'OFFLINE';
  lastEvent: string;
};

const STREAM_FILES = [
  'cidco_garbage.mp4',
  'aurangpura_altercation.mp4',
  'fight weapon crime.mp4',
  'fight malicious .mp4',
  'highway_tractor_crash.mp4',
  'hardcore accident.mp4',
  'pothole.mp4',
  'Recording 2026-03-30 162739.mp4',
  'Recording 2026-03-30 163858.mp4',
  'kranti_night_crash.mp4',
];

function toStreamUrl(fileName: string): string {
  return `/streams/${encodeURIComponent(fileName)}`;
}

function getStreamForCard(card: CameraCard, index: number): string {
  const probe = `${card.lastEvent} ${card.wardName}`.toLowerCase();

  if (probe.includes('garbage') || probe.includes('waste') || probe.includes('sanitation')) {
    return toStreamUrl('cidco_garbage.mp4');
  }

  if (probe.includes('kidnap') || probe.includes('altercation')) {
    return toStreamUrl('aurangpura_altercation.mp4');
  }

  if (probe.includes('pothole') || probe.includes('railway station road')) {
    return toStreamUrl('pothole.mp4');
  }

  if (probe.includes('fight') || probe.includes('weapon')) {
    return toStreamUrl(index % 2 === 0 ? 'fight weapon crime.mp4' : 'fight malicious .mp4');
  }

  if (probe.includes('accident') || probe.includes('collision')) {
    return toStreamUrl(index % 2 === 0 ? 'highway_tractor_crash.mp4' : 'hardcore accident.mp4');
  }

  return toStreamUrl(STREAM_FILES[index % STREAM_FILES.length]);
}

const BASE_CAMERAS: CameraCard[] = [
  { cameraId: 'CSN-CAM-001', wardName: 'WARD 12 - KRANTI CHOWK', status: 'LIVE', lastEvent: 'Routine traffic surveillance' },
  { cameraId: 'CSN-CAM-014', wardName: 'WARD 22 - JALNA ROAD', status: 'LIVE', lastEvent: 'Vehicle monitoring active' },
  { cameraId: 'CSN-CAM-023', wardName: 'WARD 31 - CIDCO N-6', status: 'LIVE', lastEvent: 'Municipal watch active' },
  { cameraId: 'CSN-CAM-031', wardName: 'WARD 17 - AURANGPURA', status: 'LIVE', lastEvent: 'Crowd density tracking' },
];

function deriveCameraCards(incidents: Incident[]): CameraCard[] {
  const incidentCards = incidents.slice(0, 4).map((incident, index) => ({
    cameraId: `CSN-CAM-${String(index + 101).padStart(3, '0')}`,
    wardName: `WARD ${String(index + 1).padStart(2, '0')} - ${incident.location.toUpperCase()}`,
    status: incident.status === 'AWAITING_VERIFICATION' ? 'ALERT' as const : 'LIVE' as const,
    lastEvent: `${incident.type} (${Math.round(incident.confidence * 100)}%)`,
  }));

  return [...incidentCards, ...BASE_CAMERAS].slice(0, 4);
}

export default function CameraGrid({ incidents }: CameraGridProps) {
  const cards = deriveCameraCards(incidents);

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cards.map((card, index) => (
          <article key={`${card.cameraId}-${card.wardName}`} className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="relative aspect-video bg-slate-100 border-b border-slate-200 flex items-center justify-center">
              <video
                className="absolute inset-0 h-full w-full object-cover bg-black"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              >
                <source src={getStreamForCard(card, index)} type="video/mp4" />
                Your browser does not support this video feed.
              </video>
              <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-semibold px-2 py-1 rounded">
                CAM-ID: {card.cameraId}
              </div>
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-semibold px-2 py-1 rounded">
                WARD-NAME: {card.wardName}
              </div>
            </div>
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
              <p className="text-xs text-slate-500">Last event: {card.lastEvent}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
