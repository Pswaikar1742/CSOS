'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Incident } from '@/lib/mock-data';

interface CameraGridProps {
  incidents: Incident[];
  onSelectCamera?: (cameraId: string, areaName: string) => void;
}

type CameraCard = {
  cameraId: string;
  backendId: string;
  wardName: string;
  status: 'LIVE' | 'ALERT';
  lastEvent: string;
};

type CameraNode = {
  node_id: string;
  camera_id: string;
  area_name: string;
  latitude: number;
  longitude: number;
};

const BACKEND_HTTP_BASE = (process.env.NEXT_PUBLIC_BACKEND_HTTP_BASE || 'http://localhost:8000').replace(/\/$/, '');

function deriveCameraCards(incidents: Incident[], nodes: CameraNode[]): CameraCard[] {
  return nodes.slice(0, 12).map((node) => {
    const relatedIncident = incidents.find((incident) => {
      const incidentLocation = incident.location.toLowerCase();
      const nodeLocation = node.area_name.toLowerCase();
      return incidentLocation.includes(nodeLocation) || nodeLocation.includes(incidentLocation);
    });

    return {
      cameraId: node.node_id,
      backendId: node.camera_id,
      wardName: node.area_name,
      status: relatedIncident && relatedIncident.status === 'AWAITING_VERIFICATION' ? 'ALERT' : 'LIVE',
      lastEvent: relatedIncident
        ? `${relatedIncident.type} (${Math.round(relatedIncident.confidence * 100)}%)`
        : 'No active threat on this node',
    };
  });
}

export default function CameraGrid({ incidents, onSelectCamera }: CameraGridProps) {
  const [nodes, setNodes] = useState<CameraNode[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<CameraCard | null>(null);
  const [loadedStreams, setLoadedStreams] = useState<Record<string, boolean>>({});
  const [failedStreams, setFailedStreams] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;

    const loadNodes = async () => {
      try {
        const response = await fetch(`${BACKEND_HTTP_BASE}/api/camera-nodes`);
        if (!response.ok) return;
        const payload = await response.json();
        const fetchedNodes: CameraNode[] = Array.isArray(payload?.nodes) ? (payload.nodes as CameraNode[]) : [];
        if (mounted) {
          setNodes(fetchedNodes);
        }
      } catch {
        // noop
      }
    };

    void loadNodes();

    return () => {
      mounted = false;
    };
  }, []);

  const cards = useMemo(() => deriveCameraCards(incidents, nodes), [incidents, nodes]);
  const activeCamera = selectedCamera || cards[0] || null;

  return (
    <div className="h-full overflow-y-auto p-4">
      {activeCamera && (
        <div className="mb-3 rounded-lg border border-slate-200 bg-white p-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#1E3A8A]">LIVE FEED — {activeCamera.cameraId}</p>
              <p className="text-[11px] text-slate-500">{activeCamera.wardName}</p>
            </div>
            <span className="text-[10px] font-semibold text-slate-500">{activeCamera.backendId}</span>
          </div>
          <div className="relative aspect-video w-full overflow-hidden rounded border border-slate-200 bg-slate-900">
            <img
              src={`${BACKEND_HTTP_BASE}/api/video_feed/${activeCamera.backendId}`}
              alt={`Live stream: ${activeCamera.wardName}`}
              className="h-full w-full object-cover"
              onLoad={() => {
                setLoadedStreams((prev) => ({ ...prev, [activeCamera.backendId]: true }));
                setFailedStreams((prev) => ({ ...prev, [activeCamera.backendId]: false }));
              }}
              onError={() => {
                setFailedStreams((prev) => ({ ...prev, [activeCamera.backendId]: true }));
                setLoadedStreams((prev) => ({ ...prev, [activeCamera.backendId]: false }));
              }}
            />
            {!loadedStreams[activeCamera.backendId] && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                <div className="text-center">
                  <div className="mb-2 text-sm font-semibold text-slate-300">
                    {failedStreams[activeCamera.backendId] ? '📡 FEED UNAVAILABLE' : '📹 STREAM LOADING...'}
                  </div>
                  <div className="text-xs text-slate-500">{activeCamera.backendId}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const streamUrl = `${BACKEND_HTTP_BASE}/api/video_feed/${card.backendId}`;
          return (
            <article
              key={`${card.cameraId}-${card.backendId}`}
              onClick={() => {
                setSelectedCamera(card);
                onSelectCamera?.(card.backendId, card.wardName);
              }}
              className="cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <div className="relative aspect-video overflow-hidden border-b border-slate-200 bg-slate-900">
                <img
                  src={streamUrl}
                  alt={`Live stream: ${card.wardName}`}
                  className="absolute inset-0 h-full w-full object-cover bg-black"
                  onLoad={() => {
                    setLoadedStreams((prev) => ({ ...prev, [card.backendId]: true }));
                    setFailedStreams((prev) => ({ ...prev, [card.backendId]: false }));
                  }}
                  onError={() => {
                    setFailedStreams((prev) => ({ ...prev, [card.backendId]: true }));
                    setLoadedStreams((prev) => ({ ...prev, [card.backendId]: false }));
                  }}
                />
                {!loadedStreams[card.backendId] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                    <div className="text-center">
                      <div className="mb-2 text-sm font-semibold text-slate-300">
                        {failedStreams[card.backendId] ? '📡 FEED UNAVAILABLE' : '📹 STREAM LOADING...'}
                      </div>
                      <div className="text-xs text-slate-500">{card.backendId}</div>
                    </div>
                  </div>
                )}

                <div className="absolute left-2 top-2 z-10 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
                  NODE: {card.cameraId}
                </div>
                <div className="absolute bottom-2 left-2 z-10 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
                  {card.wardName}
                </div>
                <div
                  className={`absolute right-2 top-2 z-10 rounded px-2 py-1 text-[10px] font-semibold ${
                    card.status === 'ALERT' ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'
                  }`}
                >
                  {card.status}
                </div>
              </div>

              <div className="space-y-1.5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1E3A8A]">{card.cameraId}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                      card.status === 'ALERT' ? 'bg-red-100 text-[#B91C1C]' : 'bg-emerald-100 text-[#059669]'
                    }`}
                  >
                    {card.status}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-600">{card.wardName}</p>
                <p className="text-xs text-slate-500">Last event: {card.lastEvent}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
