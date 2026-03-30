'use client';

import { AlertTriangle, Send, XCircle, Camera } from 'lucide-react';

interface ThreatCardProps {
  incidentId: string;
  type: string;
  confidence: number;          // 0–100
  themeColor: string;          // Tailwind color name: 'red' | 'blue' | 'emerald' | 'purple'
  snapshotUrl?: string;
  timestamp?: string;
  dispatchLabel?: string;      // Role-specific dispatch button text
  onDispatch?: () => void;
  onFalseAlarm?: () => void;
}

// Map theme colors to Tailwind classes (static mapping for Tailwind JIT)
const COLOR_MAP: Record<string, {
  border: string;
  text: string;
  bg: string;
  bgHover: string;
  borderAccent: string;
  textAccent: string;
  progressBg: string;
  glow: string;
}> = {
  red: {
    border: 'border-red-500/30',
    text: 'text-red-500',
    bg: 'bg-red-500',
    bgHover: 'hover:bg-red-600',
    borderAccent: 'border-red-500',
    textAccent: 'text-red-400',
    progressBg: 'bg-red-500',
    glow: '0 0 20px rgba(239,68,68,0.3)',
  },
  blue: {
    border: 'border-blue-500/30',
    text: 'text-blue-500',
    bg: 'bg-blue-500',
    bgHover: 'hover:bg-blue-600',
    borderAccent: 'border-blue-500',
    textAccent: 'text-blue-400',
    progressBg: 'bg-blue-500',
    glow: '0 0 20px rgba(59,130,246,0.3)',
  },
  emerald: {
    border: 'border-emerald-500/30',
    text: 'text-emerald-500',
    bg: 'bg-emerald-500',
    bgHover: 'hover:bg-emerald-600',
    borderAccent: 'border-emerald-500',
    textAccent: 'text-emerald-400',
    progressBg: 'bg-emerald-500',
    glow: '0 0 20px rgba(16,185,129,0.3)',
  },
  purple: {
    border: 'border-purple-500/30',
    text: 'text-purple-500',
    bg: 'bg-purple-500',
    bgHover: 'hover:bg-purple-600',
    borderAccent: 'border-purple-500',
    textAccent: 'text-purple-400',
    progressBg: 'bg-purple-500',
    glow: '0 0 20px rgba(168,85,247,0.3)',
  },
};

export default function ThreatCard({
  incidentId,
  type,
  confidence,
  themeColor,
  snapshotUrl,
  timestamp,
  dispatchLabel = 'DISPATCH UNIT',
  onDispatch,
  onFalseAlarm,
}: ThreatCardProps) {
  const c = COLOR_MAP[themeColor] ?? COLOR_MAP.red;

  return (
    <div
      className={`
        w-80 rounded-lg overflow-hidden
        bg-black/60 backdrop-blur-md
        border ${c.border}
        transition-all duration-300 ease-in-out
        hover:scale-[1.02]
      `}
      style={{ boxShadow: c.glow }}
    >
      {/* ── Header ── */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${c.border}`}>
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${c.text}`} />
          <span className="text-xs font-mono font-bold text-slate-100 tracking-wider">
            {incidentId}
          </span>
        </div>
        {timestamp && (
          <span className="text-[10px] font-mono text-slate-500">
            {timestamp}
          </span>
        )}
      </div>

      {/* ── Incident Type ── */}
      <div className="px-4 pt-3 pb-2">
        <span className={`text-sm font-bold tracking-wide ${c.textAccent}`}>
          {type}
        </span>
      </div>

      {/* ── CCTV Snapshot Placeholder ── */}
      <div className="px-4 pb-3">
        <div
          className={`
            w-full h-36 rounded border border-slate-800
            bg-slate-900/60 flex items-center justify-center
            overflow-hidden
          `}
        >
          {snapshotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={snapshotUrl}
              alt={`CCTV snapshot for ${incidentId}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-600">
              <Camera className="w-8 h-8" />
              <span className="text-[10px] font-mono tracking-wider">
                CCTV FEED SNAPSHOT
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Confidence Score Bar ── */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono text-slate-500 tracking-wider">
            CONFIDENCE SCORE
          </span>
          <span className={`text-xs font-mono font-bold ${c.text}`}>
            {confidence}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full ${c.progressBg} rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
          />
        </div>
      </div>

      {/* ── HITL Action Buttons ── */}
      <div className={`flex gap-2 px-4 py-3 border-t ${c.border}`}>
        {/* Primary: VERIFY & DISPATCH */}
        <button
          onClick={onDispatch}
          className={`
            flex-1 flex items-center justify-center gap-2
            px-3 py-2.5 rounded text-xs font-mono font-bold tracking-wider
            ${c.bg} text-white ${c.bgHover}
            transition-all duration-200
            hover:scale-105 active:scale-95
          `}
        >
          <Send className="w-3.5 h-3.5" />
          {dispatchLabel}
        </button>

        {/* Secondary: FALSE ALARM */}
        <button
          onClick={onFalseAlarm}
          className={`
            flex-1 flex items-center justify-center gap-2
            px-3 py-2.5 rounded text-xs font-mono font-bold tracking-wider
            bg-transparent border ${c.borderAccent} ${c.text}
            hover:bg-white/5
            transition-all duration-200
            hover:scale-105 active:scale-95
          `}
        >
          <XCircle className="w-3.5 h-3.5" />
          FALSE ALARM
        </button>
      </div>
    </div>
  );
}
