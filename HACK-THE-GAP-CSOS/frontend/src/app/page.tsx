'use client';

import { Shield, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ROLE_THEMES } from '@/lib/types';
import type { CSOSRole } from '@/lib/types';

const roles: CSOSRole[] = ['police', 'rto', 'sanitation', 'god-view'];

export default function HomePage() {
  const setRoleCookie = (role: CSOSRole) => {
    document.cookie = `csos_role=${role}; path=/; max-age=86400`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      {/* ── CSOS Branding ── */}
      <div className="text-center mb-12">
        <Shield className="w-16 h-16 text-purple-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold tracking-[0.4em] text-slate-100 font-mono">
          CSOS <span className="text-purple-500">v2.0</span>
        </h1>
        <p className="text-xs font-mono text-slate-500 mt-2 tracking-wider">
          CHHATRAPATI SAMBHAJINAGAR OPERATING SYSTEM
        </p>
        <p className="text-[10px] font-mono text-slate-600 mt-1 tracking-widest">
          SELECT DEPARTMENT TO ACCESS COMMAND CENTER
        </p>
      </div>

      {/* ── Role Selection Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg w-full">
        {roles.map((role) => {
          const theme = ROLE_THEMES[role];
          const href = role === 'god-view' ? '/god-view' : `/${role}`;
          return (
            <Link
              key={role}
              href={href}
              onClick={() => setRoleCookie(role)}
              className={`
                group flex items-center justify-between
                px-5 py-4 rounded-lg
                bg-black/60 backdrop-blur-md
                border ${theme.borderClass} ${theme.hoverBorderClass}
                transition-all duration-300 ease-in-out
                hover:scale-105
              `}
              style={{ boxShadow: 'none' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = theme.glowShadow;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div>
                <span className={`text-sm font-mono font-bold tracking-widest ${theme.textClass}`}>
                  {theme.label}
                </span>
                <p className="text-[10px] font-mono text-slate-600 mt-0.5">
                  {role === 'police' && 'Weapons • Accidents'}
                  {role === 'rto' && 'ANPR • Traffic'}
                  {role === 'sanitation' && 'Illegal Dumping'}
                  {role === 'god-view' && 'All Department Access'}
                </p>
              </div>
              <ArrowRight className={`w-4 h-4 ${theme.textClass} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
