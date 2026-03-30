'use client';

/**
 * ResourcePanel — Police patrol unit status list.
 *
 * Shows mock patrol units with:
 * - StatusDot (green=Available, yellow=On-Duty, red=Busy)
 * - Unit details (name, beat area, last update)
 * - Click to highlight on map
 *
 * For Inspector Rajesh: "Which QRT units can I dispatch right now?"
 */

import StatusDot from '@/components/ui/StatusDot';

type UnitStatus = 'available' | 'busy' | 'idle';

interface PatrolUnit {
  id: string;
  name: string;
  area: string;
  status: UnitStatus;
  lastUpdate: string;
}

const MOCK_PATROL_UNITS: PatrolUnit[] = [
  { id: 'QRT-01', name: 'Quick Response Team 01', area: 'Kranti Chowk', status: 'available', lastUpdate: '2 mins ago' },
  { id: 'QRT-02', name: 'Quick Response Team 02', area: 'Mondha Market', status: 'available', lastUpdate: '5 mins ago' },
  { id: 'PATROL-12', name: 'Beat Patrol 12', area: 'Jalna Road', status: 'busy', lastUpdate: '12 mins ago' },
  { id: 'PATROL-08', name: 'Beat Patrol 08', area: 'Aurangpura', status: 'busy', lastUpdate: '8 mins ago' },
  { id: 'PCR-VAN-3', name: 'PCR Van 3', area: 'CIDCO', status: 'idle', lastUpdate: '25 mins ago' },
  { id: 'QRT-05', name: 'Quick Response Team 05', area: 'Beed Bypass', status: 'available', lastUpdate: '1 min ago' },
  { id: 'PATROL-22', name: 'Beat Patrol 22', area: 'Seven Hills', status: 'busy', lastUpdate: '15 mins ago' },
];

const STATUS_TO_DOT: Record<UnitStatus, 'available' | 'busy' | 'idle'> = {
  available: 'available',
  busy: 'busy',
  idle: 'idle',
};

interface ResourcePanelProps {
  onUnitSelect?: (unit: PatrolUnit) => void;
}

export default function ResourcePanel({ onUnitSelect }: ResourcePanelProps) {
  const available = MOCK_PATROL_UNITS.filter((u) => u.status === 'available').length;
  const busy = MOCK_PATROL_UNITS.filter((u) => u.status === 'busy').length;
  const idle = MOCK_PATROL_UNITS.filter((u) => u.status === 'idle').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <h3 className="text-sm font-bold text-[#1E3A8A] tracking-wide">Available Units</h3>
        <div className="mt-1.5 flex gap-3 text-[10px] font-semibold">
          <span className="flex items-center gap-1">
            <StatusDot status="available" size="sm" /> {available} Ready
          </span>
          <span className="flex items-center gap-1">
            <StatusDot status="busy" size="sm" /> {busy} Busy
          </span>
          <span className="flex items-center gap-1">
            <StatusDot status="idle" size="sm" /> {idle} Idle
          </span>
        </div>
      </div>

      {/* Unit list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {MOCK_PATROL_UNITS.map((unit) => (
          <button
            key={unit.id}
            onClick={() => onUnitSelect?.(unit)}
            className="w-full text-left rounded-lg border border-slate-200 p-3 hover:bg-slate-50 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusDot status={STATUS_TO_DOT[unit.status]} size="md" />
                <span className="text-xs font-bold text-slate-800">{unit.id}</span>
              </div>
              <span className="text-[10px] text-slate-400">{unit.lastUpdate}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600 truncate">{unit.name}</p>
            <p className="text-[11px] text-slate-500">📍 {unit.area}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
