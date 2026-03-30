'use client';

import { motion } from 'framer-motion';
import { Shield, Camera, Truck } from 'lucide-react';

const FEATURES = ['MapLibre Geospatial Layer', 'Realtime Neural Stream', 'HITL Verified Dispatch'];

const PILLARS = [
  {
    id: 'ps1',
    icon: Shield,
    title: 'PS1 • POLICE',
    desc: 'Weapon, public disturbance, and hazard incidents trigger Beat Marshal dispatch and command escalation.',
  },
  {
    id: 'ps2',
    icon: Camera,
    title: 'PS2 • RTO / ANPR',
    desc: 'ANPR + pothole detections issue digital challan flows and geo-tagged road repair alerts in near real-time.',
  },
  {
    id: 'ps3',
    icon: Truck,
    title: 'PS3 • SANITATION',
    desc: 'Illegal dumping events trigger Ghanta Gaadi routing with ward-level audit traceability.',
  },
];

export default function PlatformInfo() {
  return (
    <section className="relative z-10 flex flex-col items-center px-4 md:px-8 py-20 pointer-events-none">
      
      {/* Description Block */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-[1200px] p-8 md:p-16 rounded-[24px] pointer-events-auto"
        style={{
          background: 'rgba(10, 20, 40, 0.6)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(0, 217, 255, 0.15)',
        }}
      >
        <p className="text-[1.1rem] md:text-[1.25rem] leading-[1.8] text-white/85 text-center max-w-[900px] mx-auto font-medium">
          A unified AI command center connecting Police, RTO, Sanitation, and God-View control through live video intelligence, geospatial situational awareness, and human-in-the-loop dispatch workflows.
        </p>

        {/* Feature Pills */}
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          {FEATURES.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="px-5 py-2 rounded-full font-medium text-[0.9rem] text-[#00d9ff]"
              style={{
                background: 'rgba(0, 217, 255, 0.08)',
                border: '1px solid rgba(0, 217, 255, 0.3)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {feature}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Three Pillars Grid */}
      <div className="w-full max-w-[1200px] mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 pointer-events-auto">
        {PILLARS.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <motion.div
              key={pillar.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: 0.2 + idx * 0.15 }}
              whileHover={{ 
                y: -8, 
                borderColor: 'rgba(0, 217, 255, 0.6)',
                boxShadow: '0 12px 40px rgba(0, 100, 255, 0.3)'
              }}
              className="p-8 rounded-2xl transition-all duration-400 cursor-default"
              style={{
                background: 'rgba(0, 40, 80, 0.4)',
                border: '1px solid rgba(0, 217, 255, 0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-[#00d9ff]/10 flex items-center justify-center mb-6">
                <Icon className="w-6 h-6 text-[#00d9ff]" />
              </div>
              <h3 className="text-[1.1rem] font-semibold text-[#00d9ff] mb-3 tracking-wide">
                {pillar.title}
              </h3>
              <p className="text-white/70 leading-relaxed text-[0.95rem]">
                {pillar.desc}
              </p>
            </motion.div>
          );
        })}
      </div>

    </section>
  );
}
