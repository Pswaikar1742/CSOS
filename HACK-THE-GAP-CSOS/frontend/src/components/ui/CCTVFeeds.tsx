'use client';

import { useState, useEffect } from 'react';
import type { CameraStream } from '@/lib/stream-registry';
import { getStreamsByDepartment, getAllActiveStreams } from '@/lib/stream-registry';

interface CCTVFeedsProps {
  department?: 'police' | 'rto' | 'sanitation' | 'god-view';
  maxFeeds?: number;
  compact?: boolean;
}

export function CCTVFeeds({ department = 'god-view', maxFeeds = 4, compact = false }: CCTVFeedsProps) {
  const [streams, setStreams] = useState<CameraStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<CameraStream | null>(null);

  useEffect(() => {
    const available = department
      ? getStreamsByDepartment(department)
      : getAllActiveStreams();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStreams(available.slice(0, maxFeeds));
    if (available.length > 0 && !selectedStream) {
      setSelectedStream(available[0]);
    }
  }, [department, maxFeeds, selectedStream]);

  if (!streams.length) {
    return (
      <div className={`${compact ? 'p-2' : 'p-4'} bg-slate-900/50 rounded border border-slate-700 text-center text-slate-400`}>
        <p className="text-sm">No CCTV feeds available for {department}</p>
      </div>
    );
  }

  return (
    <div className={`${compact ? 'space-y-2' : 'space-y-4'} w-full`}>
      {/* Primary Feed */}
      {selectedStream && (
        <div className="relative w-full bg-black rounded-lg overflow-hidden border border-slate-700">
          <div className="aspect-video bg-slate-950 relative">
            <video
              key={selectedStream.id}
              src={selectedStream.stream_url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-white font-semibold text-sm">{selectedStream.area_name}</p>
                  <p className="text-slate-300 text-xs">
                    {selectedStream.camera_id} • {selectedStream.latitude.toFixed(4)}°N, {selectedStream.longitude.toFixed(4)}°E
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedStream.threat_type && (
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      selectedStream.threat_type === 'police' ? 'bg-red-900/60 text-red-200' :
                      selectedStream.threat_type === 'rto' ? 'bg-yellow-900/60 text-yellow-200' :
                      'bg-green-900/60 text-green-200'
                    }`}>
                      {selectedStream.threat_type.toUpperCase()}
                    </span>
                  )}
                  <span className="bg-green-900/60 text-green-200 px-2 py-1 rounded text-xs font-semibold">
                    🔴 LIVE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stream Thumbnails */}
      {streams.length > 1 && (
        <div className={`grid ${compact ? 'grid-cols-4' : 'grid-cols-2 md:grid-cols-4'} gap-2`}>
          {streams.map((stream) => (
            <button
              key={stream.id}
              onClick={() => setSelectedStream(stream)}
              className={`relative aspect-video rounded overflow-hidden border-2 transition-all ${
                selectedStream?.id === stream.id
                  ? 'border-blue-500 ring-2 ring-blue-500/50'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <video
                src={stream.stream_url}
                autoPlay={selectedStream?.id === stream.id}
                loop
                muted
                playsInline
                className="w-full h-full object-cover bg-slate-950"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-1">
                <p className="text-white text-[10px] font-semibold truncate w-full">{stream.area_name}</p>
              </div>
              {stream.threat_type && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Stream List */}
      {!compact && streams.length > 1 && (
        <div className="text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300">Available Feeds ({streams.length}):</p>
          <div className="grid grid-cols-2 gap-2">
            {streams.map((stream) => (
              <div
                key={stream.id}
                className={`p-2 rounded border cursor-pointer transition-all ${
                  selectedStream?.id === stream.id
                    ? 'bg-blue-900/30 border-blue-600 text-blue-200'
                    : 'bg-slate-900/30 border-slate-700 hover:bg-slate-800/30 text-slate-300'
                }`}
                onClick={() => setSelectedStream(stream)}
              >
                <p className="font-semibold">{stream.area_name}</p>
                <p className="text-slate-400">{stream.camera_id}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CCTVFeeds;
