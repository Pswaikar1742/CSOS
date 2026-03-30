'use client';

import { useState } from 'react';

const BACKEND_HTTP_BASE = (process.env.NEXT_PUBLIC_BACKEND_HTTP_BASE || 'http://localhost:8000').replace(/\/$/, '');

interface ThreatCardProps {
  incidentId: string;
  type: string;
  location: string;
  elapsedText: string;
  loggedAt?: string;
  zone?: string;
  wardName?: string;
  formalIncidentId?: string;
  dispatchPlan: string;
  dispatchLabel: string;
  status?: string;
  onDispatch?: () => Promise<{ auditHash?: string; assignedUnit?: string }>;
  onWhatsappAlert?: () => Promise<void>;
  disabled?: boolean;
}

export default function ThreatCard({
  incidentId,
  type,
  location,
  elapsedText,
  loggedAt,
  zone,
  wardName,
  formalIncidentId,
  dispatchPlan,
  dispatchLabel,
  status,
  onDispatch,
  onWhatsappAlert,
  disabled,
}: ThreatCardProps) {
  const isInterAgency = type.toUpperCase().includes('INTER-AGENCY ALERT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWhatsappSubmitting, setIsWhatsappSubmitting] = useState(false);
  const [isDispatched, setIsDispatched] = useState(status === 'DISPATCHED' || status === 'RESOLVED');
  const [assignedUnit, setAssignedUnit] = useState<string | null>(null);

  const handleFallbackDispatch = async () => {
    const response = await fetch(`${BACKEND_HTTP_BASE}/api/hitl-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: incidentId,
        action: 'VERIFIED',
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(String(payload?.detail || 'Dispatch failed'));
    }

    return {
      assignedUnit: String(payload?.assigned_unit || payload?.dispatch_message || '').trim(),
    };
  };

  const handleSendWhatsapp = async () => {
    if (!onWhatsappAlert || isWhatsappSubmitting) return;
    setIsWhatsappSubmitting(true);
    try {
      await onWhatsappAlert();
      window.alert(`WhatsApp alert sent for ${formalIncidentId || incidentId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'WhatsApp alert failed';
      window.alert(`WhatsApp dispatch failed: ${message}`);
    } finally {
      setIsWhatsappSubmitting(false);
    }
  };

  const handleAssignUnit = async () => {
    if (disabled || isSubmitting || isDispatched) return;

    setIsSubmitting(true);
    try {
      const result = onDispatch ? await onDispatch() : await handleFallbackDispatch();
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
    <article className={`rounded border-2 shadow-sm p-2.5 space-y-2 font-sans ${isInterAgency ? 'border-[#FF9933] bg-amber-50' : 'border-slate-300 bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold tracking-wide uppercase text-[#002147]">
            {isInterAgency ? 'INTER-DEPARTMENT CASE' : 'INCIDENT ENTRY'}
          </div>
          <div className="text-[11px] text-slate-700">
            Logged: {loggedAt || `Detected ${elapsedText} ago`}
          </div>
        </div>
        {status && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-300 bg-slate-50 text-slate-700">
            {status}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-800">
        <p><span className="font-semibold text-[#002147]">Incident ID:</span> {formalIncidentId || incidentId}</p>
        <p><span className="font-semibold text-[#002147]">Zone:</span> {zone || 'Zone 1'}</p>
        <p><span className="font-semibold text-[#002147]">Ward Name:</span> {wardName || location}</p>
        <p><span className="font-semibold text-[#002147]">Category:</span> {type.toUpperCase()}</p>
        <p className="text-[11px] text-slate-700"><span className="font-semibold text-[#002147]">Action Note:</span> {dispatchPlan}</p>
      </div>

      {isDispatched && assignedUnit && (
        <div className="rounded border border-[#138808] bg-emerald-50 px-2 py-1.5">
          <p className="text-[11px] font-semibold text-[#138808]">
            ✓ Unit Assigned: <span className="font-mono">{assignedUnit}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleAssignUnit}
          disabled={buttonDisabled}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-[11px] font-semibold tracking-wide transition-colors ${
            isDispatched
              ? 'bg-slate-300 text-slate-700 cursor-not-allowed'
              : 'bg-blue-900 text-white hover:bg-[#002147] disabled:opacity-60 disabled:cursor-not-allowed'
          }`}
        >
          {isSubmitting && <span className="h-3.5 w-3.5 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />}
          {buttonText}
        </button>

        <button
          onClick={handleSendWhatsapp}
          disabled={Boolean(!onWhatsappAlert || isWhatsappSubmitting)}
          className="w-full flex items-center justify-center px-2 py-2 rounded text-[11px] font-semibold tracking-wide border border-[#138808] text-[#138808] bg-white hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isWhatsappSubmitting ? 'SENDING...' : '[ 💬 Send WhatsApp Alert ]'}
        </button>
      </div>
    </article>
  );
}
