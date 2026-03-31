'use client';

/**
 * AlertBanner — Toast-style notification system.
 * Stacks multiple alerts, auto-dismisses after 5 seconds.
 * Color-coded: success (green), error (red), warning (amber), info (blue).
 *
 * Usage:
 *   const { alerts, addAlert, removeAlert } = useAlerts();
 *   addAlert({ type: 'success', message: 'Unit dispatched' });
 */

import { useCallback, useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
}

const TYPE_STYLES: Record<AlertType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: <XCircle className="h-4 w-4 text-red-600" />,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: <Info className="h-4 w-4 text-blue-600" />,
  },
};

/** Hook to manage alert state. */
export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addAlert = useCallback((alert: Omit<Alert, 'id'>) => {
    const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setAlerts((prev) => [...prev.slice(-4), { ...alert, id }]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, 5000);
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { alerts, addAlert, removeAlert };
}

/** Render the alert stack in the bottom-right corner. */
export default function AlertBanner({
  alerts,
  onDismiss,
}: {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}) {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 max-w-sm">
      {alerts.map((alert) => {
        const s = TYPE_STYLES[alert.type];
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-2 rounded-lg border ${s.border} ${s.bg} px-4 py-3 shadow-lg animate-slide-in-right`}
            role="alert"
          >
            <span className="mt-0.5 shrink-0">{s.icon}</span>
            <span className={`text-sm font-medium ${s.text} flex-1`}>{alert.message}</span>
            <button
              onClick={() => onDismiss(alert.id)}
              className="shrink-0 rounded p-0.5 hover:bg-black/5 transition"
              aria-label="Dismiss alert"
            >
              <X className="h-3.5 w-3.5 text-slate-500" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
