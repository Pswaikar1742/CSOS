'use client';

import { useState } from 'react';
import { Eye, ChevronDown } from 'lucide-react';
import { ROLE_THEMES, ROLE_HOME } from '@/lib/types';
import type { CSOSRole } from '@/lib/types';

// ─── CSOS v2.0 Role Switcher ───
// "Aha!" Switcher — hidden bottom-corner dropdown for live pitch demo.
// Changes csos_role cookie and navigates to the new department.

const ROLES: CSOSRole[] = ['police', 'rto', 'sanitation', 'god-view'];

export default function RoleSwitcher({ currentRole }: { currentRole: CSOSRole }) {
  const [open, setOpen] = useState(false);

  const switchRole = (role: CSOSRole) => {
    document.cookie = `csos_role=${role}; path=/; max-age=86400`;
    window.location.href = ROLE_HOME[role];
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-black/70 backdrop-blur-md border border-slate-800
          text-[10px] font-mono text-slate-500
          hover:text-slate-300 hover:border-slate-600
          transition-all duration-200
        `}
        title="Switch Role (Demo)"
      >
        <Eye className="w-3 h-3" />
        <span className="tracking-wider">RBAC</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-48 bg-black/80 backdrop-blur-md border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
          <div className="px-3 py-2 border-b border-slate-800">
            <span className="text-[9px] font-mono text-slate-600 tracking-[0.2em]">
              ROLE SWITCHER
            </span>
          </div>
          {ROLES.map((role) => {
            const theme = ROLE_THEMES[role];
            const isActive = role === currentRole;
            return (
              <button
                key={role}
                onClick={() => switchRole(role)}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5
                  text-xs font-mono tracking-wider
                  hover:bg-slate-900/60 transition-all duration-150
                  ${isActive ? `${theme.textClass} font-bold` : 'text-slate-500'}
                `}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${theme.bgAccentClass} ${isActive ? 'animate-pulse' : 'opacity-40'}`} />
                  {theme.label}
                </div>
                {isActive && (
                  <span className="text-[9px] text-slate-600">ACTIVE</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
