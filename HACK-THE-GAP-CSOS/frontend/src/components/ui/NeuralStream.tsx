'use client';

import { useEffect, useRef } from 'react';
import { Terminal, Cpu, Activity } from 'lucide-react';

// ─── CSOS v2.0 Neural Stream Terminal ───
// A right-sidebar terminal that displays live AI detection math.
// Auto-scrolls to bottom. Monospace green text. Watch Dogs aesthetic.

interface NeuralStreamProps {
  logs: string[];
  accentColor?: string; // Tailwind text class override, default: text-emerald-400
}

function getLogColor(log: string): string {
  if (log.startsWith('[SYS]')) return 'text-cyan-400';
  if (log.startsWith('[DETECT]')) return 'text-amber-400';
  if (log.startsWith('[MATH]')) return 'text-emerald-400';
  return 'text-slate-500';
}

function getLogPrefix(log: string): string {
  const match = log.match(/^\[([A-Z]+)\]/);
  return match ? match[1] : 'LOG';
}

function getLogBody(log: string): string {
  return log.replace(/^\[[A-Z]+\]\s*/, '');
}

export default function NeuralStream({ logs }: NeuralStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLogsLenRef = useRef(0);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (logs.length > prevLogsLenRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLogsLenRef.current = logs.length;
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-black/60 backdrop-blur-md border-l border-slate-800">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-mono font-bold text-emerald-400 tracking-[0.2em]">
            NEURAL STREAM
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-slate-600" />
            <span className="text-[9px] font-mono text-slate-600">GPU: ACTIVE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
            <span className="text-[9px] font-mono text-emerald-500">{logs.length} EVENTS</span>
          </div>
        </div>
      </div>

      {/* ── Log Area ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-0.5 scrollbar-thin"
        style={{ scrollBehavior: 'smooth' }}
      >
        {logs.map((log, i) => (
          <div
            key={i}
            className="flex items-start gap-2 py-0.5 group hover:bg-slate-900/50 rounded px-1 transition-colors"
          >
            {/* Timestamp */}
            <span className="text-[9px] font-mono text-slate-700 shrink-0 mt-0.5 tabular-nums">
              {String(Math.floor(i / 60)).padStart(2, '0')}:{String(i % 60).padStart(2, '0')}
            </span>

            {/* Prefix badge */}
            <span className={`text-[9px] font-mono font-bold shrink-0 mt-0.5 ${getLogColor(log)}`}>
              [{getLogPrefix(log)}]
            </span>

            {/* Log body */}
            <span className="text-[11px] font-mono text-slate-400 leading-snug break-all">
              {getLogBody(log)}
            </span>
          </div>
        ))}

        {/* Cursor blink */}
        <div className="flex items-center gap-1 pt-1">
          <span className="text-[9px] font-mono text-slate-700">
            {String(Math.floor(logs.length / 60)).padStart(2, '0')}:{String(logs.length % 60).padStart(2, '0')}
          </span>
          <span className="inline-block w-2 h-3 bg-emerald-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
