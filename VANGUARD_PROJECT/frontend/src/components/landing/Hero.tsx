'use client';

import { motion } from 'framer-motion';

interface HeroProps {
  onOpenAuth: () => void;
}

export default function Hero({ onOpenAuth }: HeroProps) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 md:px-8 pointer-events-none">
      
      {/* Auth Button at Top Right */}
      <div className="absolute top-8 right-8 z-50 pointer-events-auto">
        <button 
          onClick={onOpenAuth}
          className="px-7 py-3 rounded-xl text-white text-base font-medium transition-all duration-300 hover:scale-105 group"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 217, 255, 0.3)',
          }}
        >
          <span className="group-hover:text-[#00d9ff] transition-colors">Auth Login →</span>
        </button>
      </div>

      <div className="z-10 text-center flex flex-col items-center">
        {/* Main Title & Version relative wrapper */}
        <div className="relative inline-flex items-start justify-center">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} // cubic-bezier
            className="text-[clamp(6rem,15vw,18rem)] font-black leading-none tracking-[-0.02em] landing-text-gradient landing-title-shadow uppercase"
          >
            CSOS
          </motion.h1>
          
          {/* Version Badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="absolute top-[5%] -right-[15%] text-[#00ff88] text-[clamp(1.5rem,4vw,3rem)] font-semibold"
          >
            v2.0
          </motion.div>
        </div>

        {/* Long Form Name */}
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-[clamp(0.9rem,2vw,2rem)] tracking-[0.3em] text-white/70 mt-4 uppercase text-center max-w-[90vw]"
        >
          Chhatrapati Sambhajinagar Operating System
        </motion.h2>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="italic text-[clamp(0.9rem,1.5vw,1.2rem)] text-white/60 mt-4 text-center"
        >
          One city. One command graph. Multi-agency response in real-time.
        </motion.p>
      </div>
      
    </section>
  );
}
