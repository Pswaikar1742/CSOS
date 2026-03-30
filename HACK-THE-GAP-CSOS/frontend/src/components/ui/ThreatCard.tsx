'use client';

import { useState } from 'react';

interface ThreatCardProps {
  incidentId: string;
  type: string;
  location: string;
  elapsedText: string;
  dispatchPlan: string;
  dispatchLabel: string;
  status?: string;
  onDispatch?: () => Promise<{ auditHash?: string; assignedUnit?: string }>;
  disabled?: boolean;
}

export default function ThreatCard({
  incidentId,
  type,
  location,
  elapsedText,
  dispatchPlan,
  dispatchLabel,
  status,
  onDispatch,
  disabled,
}: ThreatCardProps) {
  const isInterAgency = type.toUpperCase().includes('INTER-AGENCY ALERT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDispatched, setIsDispatched] = useState(status === 'DISPATCHED' || status === 'RESOLVED');
  const [assignedUnit, setAssignedUnit] = useState<string | null>(null);

  const handleDispatch = async () => {
    if (!onDispatch || disabled || isSubmitting || isDispatched) return;

    setIsSubmitting(true);
    try {
      const result = await onDispatch();
      setIsDispatched(true);
      const unit = result?.assignedUnit || '';
      setAssignedUnit(unit);
      if (unit) {
        window.alert(`✓ Dispatch Confirmed\n\nUnit: ${unit}\nIncident: ${incidentId}\n\nETA: 4 minutes`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Dispatch failed';
      window.alert(`Dispatch failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const buttonDisabled = Boolean(disabled || isSubmitting || isDispatched);
  const buttonText = isDispatched
    ? '[ ✓ DISPATCHED ]'
    : isSubmitting
      ? 'SECURING...'
      : dispatchLabel;

  return (
    <article className={`rounded-xl border shadow-sm p-4 space-y-3 ${isInterAgency ? 'border-purple-200 bg-purple-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-4 h-4 inline-flex items-center justify-center ${isInterAgency ? 'text-purple-700' : 'text-[#B91C1C]'}`} aria-hidden="true">
            ⚠
          </span>
          <span className="text-xs font-semibold text-[#1E3A8A] tracking-wide">{incidentId}</span>
        </div>
        <span className="text-xs text-slate-500">Detected {elapsedText} ago</span>
      </div>

      <div className="space-y-2">
        <span className={`inline-block rounded text-xs font-semibold px-2 py-1 tracking-wide ${isInterAgency ? 'bg-purple-100 text-purple-700' : 'bg-[#B91C1C]/10 text-[#B91C1C]'}`}>
          {isInterAgency ? '[INTER-AGENCY ALERT]' : type.toUpperCase()}
        </span>
        <p className="text-xs font-medium text-slate-600">Location: {location}</p>
        <p className="text-sm text-slate-700 leading-relaxed">{dispatchPlan}</p>
        {isDispatched && assignedUnit && (
          <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
            <p className="text-xs font-semibold text-emerald-700">
              ✓ Unit Assigned: <span className="font-mono">{assignedUnit}</span>
            </p>
            <p className="text-xs text-emerald-600 mt-1">Estimated arrival: 4 minutes</p>
          </div>
        )}
      </div>

      {status && (
        <div className="text-xs text-slate-500 font-medium">
          Status: <span className="text-slate-700">{status}</span>
        </div>
      )}

      <button
        onClick={handleDispatch}
        disabled={buttonDisabled}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold tracking-wide transition-colors ${
          isDispatched
            ? 'bg-slate-300 text-slate-700 cursor-not-allowed'
            : 'bg-[#059669] text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed'
        }`}
      >
        {isSubmitting && <span className="h-3.5 w-3.5 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />}
        {buttonText}
      </button>
    </article>
  );
}
