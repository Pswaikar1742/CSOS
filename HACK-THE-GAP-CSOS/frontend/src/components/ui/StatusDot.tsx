'use client';

/**
 * StatusDot — Tiny animated status indicator.
 * Used across Police (patrol units), Sanitation (trucks), and City Command (department health).
 *
 * Colors: green=available, yellow=busy, red=idle/alert, grey=offline
 * Pulse animation on 'available' and 'idle' states for attention.
 */

type StatusDotStatus = 'available' | 'busy' | 'idle' | 'offline';

interface StatusDotProps {
  status: StatusDotStatus;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const STATUS_STYLES: Record<StatusDotStatus, { color: string; pulse: boolean }> = {
  available: { color: 'bg-emerald-500', pulse: true },
  busy: { color: 'bg-amber-500', pulse: false },
  idle: { color: 'bg-red-500', pulse: true },
  offline: { color: 'bg-slate-400', pulse: false },
};

const SIZE_MAP = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export default function StatusDot({ status, size = 'md', label }: StatusDotProps) {
  const style = STATUS_STYLES[status];
  const sizeClass = SIZE_MAP[size];

  return (
    <span className="inline-flex items-center gap-1.5" title={label || status}>
      <span className="relative inline-flex">
        <span className={`${sizeClass} ${style.color} rounded-full`} />
        {style.pulse && (
          <span className={`absolute inset-0 ${sizeClass} ${style.color} rounded-full animate-ping opacity-40`} />
        )}
      </span>
      {label && <span className="text-xs text-slate-600 capitalize">{label}</span>}
    </span>
  );
}
