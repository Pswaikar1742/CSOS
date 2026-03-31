'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, FileCode2 } from 'lucide-react';

// ─── CSOS v2.0 Neural Stream Terminal ───
// A right-sidebar terminal that displays live AI detection math.
// Auto-scrolls to bottom. Monospace green text. Watch Dogs aesthetic.

interface NeuralStreamProps {
  logs: string[];
}

function getLogColor(log: string): string {
  if (log.includes('[ACTION_TAKEN]')) return 'text-emerald-700';
  if (log.includes('[MATH]')) return 'text-blue-700';
  if (log.includes('[DETECT]')) return 'text-[#B91C1C]';
  return 'text-slate-700';
}

function getPrefixTone(prefix: string): string {
  if (prefix === '[GOVERNANCE]') return 'text-amber-600';
  if (prefix === '[DISPATCH]') return 'text-cyan-600';
  if (prefix === '[AUDIT]') return 'text-violet-600';
  if (prefix === '[DETECT]') return 'text-[#B91C1C]';
  return 'text-slate-500';
}

function splitPrefix(log: string): { prefix: string; body: string } {
  const match = log.match(/^(\[[A-Z_-]+\])\s*(.*)$/);
  if (!match) {
    return { prefix: '[LOG]', body: log };
  }
  return { prefix: match[1], body: match[2] };
}

export default function NeuralStream({ logs }: NeuralStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLogsLenRef = useRef(0);
  const [open, setOpen] = useState(false);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (logs.length > prevLogsLenRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLogsLenRef.current = logs.length;
  }, [logs]);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto rounded-xl border border-slate-300 bg-[#F3F4F6] shadow-sm overflow-hidden">
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200"
        >
          <div className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-[#1E3A8A]" />
            <span className="text-xs font-semibold tracking-wide text-[#1E3A8A]">
              Technical Sieve Proofs
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>{logs.length} logs</span>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </div>
        </button>

        <div className={`${open ? 'max-h-56' : 'max-h-0'} transition-all duration-200 overflow-hidden`}>
          <div
            ref={scrollRef}
            className="overflow-y-auto p-3 space-y-1 font-mono text-[11px] leading-snug bg-[#F3F4F6]"
            style={{ maxHeight: '14rem' }}
          >
            {logs.map((log, index) => (
              (() => {
                const { prefix, body } = splitPrefix(log);
                return (
                  <div key={`${log}-${index}`} className="flex items-start gap-2">
                    <span className="text-slate-500 shrink-0">{String(index + 1).padStart(3, '0')}</span>
                    <span className={`${getPrefixTone(prefix)} font-semibold shrink-0`}>{prefix}</span>
                    <span className={`${getLogColor(log)} break-words`}>{body}</span>
                  </div>
                );
              })()
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
