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
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `csos_role=${role}; path=/; max-age=86400`;
    // eslint-disable-next-line react-hooks/immutability
    window.location.href = ROLE_HOME[role];
  };

  return (
    <div className="absolute bottom-4 left-4 z-[100]">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded border-2 border-slate-300 bg-white text-[10px] font-semibold text-[#002147] hover:bg-slate-50 transition-colors"
        title="Switch Role (Demo)"
      >
        <Eye className="w-3 h-3" />
        <span className="tracking-wide uppercase">RBAC</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border-2 border-slate-300 rounded overflow-hidden shadow-sm">
          <div className="px-3 py-2 border-b-2 border-slate-300 bg-slate-50">
            <span className="text-[9px] font-semibold text-[#002147] tracking-wide uppercase">
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
                  text-xs font-medium tracking-wide
                  hover:bg-slate-100 transition-colors
                  ${isActive ? 'text-[#002147] bg-blue-900/10' : 'text-slate-700'}
                `}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${theme.bgAccentClass} ${isActive ? '' : 'opacity-50'}`} />
                  {theme.label}
                </div>
                {isActive && (
                  <span className="text-[9px] text-[#138808] font-semibold">ACTIVE</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
