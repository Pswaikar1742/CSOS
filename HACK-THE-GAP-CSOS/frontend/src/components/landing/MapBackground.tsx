'use client';

/**
 * MapBackground — Neon-styled interactive map background for the landing page.
 *
 * - Dark MapLibre map that subtly shifts when the user moves their cursor
 * - Neon gradient overlays for depth
 * - Animated scanline sweep effect
 * - Grid overlay for that "command center terminal" aesthetic
 * - NO floating label — the map movement IS the interaction
 */

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const CENTER: [number, number] = [75.3433, 19.8762]; // Chhatrapati Sambhajinagar
const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json';

export default function MapBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: CENTER,
      zoom: 12.5,
      pitch: 55,
      bearing: -20,
      attributionControl: false,
      dragPan: false,
      scrollZoom: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
      keyboard: false,
    });

    mapRef.current = map;

    // Mouse → map parallax: subtle pan/tilt on cursor movement
    const onMove = (event: MouseEvent) => {
      const nx = event.clientX / window.innerWidth - 0.5;   // -0.5 to 0.5
      const ny = event.clientY / window.innerHeight - 0.5;

      map.easeTo({
        center: [CENTER[0] + nx * 0.025, CENTER[1] - ny * 0.018],
        bearing: -20 + nx * 10,
        pitch: 55 + Math.abs(ny) * 12,
        duration: 400,
        essential: true,
      });
    };

    window.addEventListener('mousemove', onMove);

    return () => {
      window.removeEventListener('mousemove', onMove);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Map container — slightly higher opacity for visibility */}
      <div ref={containerRef} className="h-full w-full opacity-60" />

      {/* Vignette: dark edges, clear center */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Top/bottom fade to pure black */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />

      {/* Subtle cyan tint on the sides */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(0,102,255,0.06) 0%, transparent 30%, transparent 70%, rgba(0,217,255,0.06) 100%)',
        }}
      />

      {/* Animated scanline sweep — a vertical bar that sweeps left-to-right */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute top-0 bottom-0 w-[2px] opacity-30"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, #00d9ff 50%, transparent 100%)',
            filter: 'blur(2px)',
            animation: 'scanline-sweep 8s linear infinite',
          }}
        />
      </div>

      {/* Horizontal scanlines (CRT aesthetic) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,217,255,0.2) 2px, rgba(0,217,255,0.2) 4px)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* Grid overlay — command center feel */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,102,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,102,255,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Two decorative pulse dots on the map — simulating active nodes */}
      <div className="pointer-events-none absolute" style={{ top: '40%', left: '45%' }}>
        <span className="block w-2 h-2 rounded-full bg-[#00d9ff] shadow-[0_0_8px_#00d9ff,0_0_20px_#0066ff] animate-ping opacity-60" />
      </div>
      <div className="pointer-events-none absolute" style={{ top: '55%', left: '60%' }}>
        <span className="block w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88,0_0_20px_#059669] animate-ping opacity-40" style={{ animationDelay: '1.5s' }} />
      </div>
      <div className="pointer-events-none absolute" style={{ top: '35%', left: '55%' }}>
        <span className="block w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444,0_0_16px_#dc2626] animate-ping opacity-50" style={{ animationDelay: '3s' }} />
      </div>

      {/* CSS for the scanline sweep animation */}
      <style jsx>{`
        @keyframes scanline-sweep {
          0% { left: -2px; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
