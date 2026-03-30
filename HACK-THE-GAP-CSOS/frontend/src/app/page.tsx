'use client';

import { ArrowRight, MapPinned, Shield, Sparkles } from 'lucide-react';
import Link from 'next/link';
import LandingMap from '@/components/ui/LandingMap';
import ParticleBackdrop from '@/components/ui/ParticleBackdrop';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-sky-900 to-emerald-900 text-white">
      <section className="relative min-h-[86vh] overflow-hidden">
        <LandingMap />
        <ParticleBackdrop />

        <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-white/80">
            <Shield className="h-4 w-4" />
            CSOS v2.0
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition hover:bg-white/20"
          >
            Auth Login
            <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[74vh] max-w-4xl flex-col items-center justify-center px-6 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.2em]">
            <Sparkles className="h-3.5 w-3.5" />
            CHHATRAPATI SAMBHAJINAGAR OPERATING SYSTEM
          </div>
          <h1 className="text-4xl font-bold tracking-[0.16em] md:text-6xl">
            CSOS <span className="text-emerald-300">v2.0</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-blue-100 md:text-lg">
            “One city. One command graph. Multi-agency response in real-time.”
          </p>
          <p className="mt-6 max-w-3xl text-sm text-sky-100/90 md:text-base">
            A unified AI command center connecting Police, RTO, Sanitation, and God-View control through live video intelligence,
            geospatial situational awareness, and human-in-the-loop dispatch workflows.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-white/80">
            <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1">MapLibre Geospatial Layer</span>
            <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1">Realtime Neural Stream</span>
            <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1">HITL Verified Dispatch</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 md:px-10">
        <h2 className="text-2xl font-bold tracking-wide text-emerald-200">About The Project</h2>
        <p className="mt-4 max-w-4xl text-sm leading-relaxed text-blue-100/90 md:text-base">
          CSOS is built for city command operations where each alert becomes an actionable incident. The system ingests vision detections,
          verifies signal quality, maps incidents to real Aurangabad localities, and pushes role-wise workflows for enforcement and resolution.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <h3 className="text-sm font-semibold tracking-[0.12em] text-emerald-200">PS1 • POLICE</h3>
            <p className="mt-2 text-sm text-blue-100/90">Weapon, public disturbance, and hazard incidents trigger Beat Marshal dispatch and command escalation.</p>
          </article>
          <article className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <h3 className="text-sm font-semibold tracking-[0.12em] text-sky-200">PS2 • RTO / ANPR</h3>
            <p className="mt-2 text-sm text-blue-100/90">ANPR + pothole detections issue digital challan flows and geo-tagged road repair alerts in near real-time.</p>
          </article>
          <article className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <h3 className="text-sm font-semibold tracking-[0.12em] text-teal-200">PS3 • SANITATION</h3>
            <p className="mt-2 text-sm text-blue-100/90">Illegal dumping events trigger Ghanta Gaadi routing with ward-level audit traceability.</p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 md:px-10">
        <div className="mb-5 flex items-center gap-2 text-emerald-200">
          <MapPinned className="h-4 w-4" />
          <h2 className="text-2xl font-bold tracking-wide">City Map Coverage</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <h3 className="text-sm font-semibold tracking-wide">CIDCO N-6 • Sanitation Watch</h3>
            <p className="mt-2 text-sm text-blue-100/90">Live node for garbage violation detection and municipal fleet dispatch orchestration.</p>
          </article>
          <article className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <h3 className="text-sm font-semibold tracking-wide">Kranti Chowk • Night Junction</h3>
            <p className="mt-2 text-sm text-blue-100/90">Low-light collision and traffic anomaly zone for accident response and RTO correlation.</p>
          </article>
          <article className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <h3 className="text-sm font-semibold tracking-wide">Aurangpura Market • Public Safety</h3>
            <p className="mt-2 text-sm text-blue-100/90">Altercation and weapon-risk zone connected to police command verification queues.</p>
          </article>
          <article className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <h3 className="text-sm font-semibold tracking-wide">Beed Bypass • Highway Risk</h3>
            <p className="mt-2 text-sm text-blue-100/90">Accident and ANPR bridge use-case for inter-agency response during roadway incidents.</p>
          </article>
          <article className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <h3 className="text-sm font-semibold tracking-wide">Railway Station Road • Pothole Watch</h3>
            <p className="mt-2 text-sm text-blue-100/90">Dedicated pothole detection stream geotags road-surface hazards and pushes RTO + Commissioner alerts.</p>
          </article>
        </div>
      </section>
      </div>
  );
}
