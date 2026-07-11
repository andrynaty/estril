import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Cpu, Server, ShieldCheck, Terminal } from 'lucide-react';

interface WelcomeScreenProps {
  onSuccess: () => void;
}

export default function WelcomeScreen({ onSuccess }: WelcomeScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (password === 'Naty') {
      onSuccess();
    } else {
      setError('❌ MOT DE PASSE INCORRECT');
      setIsShaking(true);
      setPassword('');
      setTimeout(() => setIsShaking(false), 400);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0C0C0E] text-white flex flex-col justify-between z-[9999] overflow-hidden select-none font-sans">
      {/* Inline styling for custom technical backgrounds and fonts */}
      <style>{`
        .tech-grid {
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .text-syne {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
        }
        .text-mono-tech {
          font-family: 'JetBrains Mono', monospace;
        }
      `}</style>

      {/* HEADER */}
      <header className="px-6 py-4 border-b border-white/10 flex justify-between items-center text-mono-tech text-[10px] tracking-[0.2em] text-white/40 uppercase">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-white/50" />
          <span>TERMINAL.ACCESS.ID: 9482-P</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>PACKING LIST PRO V10.0</span>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 items-stretch min-h-0">
        
        {/* HERO SECTION (LEFT) */}
        <section className="relative flex flex-col justify-center p-8 sm:p-16 lg:p-24 border-r-0 lg:border-r border-white/10 overflow-hidden">
          {/* Subtle Grid overlay */}
          <div className="absolute inset-0 tech-grid opacity-60 pointer-events-none" />
          
          <div className="relative z-10 space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-syne text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.9] tracking-[-0.04em] uppercase text-white"
            >
              ANDRY<br />NANTENAINA
            </motion.h1>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ delay: 0.4, duration: 1 }}
              className="w-24 h-px bg-white"
            />
          </div>
        </section>

        {/* LOGIN SECTION (RIGHT) */}
        <section className="flex flex-col justify-center p-8 sm:p-16 lg:p-24 bg-[#0F0F12]/80 relative">
          
          <div className="max-w-md w-full mx-auto space-y-12">
            
            {/* Service identifier */}
            <div className="space-y-2">
              <span className="text-mono-tech text-xs tracking-[0.15em] text-white/40 uppercase block">
                CDISCOUNT CARGO PARTNER PORTAL
              </span>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-white font-sans">
                PORTAIL FOURNISSEUR
              </h2>
            </div>

            {/* Interactive Form */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={
                isShaking
                  ? { x: [-8, 8, -8, 8, -4, 4, 0], scale: [1, 0.99, 1.01, 1], transition: { duration: 0.4 } }
                  : { opacity: 1, scale: 1 }
              }
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type="password"
                    placeholder="MOT DE PASSE"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    autoFocus
                    className={`w-full bg-[#151518] text-white font-mono border ${error ? 'border-red-500' : 'border-white/10 focus:border-white'} p-5 text-sm tracking-[0.2em] outline-none transition-colors duration-200`}
                  />
                  <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                </div>

                {/* Error presentation */}
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-red-500 text-mono-tech text-[11px] tracking-wider uppercase font-semibold"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Access Action CTA */}
                <button
                  type="submit"
                  className="w-full bg-white hover:bg-neutral-200 text-[#0C0C0E] p-5 text-mono-tech font-bold text-xs tracking-[0.15em] uppercase transition-opacity duration-150 cursor-pointer flex justify-between items-center"
                >
                  <span>ACCÈS SÉCURISÉ</span>
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </button>
              </form>
            </motion.div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="px-6 py-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 text-mono-tech text-[10px] tracking-[0.15em] text-white/40 uppercase">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-white/30" />
          <span>[01] CDISCOUNT CARGO PARTNER PORTAL</span>
        </div>
        <div className="md:text-center flex items-center md:justify-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-white/30" />
          <span>SYSTEM STATUS: READY</span>
        </div>
        <div className="md:text-right text-white/30 font-bold">
          LATENCY: 12MS // ENCRYPTION: AES-256
        </div>
      </footer>

    </div>
  );
}
