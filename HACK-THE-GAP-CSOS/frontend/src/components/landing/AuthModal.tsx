'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield } from 'lucide-react';
import type { CSOSRole } from '@/lib/types';
import { ROLE_THEMES } from '@/lib/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLES: CSOSRole[] = ['police', 'rto', 'sanitation', 'god-view'];

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [operatorId, setOperatorId] = useState('');
  const [passkey, setPasskey] = useState('');
  const [selectedRole, setSelectedRole] = useState<CSOSRole>('god-view');
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorId || !passkey) return;
    
    // Set cookies similar to the original login page
    const maxAge = 60 * 60 * 8;
    document.cookie = `csos_role=${selectedRole}; path=/; max-age=${maxAge}`;
    document.cookie = `csos_operator=${encodeURIComponent(operatorId)}; path=/; max-age=${maxAge}`;
    
    // Redirect to the chosen role dashboard
    window.location.href = selectedRole === 'god-view' ? '/god-view' : `/${selectedRole}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} // cubic-bezier approx
              className="pointer-events-auto relative w-full max-w-[450px] p-8 md:p-10 rounded-[24px] shadow-[0_8px_32px_rgba(0,100,255,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
              style={{
                background: 'rgba(15, 30, 60, 0.3)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.125)',
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="auth-title"
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-6 w-6 text-[#00d9ff]" />
                <h2 id="auth-title" className="text-2xl font-bold text-white">Secure Access Portal</h2>
              </div>
              
              <div className="w-[60px] h-[3px] bg-gradient-to-r from-[#00d9ff] to-[#0066ff] mb-8" />

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-[0.9rem] font-medium text-white/80 mb-2">
                    Operator ID
                  </label>
                  <input
                    type="text"
                    required
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    placeholder="Enter your credentials"
                    className="w-full bg-white/5 border border-[#00d9ff]/30 rounded-xl px-[18px] py-[14px] text-white text-base outline-none focus:border-[#00d9ff] focus:shadow-[0_0_20px_rgba(0,217,255,0.3)] transition-all placeholder:text-white/30 backdrop-blur-md"
                  />
                </div>

                <div>
                  <label className="block text-[0.9rem] font-medium text-white/80 mb-2">
                    Passkey
                  </label>
                  <input
                    type="password"
                    required
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-white/5 border border-[#00d9ff]/30 rounded-xl px-[18px] py-[14px] text-white text-base outline-none focus:border-[#00d9ff] focus:shadow-[0_0_20px_rgba(0,217,255,0.3)] transition-all placeholder:text-white/30 backdrop-blur-md"
                  />
                </div>
                
                <div>
                  <label className="block text-[0.9rem] font-medium text-white/80 mb-2">
                    Access Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as CSOSRole)}
                    className="w-full bg-white/5 border border-[#00d9ff]/30 rounded-xl px-[18px] py-[14px] text-white text-base outline-none focus:border-[#00d9ff] focus:shadow-[0_0_20px_rgba(0,217,255,0.3)] transition-all backdrop-blur-md appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.6)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px' }}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role} className="bg-slate-900 text-white">
                        {ROLE_THEMES[role].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-1">
                  <a href="#" className="text-[0.9rem] text-[#00d9ff] hover:text-[#00ff88] hover:underline transition-all">
                    Forgot Password?
                  </a>
                </div>

                <button
                  type="submit"
                  className="w-full p-4 mt-2 rounded-xl text-white text-[1.1rem] font-semibold border-none cursor-pointer transition-all hover:scale-[1.02] hover:shadow-[0_8px_24px_rgba(0,217,255,0.4)] hover:brightness-120"
                  style={{ background: 'linear-gradient(135deg, #0066ff, #00d9ff)' }}
                >
                  Authorize Entry
                </button>
                
                <div className="text-center mt-4">
                  <a href="#" className="text-[0.9rem] text-[#00d9ff] hover:text-[#00ff88] hover:underline transition-all inline-block">
                    Request Access
                  </a>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
