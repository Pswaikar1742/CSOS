'use client';

import { MapPin, ExternalLink } from 'lucide-react';

const COVERAGE_ZONES = [
  'CIDCO N-6 • Sanitation Watch',
  'Kranti Chowk • Night Junction',
  'Aurangpura Market • Public Safety',
  'Beed Bypass • Highway Risk',
  'Railway Station Road • Pothole Watch',
];

const QUICK_LINKS = [
  { label: 'Documentation', href: '#' },
  { label: 'GitHub Repository', href: '#' },
  { label: 'API Reference', href: '#' },
  { label: 'Contact', href: '#' },
];

export default function Footer() {
  return (
    <footer
      className="relative z-10"
      style={{
        background: 'rgba(0, 20, 40, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0, 217, 255, 0.2)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-8 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Column 1: About */}
          <div className="max-w-[400px]">
            <h3 className="text-[1.5rem] font-bold text-[#00ff88] mb-4">About The Project</h3>
            <p className="text-[0.95rem] leading-[1.7] text-white/70">
              CSOS is built for city command operations where each alert becomes an actionable incident. 
              The system ingests vision detectors, verifies signal quality, maps incidents to real 
              Aurangabad localities, and pushes role-wise workflows for enforcement and resolution.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-[1.5rem] font-bold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="inline-flex items-center gap-2 text-white/70 text-[0.95rem] leading-[2.2] hover:text-[#00d9ff] hover:underline transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Coverage */}
          <div>
            <h3 className="text-[1.5rem] font-bold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#00d9ff]" />
              City Map Coverage
            </h3>
            <ul className="space-y-1">
              {COVERAGE_ZONES.map((zone) => (
                <li key={zone} className="text-[0.9rem] leading-[2] text-white/70">
                  {zone}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <p className="text-[0.85rem] text-white/50">
            © 2024 CSOS v2.0 | Chhatrapati Sambhajinagar
          </p>
        </div>
      </div>
    </footer>
  );
}
