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
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Could close modals in the future
    }
    if (e.altKey && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      setActiveNav('map');
    }
    if (e.altKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      setActiveNav('dashboard');
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const accentBorder = ROLE_SIDEBAR_ACCENT[role];

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F2F5]" data-role={role}>
      {/* ── Left Sidebar ── */}
      <aside
        className={`
          relative flex flex-col border-r border-slate-200 bg-white shadow-sm
          transition-all duration-200 ease-in-out shrink-0
          ${collapsed ? 'w-16' : 'w-52'}
        `}
      >
        {/* Sidebar header */}
        <div className={`h-14 flex items-center px-3 border-b border-slate-200 gap-2`}>
          <div className={`h-8 w-8 rounded-lg bg-[#1E3A8A] text-white flex items-center justify-center shrink-0`}>
            <Radio className="h-4 w-4" />
          </div>
          {!collapsed && (
            <span className="text-xs font-bold tracking-wider text-[#1E3A8A] truncate">
              CSOS v2.0
            </span>
          )}
        </div>

        {/* Role indicator bar */}
        <div className={`h-1 ${accentBorder} border-b-2`} />

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-[#1E3A8A]/10 text-[#1E3A8A]'
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
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-10 flex items-center justify-center border-t border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
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
