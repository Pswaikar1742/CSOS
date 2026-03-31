'use client';

import { useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from '@tsparticles/engine';

export default function ParticleBackdrop() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  const options = useMemo<ISourceOptions>(
    () => ({
      background: { color: { value: 'transparent' } },
      fpsLimit: 60,
      particles: {
        color: { value: ['#1d4ed8', '#0ea5e9', '#10b981'] },
        links: {
          color: '#22c55e',
          distance: 130,
          enable: true,
          opacity: 0.25,
          width: 1,
        },
        move: {
          enable: true,
          speed: 1.1,
          outModes: { default: 'bounce' },
        },
        number: {
          value: 70,
          density: { enable: true, area: 900 },
        },
        opacity: { value: 0.35 },
        size: { value: { min: 1, max: 3 } },
      },
      detectRetina: true,
      interactivity: {
        events: {
          onHover: {
            enable: true,
            mode: 'grab',
          },
          resize: {
            enable: true,
          },
        },
        modes: {
          grab: {
            distance: 180,
            links: { opacity: 0.45 },
          },
        },
      },
    }),
    []
  );

  if (!ready) {
    return null;
  }

  return <Particles id="csos-particles" className="absolute inset-0" options={options} />;
}
