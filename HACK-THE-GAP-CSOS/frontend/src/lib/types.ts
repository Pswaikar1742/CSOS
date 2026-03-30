// ─── CSOS v2.0 Role Types & Theme Configuration ───

export type CSOSRole = 'police' | 'rto' | 'sanitation' | 'god-view';

export interface RoleTheme {
  label: string;
  color: string;         // Tailwind color name (e.g. 'red')
  borderClass: string;
  textClass: string;
  bgAccentClass: string;
  glowShadow: string;    // CSS box-shadow value
  hoverBorderClass: string;
  dispatchAction: string; // Role-specific HITL button label
  markerColor: string;    // Hex color for map markers
}

export const ROLE_THEMES: Record<CSOSRole, RoleTheme> = {
  police: {
    label: 'POLICE COMMAND',
    color: 'red',
    borderClass: 'border-red-500/50',
    textClass: 'text-red-500',
    bgAccentClass: 'bg-red-500',
    glowShadow: '0 0 15px rgba(239,68,68,0.4)',
    hoverBorderClass: 'hover:border-red-400',
    dispatchAction: '[DISPATCH BEAT MARSHAL]',
    markerColor: '#ef4444',
  },
  rto: {
    label: 'RTO COMMAND',
    color: 'blue',
    borderClass: 'border-blue-500/50',
    textClass: 'text-blue-500',
    bgAccentClass: 'bg-blue-500',
    glowShadow: '0 0 15px rgba(59,130,246,0.4)',
    hoverBorderClass: 'hover:border-blue-400',
    dispatchAction: '[ISSUE E-CHALLAN]',
    markerColor: '#3b82f6',
  },
  sanitation: {
    label: 'SANITATION CONTROL',
    color: 'emerald',
    borderClass: 'border-emerald-500/50',
    textClass: 'text-emerald-500',
    bgAccentClass: 'bg-emerald-500',
    glowShadow: '0 0 15px rgba(16,185,129,0.4)',
    hoverBorderClass: 'hover:border-emerald-400',
    dispatchAction: '[DISPATCH GHANTA GAADI]',
    markerColor: '#10b981',
  },
  'god-view': {
    label: 'CITY COMMAND',
    color: 'purple',
    borderClass: 'border-purple-500/50',
    textClass: 'text-purple-500',
    bgAccentClass: 'bg-purple-500',
    glowShadow: '0 0 15px rgba(168,85,247,0.4)',
    hoverBorderClass: 'hover:border-purple-400',
    dispatchAction: 'DISPATCH UNIT',
    markerColor: '#a855f7',
  },
} as const;

// Allowed route prefixes per role
export const ROLE_ROUTES: Record<CSOSRole, string[]> = {
  police: ['/police'],
  rto: ['/rto'],
  sanitation: ['/sanitation'],
  'god-view': ['/police', '/rto', '/sanitation', '/god-view'],
};

export const ROLE_HOME: Record<CSOSRole, string> = {
  police: '/police',
  rto: '/rto',
  sanitation: '/sanitation',
  'god-view': '/god-view',
};
