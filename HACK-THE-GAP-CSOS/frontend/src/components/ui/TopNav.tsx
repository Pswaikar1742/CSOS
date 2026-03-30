'use client';

import { Shield, Wifi, Radio } from 'lucide-react';
import type { CSOSRole } from '@/lib/types';
import { ROLE_THEMES } from '@/lib/types';

interface TopNavProps {
  role: CSOSRole;
}

export default function TopNav({ role }: TopNavProps) {
  const theme = ROLE_THEMES[role];

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50
        h-16 flex items-center justify-between px-6
        bg-slate-950/80 backdrop-blur-md
        border-b ${theme.borderClass}
        transition-all duration-300 ease-in-out
      `}
      style={{ boxShadow: theme.glowShadow }}
    >
      {/* ── Left: Branding ── */}
      <div className="flex items-center gap-3">
        <Shield className={`w-6 h-6 ${theme.textClass}`} />
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-widest text-slate-100">
            CSOS <span className={theme.textClass}>v2.0</span>
          </span>
          <span className="text-[10px] font-mono text-slate-500 tracking-wider">
            CHHATRAPATI SAMBHAJINAGAR OS
          </span>
        </div>
      </div>

      {/* ── Center: Role Badge ── */}
      <div className="flex items-center gap-2">
        <Radio className={`w-4 h-4 ${theme.textClass} animate-pulse`} />
        <span
          className={`
            text-xs font-mono font-bold tracking-[0.3em] px-3 py-1
            border ${theme.borderClass} rounded
            ${theme.textClass} bg-black/40
          `}
        >
          {theme.label}
        </span>
      </div>

      {/* ── Right: Socket Status ── */}
      <div className="flex items-center gap-4">
        {/* Socket indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-mono text-emerald-400">
            SOCKET: CONNECTED
          </span>
        </div>

        {/* Uplink icon */}
        <Wifi className="w-4 h-4 text-slate-500" />
      </div>
    </header>
  );
}
