'use client';

import { useState } from 'react';

interface LiveCameraOverlayProps {
  cameraId: string;
  areaName: string;
  onClose: () => void;
}

const BACKEND_HTTP_BASE = (process.env.NEXT_PUBLIC_BACKEND_HTTP_BASE || 'http://localhost:8000').replace(/\/$/, '');

export default function LiveCameraOverlay({ cameraId, areaName, onClose }: LiveCameraOverlayProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className="absolute bottom-4 right-4 z-30 w-[380px] max-w-[95vw] rounded-lg border border-slate-200 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div>
          <p className="text-xs font-bold text-[#1E3A8A]">LIVE NODE FEED</p>
          <p className="text-[11px] text-slate-500">{areaName} · {cameraId}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          Close
        </button>
      </div>
      <div className="relative aspect-video w-full bg-slate-900">
        <img
          src={`${BACKEND_HTTP_BASE}/api/video_feed/${cameraId}`}
          alt={`Live stream ${cameraId}`}
          className="h-full w-full object-cover"
          onLoad={() => {
            setLoaded(true);
            setFailed(false);
          }}
          onError={() => {
            setFailed(true);
            setLoaded(false);
          }}
        />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
            <span className="text-xs font-semibold text-slate-300">{failed ? '📡 FEED UNAVAILABLE' : '📹 STREAM LOADING...'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
