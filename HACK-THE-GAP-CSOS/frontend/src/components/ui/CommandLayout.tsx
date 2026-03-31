'use client';

/**
 * CommandLayout — Shared layout wrapper for all department dashboards.
 *
 * Provides:
 * 1. Collapsible left sidebar with navigation items (icon + text)
 * 2. Keyboard shortcut listener (Alt+M → Map, Alt+D → Dashboard, Esc → close)
 * 3. Content area for department-specific children
 * 4. Role-aware theming via data attributes
 *
 * Replaces the bare TopNav + RoleSwitcher in (protected)/layout.tsx.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Map,
  LayoutDashboard,
  AlertTriangle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Radio,
} from 'lucide-react';
import type { CSOSRole } from '@/lib/types';
import RoleSwitcher from '@/components/ui/RoleSwitcher';

interface CommandLayoutProps {
  role: CSOSRole;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { id: 'map', label: 'Live Map', icon: Map, shortcut: 'Alt+M' },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'Alt+D' },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle, shortcut: '' },
  { id: 'reports', label: 'Reports', icon: FileText, shortcut: '' },
];

const ROLE_SIDEBAR_ACCENT: Record<CSOSRole, string> = {
  police: 'border-red-500',
  rto: 'border-blue-600',
  sanitation: 'border-emerald-600',
  'god-view': 'border-amber-500',
};

export default function CommandLayout({ role, children }: CommandLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');

  const roleBasePath: Record<CSOSRole, string> = {
    police: '/police',
    rto: '/rto',
    sanitation: '/sanitation',
    'god-view': '/god-view',
  };

  const routeRole: CSOSRole = pathname.startsWith('/police')
    ? 'police'
    : pathname.startsWith('/rto')
      ? 'rto'
      : pathname.startsWith('/sanitation')
        ? 'sanitation'
        : pathname.startsWith('/god-view')
          ? 'god-view'
          : role;

  const navPathFor = useCallback((target: string): string => {
    const base = roleBasePath[routeRole];
    if (target === 'map') return `${base}?view=map`;
    if (target === 'incidents') return `${base}?view=incidents`;
    if (target === 'reports') return `${base}?view=reports`;
    return `${base}?view=dashboard`;
  }, [routeRole]);

  const navigateTo = useCallback((target: string) => {
    setActiveNav(target);
    router.push(navPathFor(target));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('csos:navigate', { detail: { target } }));
    }
  }, [navPathFor, router]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Could close modals in the future
    }
    if (e.altKey && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      navigateTo('map');
    }
    if (e.altKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      navigateTo('dashboard');
    }
  }, [navigateTo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'map' || view === 'incidents' || view === 'reports' || view === 'dashboard') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveNav(view);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveNav('dashboard');
  }, [searchParams]);

  const accentBorder = ROLE_SIDEBAR_ACCENT[routeRole];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50" data-role={routeRole}>
      {/* ── Left Sidebar ── */}
      <aside
        className={`
          relative flex flex-col border-r-2 border-slate-300 bg-white shadow-sm
          transition-all duration-200 ease-in-out shrink-0
          ${collapsed ? 'w-16' : 'w-52'}
        `}
      >
        {/* Sidebar header */}
        <div className="h-14 flex items-center px-3 border-b-2 border-slate-300 gap-2">
          <div className="h-8 w-8 rounded bg-blue-900 text-white flex items-center justify-center shrink-0">
            <Radio className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="text-xs font-bold tracking-wide uppercase text-[#002147] truncate">
              CSOS v2.0
            </span>
          )}
        </div>

        {/* Role indicator bar */}
        <div className={`h-1 ${accentBorder} border-b border-[#FF9933]`} />

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <Link
                key={item.id}
                href={navPathFor(item.id)}
                onClick={() => setActiveNav(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-blue-900/10 text-[#002147] border border-slate-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }
                `}
                title={collapsed ? `${item.label} ${item.shortcut ? `(${item.shortcut})` : ''}` : undefined}
                aria-label={item.label}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-10 flex items-center justify-center border-t-2 border-slate-300 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>

      {/* Role Switcher (demo) */}
      <RoleSwitcher currentRole={role} />
    </div>
  );
}
