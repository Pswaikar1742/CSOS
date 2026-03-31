'use client';

/**
 * StatsCard — Reusable KPI display card.
 * Used in all department dashboards for key metrics.
 *
 * Shows: large value, icon, label, optional trend indicator.
 * Supports multiple color variants to match department themes.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Trend = 'up' | 'down' | 'same' | null;

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: Trend;
  trendLabel?: string;
  variant?: 'default' | 'police' | 'rto' | 'sanitation' | 'city';
  className?: string;
}

const VARIANT_STYLES: Record<string, { border: string; iconBg: string; iconText: string }> = {
  default: { border: 'border-slate-200', iconBg: 'bg-slate-100', iconText: 'text-slate-600' },
  police: { border: 'border-red-200', iconBg: 'bg-red-50', iconText: 'text-red-600' },
  rto: { border: 'border-blue-200', iconBg: 'bg-blue-50', iconText: 'text-blue-700' },
  sanitation: { border: 'border-emerald-200', iconBg: 'bg-emerald-50', iconText: 'text-emerald-700' },
  city: { border: 'border-amber-200', iconBg: 'bg-amber-50', iconText: 'text-amber-700' },
};

const TREND_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  up: { icon: <TrendingUp className="h-3.5 w-3.5" />, color: 'text-emerald-600' },
  down: { icon: <TrendingDown className="h-3.5 w-3.5" />, color: 'text-red-600' },
  same: { icon: <Minus className="h-3.5 w-3.5" />, color: 'text-slate-500' },
};

export default function StatsCard({
  title,
  value,
  icon,
  trend,
  trendLabel,
  variant = 'default',
  className = '',
}: StatsCardProps) {
  const v = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  const t = trend ? TREND_CONFIG[trend] : null;

  return (
    <article
      className={`rounded-xl border ${v.border} bg-white p-4 shadow-sm animate-fade-in ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</span>
        {icon && (
          <span className={`h-8 w-8 flex items-center justify-center rounded-lg ${v.iconBg} ${v.iconText}`}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-2xl font-bold text-slate-900 tabular-nums">{value}</span>
        {t && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${t.color} mb-0.5`}>
            {t.icon}
            {trendLabel && <span>{trendLabel}</span>}
          </span>
        )}
      </div>
    </article>
  );
}
