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
import { useRouter } from 'next/navigation';
import { Bell, Clock } from 'lucide-react';
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
  const router = useRouter();
  const theme = ROLE_THEMES[role];
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

  const goToIncidents = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('csos:navigate', { detail: { target: 'incidents' } }));
    }
    router.push(`/${role}?view=incidents`);
  };

  return (
    <header className="h-16 border-b-2 border-slate-300 bg-white shadow-sm shrink-0 font-sans">
      <div className="h-full px-4 flex items-center justify-between gap-3">
        {/* Left: Logos + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/placeholder-csmc.png"
            alt="CSMC Logo"
            className="h-10 w-10 rounded border-2 border-slate-300 bg-white object-contain shrink-0"
          />
          <img
            src="/placeholder-smartcity.png"
            alt="Smart City Mission Logo"
            className="h-10 w-10 rounded border-2 border-slate-300 bg-white object-contain shrink-0"
          />
          <div className="hidden lg:flex flex-col leading-tight min-w-0">
            <span className="text-xs font-bold text-[#002147] tracking-wide uppercase truncate">
              CHHATRAPATI SAMBHAJINAGAR MUNICIPAL CORPORATION
            </span>
            <span className="text-[10px] text-slate-700 tracking-wide truncate">
              Integrated Command &amp; Control Centre (ICCC) - Powered by CSOS
            </span>
          </div>
        </div>

        {/* Right: Alerts, Clock, Officer, Role */}
        <div className="flex items-center gap-3">
          {/* Alert counter */}
          <button
            onClick={goToIncidents}
            className="relative h-9 w-9 flex items-center justify-center rounded border-2 border-slate-300 hover:bg-slate-50 transition"
            aria-label={`${alertCount} active alerts`}
            title={`${alertCount} active alerts`}
          >
            <Bell className="h-4 w-4 text-[#002147]" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center rounded-full bg-[#FF9933] px-1 text-[10px] font-bold text-slate-900">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>

          {/* Live clock */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-700 font-mono tabular-nums">
            <Clock className="h-3.5 w-3.5" />
            <span>{currentTime || '--:--:--'}</span>
            <span className="text-[10px] text-slate-500">IST</span>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200 hidden md:block" />

          {/* Officer name */}
          <span className="hidden md:block text-xs text-slate-700 font-medium truncate max-w-[120px]">
            {operatorName}
          </span>

          {/* Role badge */}
          <div className="px-2.5 py-1.5 rounded border-2 border-[#002147] bg-[#002147] shadow-sm">
            <span className="text-[11px] font-semibold text-white tracking-wide">
              [ 👤 Logged in as: {operatorName || 'Nodal Officer'} ({theme.label}) ]
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
