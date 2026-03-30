/** Mock KPI data for City Command / God-View. */

export interface DepartmentSummary {
  name: string;
  role: string;
  color: string;
  activeIncidents: number;
  responseTime: string;
  unitsAvailable: string;
  status: 'operational' | 'warning' | 'critical';
  highlight: string;
}

export const DEPARTMENT_SUMMARIES: DepartmentSummary[] = [
  {
    name: 'Police Command',
    role: 'police',
    color: '#DC2626',
    activeIncidents: 12,
    responseTime: '8 mins (↓2)',
    unitsAvailable: '45/60',
    status: 'operational',
    highlight: 'Beat Marshal dispatches up 15% this week',
  },
  {
    name: 'RTO Command',
    role: 'rto',
    color: '#1E40AF',
    activeIncidents: 234,
    responseTime: '< 2 mins',
    unitsAvailable: '8/10 cameras',
    status: 'operational',
    highlight: 'E-Challan collection: ₹2.34L today',
  },
  {
    name: 'Sanitation Control',
    role: 'sanitation',
    color: '#059669',
    activeIncidents: 12,
    responseTime: '35 mins avg',
    unitsAvailable: '98/100 trucks',
    status: 'warning',
    highlight: '2 trucks idle > 20 mins in Ward 12',
  },
];

export const CITY_KPIS = {
  safetyIndex: { value: '87/100', trend: 'up' as const, label: '↑3 vs last week' },
  trafficEfficiency: { value: '92/100', trend: 'up' as const, label: 'Smooth flow' },
  cleanlinessScore: { value: '95/100', trend: 'up' as const, label: '96% collection rate' },
  citizenSatisfaction: { value: '4.2/5.0', trend: 'same' as const, label: '1,234 surveys' },
};

export const RECENT_CROSS_ALERTS = [
  '🔴 Weapon detected at Kranti Chowk — Police QRT-01 dispatched',
  '🔵 ANPR Hit: MH-12-XY-9876 STOLEN — RTO + Police alerted',
  '🟢 Illegal dumping at CIDCO N-6 — Ghanta Gaadi SWM-405 en route',
  '🟠 Pothole cluster on Railway Station Road — Road repair cell notified',
  '🔴 Vehicle collision on Jalna Road Flyover — Ambulance + Police en route',
  '🟢 Truck SWM-118 idle 22 mins in Ward 12 — Supervisor alerted',
];
