'use client';

/**
 * CSOS v2.0 — Landing Page
 *
 * Composes: MapBackground, Hero, PlatformInfo, Footer, AuthModal
 * Design: Dark mission-control aesthetic with neon cyan/blue accents
 */

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Hero from '@/components/landing/Hero';
import PlatformInfo from '@/components/landing/PlatformInfo';
import Footer from '@/components/landing/Footer';
import AuthModal from '@/components/landing/AuthModal';

// Dynamic import for the map to avoid SSR issues with MapLibre
const MapBackground = dynamic(() => import('@/components/landing/MapBackground'), {
  ssr: false,
});

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);

  // ESC key closes modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && authOpen) {
        setAuthOpen(false);
      }
    },
    [authOpen],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Optional: cursor trail effect
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const dot = document.createElement('div');
      dot.className = 'cursor-trail';
      dot.style.left = `${e.pageX}px`;
      dot.style.top = `${e.pageY}px`;
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), 500);
    };

    // Throttle to ~30fps to avoid DOM spam
    let last = 0;
    const throttled = (e: MouseEvent) => {
      const now = Date.now();
      if (now - last < 33) return;
      last = now;
      onMove(e);
    };

    window.addEventListener('mousemove', throttled);
    return () => window.removeEventListener('mousemove', throttled);
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      {/* Fixed interactive map background */}
      <MapBackground />

      {/* Content layers above the map */}
      <div className="relative z-10">
        <Hero onOpenAuth={() => setAuthOpen(true)} />
        <PlatformInfo />
        <Footer />
      </div>

      {/* Glassmorphic Auth Modal */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
