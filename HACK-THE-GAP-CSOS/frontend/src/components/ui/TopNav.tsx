'use client';

import { Building2, Landmark, ShieldCheck } from 'lucide-react';
import type { CSOSRole } from '@/lib/types';
import { ROLE_THEMES } from '@/lib/types';

interface TopNavProps {
  role: CSOSRole;
}

export default function TopNav({ role }: TopNavProps) {
  const theme = ROLE_THEMES[role];
  const roleBadge = `[${theme.label}]`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-slate-200 bg-white shadow-sm">
      <div className="h-full px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-md bg-[#1E3A8A] text-white flex items-center justify-center shadow-sm">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="h-9 w-9 rounded-md bg-white border border-slate-300 text-[#1E3A8A] flex items-center justify-center shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="hidden md:flex flex-col leading-tight">
            <span className="text-[10px] tracking-wide font-semibold text-slate-500">CSMC</span>
            <span className="text-[10px] tracking-wide font-semibold text-slate-500">SMART CITY</span>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 hidden lg:block">
          <h1 className="text-sm xl:text-base font-semibold text-[#1E3A8A] tracking-wide">
            CSOS - Chhatrapati Sambhajinagar Operating System
          </h1>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#1E3A8A] bg-[#1E3A8A]/5">
          <ShieldCheck className="h-4 w-4 text-[#1E3A8A]" />
          <span className="text-xs font-semibold text-[#1E3A8A] tracking-wide">
            {roleBadge}
          </span>
        </div>
      </div>
    </header>
  );
}
