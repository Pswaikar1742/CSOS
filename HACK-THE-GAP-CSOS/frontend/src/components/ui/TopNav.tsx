'use client';

/**
 * TopNav — Enhanced command center header.
 *
 * Displays:
 * 1. Government logos (existing)
 * 2. CSOS title (existing)
 * 3. Active alerts counter badge with pulsing indicator
 * 4. Live clock (IST timezone)
 * 5. Officer name from csos_operator cookie
 * 6. Role badge with department color
 *
 * Designed for Inspector Rajesh's 3 AM shift:
 * - High contrast, large text
 * - Alert count always visible
 * - Live clock so officer knows exact time without looking away
 */

import { useEffect, useState } from 'react';
import { Bell, Building2, Landmark, ShieldCheck, Clock } from 'lucide-react';
import type { CSOSRole } from '@/lib/types';
import { ROLE_THEMES } from '@/lib/types';

interface TopNavProps {
  role: CSOSRole;
  alertCount?: number;
}

function getCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export default function TopNav({ role, alertCount = 0 }: TopNavProps) {
  const theme = ROLE_THEMES[role];
  const roleBadge = `[${theme.label}]`;
  const [currentTime, setCurrentTime] = useState('');
  const [operatorName, setOperatorName] = useState('');

  useEffect(() => {
    // Read operator name from cookie
    const name = getCookie('csos_operator');
    setOperatorName(name || 'Officer');

    // Live clock
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 border-b border-slate-200 bg-white shadow-sm shrink-0">
      <div className="h-full px-4 flex items-center justify-between gap-3">
        {/* Left: Logos + Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-md bg-[#1E3A8A] text-white flex items-center justify-center shadow-sm shrink-0">
            <Landmark className="h-4 w-4" />
          </div>
          <div className="h-8 w-8 rounded-md bg-white border border-slate-300 text-[#1E3A8A] flex items-center justify-center shadow-sm shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="hidden lg:flex flex-col leading-tight">
            <span className="text-xs font-semibold text-[#1E3A8A] tracking-wide">
              CSOS — Chhatrapati Sambhajinagar Operating System
            </span>
            <span className="text-[10px] text-slate-500 tracking-wide">CSMC Smart City Mission</span>
          </div>
        </div>

        {/* Right: Alerts, Clock, Officer, Role */}
        <div className="flex items-center gap-3">
          {/* Alert counter */}
          <button
            className="relative h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition"
            aria-label={`${alertCount} active alerts`}
            title={`${alertCount} active alerts`}
          >
            <Bell className="h-4 w-4 text-slate-600" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-pulse-alert">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>

          {/* Live clock */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
            <Clock className="h-3.5 w-3.5" />
            <span>{currentTime || '--:--:--'}</span>
            <span className="text-[10px] text-slate-400">IST</span>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 hidden md:block" />

          {/* Officer name */}
          <span className="hidden md:block text-xs text-slate-600 font-medium truncate max-w-[120px]">
            {operatorName}
          </span>

          {/* Role badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#1E3A8A] bg-[#1E3A8A]/5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#1E3A8A]" />
            <span className="text-[11px] font-semibold text-[#1E3A8A] tracking-wide">
              {roleBadge}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
