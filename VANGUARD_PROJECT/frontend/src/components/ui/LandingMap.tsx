'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const CENTER: [number, number] = [75.3433, 19.8762];
const STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.stadiamaps.com/styles/alidade_smooth.json';

export default function LandingMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: CENTER,
      zoom: 11.8,
      pitch: 45,
      bearing: -14,
      attributionControl: false,
      dragPan: false,
      scrollZoom: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
      keyboard: false,
    });

    map.on('load', () => {
      const loadedMap = map as maplibregl.Map & {
        setFog?: (options: {
          color: string;
          'high-color': string;
          'horizon-blend': number;
        }) => void;
      };

      if (typeof loadedMap.setFog === 'function') {
        loadedMap.setFog({
          color: 'rgb(225, 240, 255)',
          'high-color': 'rgb(190, 225, 255)',
          'horizon-blend': 0.15,
        });
      }
    });

    mapRef.current = map;

    const onMove = (event: MouseEvent) => {
      const normalizedX = event.clientX / window.innerWidth - 0.5;
      const normalizedY = event.clientY / window.innerHeight - 0.5;

      map.easeTo({
        center: [CENTER[0] + normalizedX * 0.02, CENTER[1] - normalizedY * 0.014],
        bearing: -14 + normalizedX * 7,
        pitch: 45 + Math.abs(normalizedY) * 8,
        duration: 280,
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
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-900/35 via-transparent to-emerald-900/25" />
    </div>
  );
}
