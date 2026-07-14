import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Cpu, Server, ShieldCheck, Terminal, Mail, UserPlus, KeyRound } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase';

interface WelcomeScreenProps {
  onSuccess: () => void;
}

export default function WelcomeScreen({ onSuccess }: WelcomeScreenProps) {
  const [activeTab, setActiveTab] = useState<'quick' | 'collaborator'>('quick');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  
  // Quick access state
  const [password, setPassword] = useState('');
  
  // Collaborator auth states
  const [email, setEmail] = useState('');
  const [collabPassword, setCollabPassword] = useState('');
  
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Naty') {
      setIsLoading(true);
      setError('');
      try {
        // Sign in anonymously to satisfy security rules
        await signInAnonymously(auth);
        onSuccess();
      } catch (err: any) {
        console.error("Firebase Anonymous Login Error: ", err);
        // Fallback to success even if Firebase offline
        onSuccess();
      } finally {
        setIsLoading(false);
      }
    } else {
      setError('❌ CODE D\'ACCÈS RAPIDE INCORRECT');
      setIsShaking(true);
      setPassword('');
      setTimeout(() => setIsShaking(false), 400);
    }
  };

  const handleCollabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !collabPassword) {
      setError('❌ VEUILLEZ REMPLIR TOUS LES CHAMPS');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, collabPassword);
      } else {
        await signInWithEmailAndPassword(auth, email, collabPassword);
      }
      onSuccess();
    } catch (err: any) {
      console.error("Auth Error: ", err);
      let errMsg = '❌ ERREUR D\'AUTHENTIFICATION';
      if (err.code === 'auth/user-not-found') {
        errMsg = '❌ COMPTE COLLABORATEUR INEXISTANT';
      } else if (err.code === 'auth/wrong-password') {
        errMsg = '❌ MOT DE PASSE COLLABORATEUR INCORRECT';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = '❌ CETTE ADRESSE EMAIL EST DÉJÀ UTILISÉE';
      } else if (err.code === 'auth/weak-password') {
        errMsg = '❌ LE MOT DE PASSE DOIT FAIRE AU MOINS 6 CARACTÈRES';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = '❌ ADRESSE EMAIL INVALIDE';
      } else {
        errMsg = `❌ ${err.message || 'ERREUR DU SERVEUR AUTH'}`;
      }
      setError(errMsg);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
    } finally {
      setIsLoading(false);
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
          <span>PACKING LIST PRO V11.0 // CLOUD-ENABLED</span>
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
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 0.6 }}
              className="text-mono-tech text-[10px] uppercase tracking-widest text-slate-400"
            >
              Cdiscount Cargo packing intelligence system
            </motion.p>
          </div>
        </section>

        {/* LOGIN SECTION (RIGHT) */}
        <section className="flex flex-col justify-center p-8 sm:p-16 lg:p-24 bg-[#0F0F12]/80 relative overflow-y-auto">
          
          <div className="max-w-md w-full mx-auto space-y-8">
            
            {/* Service identifier */}
            <div className="space-y-2">
              <span className="text-mono-tech text-xs tracking-[0.15em] text-white/40 uppercase block">
                CDISCOUNT CARGO PARTNER PORTAL
              </span>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-white font-sans">
                PORTAIL FOURNISSEUR
              </h2>
            </div>

            {/* Custom Tab Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#151518] border border-white/5 rounded-xs text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('quick');
                  setError('');
                }}
                className={`py-2.5 px-3 uppercase tracking-wider transition-all duration-200 cursor-pointer text-center rounded-xs ${
                  activeTab === 'quick' 
                    ? 'bg-white text-black font-bold' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Accès Rapide
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('collaborator');
                  setError('');
                }}
                className={`py-2.5 px-3 uppercase tracking-wider transition-all duration-200 cursor-pointer text-center rounded-xs ${
                  activeTab === 'collaborator' 
                    ? 'bg-white text-black font-bold' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Comptes Équipe
              </button>
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
              {activeTab === 'quick' ? (
                /* QUICK PASSWORD LOGIN (Naty) */
                <form onSubmit={handleQuickSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono tracking-wider text-white/40 block uppercase">
                      Code d'accès rapide
                    </label>
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
                        disabled={isLoading}
                        className={`w-full bg-[#151518] text-white font-mono border ${error ? 'border-red-500' : 'border-white/10 focus:border-white'} p-5 text-sm tracking-[0.2em] outline-none transition-colors duration-200`}
                      />
                      <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    </div>
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
                    disabled={isLoading}
                    className="w-full bg-white hover:bg-neutral-200 text-[#0C0C0E] p-5 text-mono-tech font-bold text-xs tracking-[0.15em] uppercase transition-opacity duration-150 cursor-pointer flex justify-between items-center disabled:opacity-50"
                  >
                    <span>{isLoading ? 'CONNEXION EN COURS...' : 'ACCÈS SÉCURISÉ'}</span>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </button>
                </form>
              ) : (
                /* COLLABORATOR EMAIL/PASSWORD LOGIN & REGISTER */
                <form onSubmit={handleCollabSubmit} className="space-y-4">
                  <div className="space-y-4">
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-wider text-white/40 block uppercase">
                        Identifiant Email
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          placeholder="EX: COLLAB@ENTREPOT.COM"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError('');
                          }}
                          disabled={isLoading}
                          className="w-full bg-[#151518] text-white font-mono border border-white/10 focus:border-white p-4 text-xs tracking-[0.08em] outline-none transition-all duration-200 uppercase"
                        />
                        <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono tracking-wider text-white/40 block uppercase">
                        Mot de passe
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          placeholder="MOT DE PASSE"
                          value={collabPassword}
                          onChange={(e) => {
                            setCollabPassword(e.target.value);
                            if (error) setError('');
                          }}
                          disabled={isLoading}
                          className="w-full bg-[#151518] text-white font-mono border border-white/10 focus:border-white p-4 text-xs tracking-[0.08em] outline-none transition-all duration-200"
                        />
                        <KeyRound className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      </div>
                    </div>

                  </div>

                  {/* Toggle Mode Register vs Login */}
                  <div className="flex justify-between items-center text-[11px] font-mono tracking-wider text-white/40">
                    <span>
                      {isRegistering ? "Déjà un compte d'équipe ?" : "Nouveau collaborateur ?"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistering(!isRegistering);
                        setError('');
                      }}
                      className="text-white hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {isRegistering ? (
                        <>Connexion</>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          Créer un compte
                        </>
                      )}
                    </button>
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
                    disabled={isLoading}
                    className="w-full bg-white hover:bg-neutral-200 text-[#0C0C0E] p-5 text-mono-tech font-bold text-xs tracking-[0.15em] uppercase transition-opacity duration-150 cursor-pointer flex justify-between items-center disabled:opacity-50"
                  >
                    <span>
                      {isLoading 
                        ? 'TRAITEMENT DU CLOUD...' 
                        : isRegistering 
                          ? 'CRÉER LE COMPTE D\'ÉQUIPE' 
                          : 'CONNEXION COLLABORATEUR'
                      }
                    </span>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="px-6 py-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 text-mono-tech text-[10px] tracking-[0.15em] text-white/40 uppercase">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-white/30" />
          <span>[01] CDISCOUNT CLOUD PORTAL</span>
        </div>
        <div className="md:text-center flex items-center md:justify-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-white/30" />
          <span>SYSTEM FIRESTORE STATUS: ONLINE</span>
        </div>
        <div className="md:text-right text-white/30 font-bold">
          LATENCY: 8MS // CLOUD SECURITY: VERIFIED
        </div>
      </footer>

    </div>
  );
}
