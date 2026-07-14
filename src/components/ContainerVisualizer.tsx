import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Layers, 
  RotateCcw, 
  Play, 
  Pause, 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  ChevronRight,
  TrendingUp,
  Scale
} from 'lucide-react';
import { ColorResult, ColorConfig } from '../types';

interface ContainerVisualizerProps {
  totalVolume: number;
  totalWeight: number;
  results: ColorResult[];
  darkMode: boolean;
}

interface ContainerSpec {
  id: string;
  name: string;
  maxVolume: number; // m³
  maxWeight: number; // kg
  length: number;    // meters
  width: number;     // meters
  height: number;    // meters
}

const CONTAINER_SPECS: ContainerSpec[] = [
  {
    id: '20ft_gp',
    name: '20ft GP (Standard)',
    maxVolume: 33.0,
    maxWeight: 28200,
    length: 5.9,
    width: 2.35,
    height: 2.39
  },
  {
    id: '40ft_gp',
    name: '40ft GP (Standard)',
    maxVolume: 67.0,
    maxWeight: 26800,
    length: 12.03,
    width: 2.35,
    height: 2.39
  },
  {
    id: '40ft_hc',
    name: '40ft HC (High Cube)',
    maxVolume: 76.0,
    maxWeight: 28600,
    length: 12.03,
    width: 2.35,
    height: 2.69
  }
];

export default function ContainerVisualizer({
  totalVolume,
  totalWeight,
  results,
  darkMode
}: ContainerVisualizerProps) {
  // Pre-select recommended container
  const recommendedSpec = useMemo(() => {
    if (totalVolume > 67.0) {
      return CONTAINER_SPECS.find(s => s.id === '40ft_hc') || CONTAINER_SPECS[2];
    } else if (totalVolume > 33.0) {
      return CONTAINER_SPECS.find(s => s.id === '40ft_gp') || CONTAINER_SPECS[1];
    }
    return CONTAINER_SPECS[0];
  }, [totalVolume]);

  const [selectedSpec, setSelectedSpec] = useState<ContainerSpec>(recommendedSpec);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Sync state if recommendation changes
  useEffect(() => {
    setSelectedSpec(recommendedSpec);
  }, [recommendedSpec]);

  // Determine individual box representations based on results
  const cargoBoxes = useMemo(() => {
    const list: { colorHex: string; name: string }[] = [];
    results.forEach(res => {
      // Estimate number of visually visible cartons to render (cap at ~100 to avoid performance lag)
      let count = 0;
      res.rows.forEach(r => {
        count += r.nbr;
      });
      
      // Proportional visual mapping
      const visualCount = Math.min(Math.max(1, Math.round(count / 2)), 30);
      for (let i = 0; i < visualCount; i++) {
        list.push({
          colorHex: res.color,
          name: res.nom
        });
      }
    });

    // Shuffle boxes slightly so they look packed nicely
    return list.sort(() => Math.random() - 0.5);
  }, [results]);

  // Number of boxes to show based on loading simulation step
  const visibleBoxesCount = useMemo(() => {
    if (cargoBoxes.length === 0) return 0;
    const fillPercent = totalVolume > 0 
      ? Math.min(1.0, totalVolume / selectedSpec.maxVolume) 
      : 0;
    
    // Scale total visual boxes to the container fill rate
    const totalToRender = Math.max(1, Math.round(cargoBoxes.length * fillPercent));
    return Math.round(totalToRender * (loadingStep / 100));
  }, [cargoBoxes, loadingStep, totalVolume, selectedSpec]);

  // Animation effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setLoadingStep(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 5;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleStartLoad = () => {
    setLoadingStep(0);
    setIsPlaying(true);
  };

  const handleResetLoad = () => {
    setIsPlaying(false);
    setLoadingStep(100);
  };

  const volUtilPct = Math.round((totalVolume / selectedSpec.maxVolume) * 100);
  const weightUtilPct = Math.round((totalWeight / selectedSpec.maxWeight) * 100);
  const isOverloaded = totalVolume > selectedSpec.maxVolume || totalWeight > selectedSpec.maxWeight;

  return (
    <div className={`p-5 rounded-xl border shadow-sm mt-6 transition-all ${
      darkMode ? 'bg-[#0F0F12] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-700/10 mb-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-500">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black font-mono uppercase tracking-wider">
              🚢 Simulateur 3D de Remplissage de Conteneur
            </h3>
            <p className={`text-[10px] font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Visualisez l'encombrement de votre expédition dans un conteneur maritime standardisé.
            </p>
          </div>
        </div>

        {/* Play/Pause Load Controls */}
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <button
              onClick={() => setIsPlaying(false)}
              className="p-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[10px] font-bold font-mono uppercase flex items-center gap-1 cursor-pointer transition-all"
              title="Pause loading animation"
            >
              <Pause className="w-3 h-3" /> Pause
            </button>
          ) : (
            <button
              onClick={handleStartLoad}
              className="p-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-bold font-mono uppercase flex items-center gap-1 cursor-pointer transition-all"
              title="Lancer l'animation d'empotage"
            >
              <Play className="w-3 h-3" /> Simuler l'empotage
            </button>
          )}
          <button
            onClick={handleResetLoad}
            className="p-1.5 rounded bg-slate-700/10 hover:bg-slate-700/20 text-slate-400 text-[10px] font-bold font-mono uppercase flex items-center gap-1 cursor-pointer transition-all"
            title="Réinitialiser à 100%"
          >
            <RotateCcw className="w-3 h-3" /> Remplir Direct
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Spec Selectors and Details */}
        <div className="lg:col-span-4 space-y-4">
          <div className="space-y-1.5">
            <label className={`text-[10px] font-mono font-black uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Type de Conteneur :
            </label>
            <div className="grid grid-cols-1 gap-2">
              {CONTAINER_SPECS.map(spec => {
                const isSelected = selectedSpec.id === spec.id;
                const isRecommended = recommendedSpec.id === spec.id;
                return (
                  <button
                    key={spec.id}
                    onClick={() => {
                      setSelectedSpec(spec);
                      setLoadingStep(100);
                      setIsPlaying(false);
                    }}
                    className={`p-3 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : `${darkMode ? 'border-white/5 bg-white/2 hover:bg-white/5 text-slate-300' : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-700'}`
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold font-mono">{spec.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Capacité : {spec.maxVolume} m³ | Max : {(spec.maxWeight / 1000).toFixed(1)}T
                      </div>
                    </div>
                    {isRecommended && (
                      <span className="text-[8px] font-black font-mono tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                        Recommandé
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Utilization Metrics */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            darkMode ? 'bg-black/30 border-white/5' : 'bg-slate-50 border-slate-100'
          }`}>
            <h4 className="text-[10px] font-black font-mono uppercase tracking-wider text-slate-400 pb-1.5 border-b border-slate-700/10 flex items-center justify-between">
              <span>Taux de Remplissage</span>
              <Scale className="w-3.5 h-3.5 text-indigo-500" />
            </h4>
            
            {/* Volume rate */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Volume Cargo :</span>
                <span className={`font-bold ${volUtilPct > 100 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {totalVolume.toFixed(2)} / {selectedSpec.maxVolume} m³ ({volUtilPct}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-700/20 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    volUtilPct > 100 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, volUtilPct)}%` }}
                />
              </div>
            </div>

            {/* Weight rate */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Poids Cargo :</span>
                <span className={`font-bold ${weightUtilPct > 100 ? 'text-red-500' : 'text-teal-400'}`}>
                  {totalWeight.toFixed(0)} / {selectedSpec.maxWeight} KG ({weightUtilPct}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-700/20 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    weightUtilPct > 100 ? 'bg-red-500 animate-pulse' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(100, weightUtilPct)}%` }}
                />
              </div>
            </div>

            {/* Warning if overloaded */}
            {isOverloaded && (
              <div className="flex gap-2 p-2 rounded border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] leading-relaxed">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <p>
                  <strong>Attention !</strong> Les spécifications du conteneur sélectionné sont dépassées. Veuillez opter pour un conteneur plus grand.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Proportional Interactive Cargo Compartment Render */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          <div className={`flex-1 rounded-xl border p-4 flex flex-col justify-center min-h-[220px] relative overflow-hidden ${
            darkMode ? 'bg-black/45 border-white/5 shadow-inner' : 'bg-slate-50/50 border-slate-100'
          }`}>
            {/* Side-view of Container Compartment */}
            <div className="relative w-full max-w-lg mx-auto py-6">
              
              {/* Back wall of container */}
              <div className={`w-full aspect-[4/1.2] rounded-lg relative overflow-hidden border-2 flex flex-col justify-between ${
                darkMode ? 'bg-[#18181F] border-slate-700' : 'bg-slate-200 border-slate-350'
              }`}>
                {/* Structural ribs in the container back wall */}
                <div className="absolute inset-y-0 left-0 right-0 flex justify-between pointer-events-none opacity-20">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="w-[1px] h-full bg-white" />
                  ))}
                </div>

                {/* Cargo Boxes Loaded Inside */}
                <div className="absolute bottom-1.5 left-2 right-2 top-2 flex flex-wrap content-end items-end justify-start gap-1">
                  {cargoBoxes.slice(0, visibleBoxesCount).map((box, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0, y: -20, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      transition={{ type: 'spring', damping: 15 }}
                      className="w-5 h-5 rounded-sm border shadow-xs relative cursor-pointer"
                      style={{ 
                        backgroundColor: box.colorHex,
                        borderColor: 'rgba(0,0,0,0.15)'
                      }}
                      title={box.name}
                    >
                      {/* Standard Box lid line details */}
                      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-black/10" />
                      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-black/10" />
                    </motion.div>
                  ))}
                </div>

                {/* Container Doors (Left / Right indicators) */}
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-red-600 border-l border-red-700 flex flex-col justify-between p-[1px]">
                  <div className="w-full h-1 bg-yellow-500" />
                  <div className="w-full h-1 bg-yellow-500" />
                </div>
              </div>

              {/* Floor palette/skid support visual board underneath container block */}
              <div className="w-full h-2 mt-1 bg-gradient-to-r from-slate-600 to-slate-700 rounded-b-md relative overflow-hidden flex justify-around p-[1px]">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="w-4 h-full bg-slate-900 rounded-sm" />
                ))}
              </div>
            </div>

            {/* Caption Info bottom right */}
            <div className="absolute bottom-2 right-3 flex items-center gap-1.5 text-[9px] font-mono text-slate-400">
              <Info className="w-3 h-3 text-indigo-400" />
              <span>Chaque boîte colorée représente ~2 cartons réels de la packing list.</span>
            </div>
          </div>

          {/* Quick Informational Tips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className={`p-3 rounded-lg border flex gap-2.5 items-start ${
              darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="text-[10px] font-bold font-mono uppercase tracking-wide text-slate-300">
                  Optimisation du Gerbage
                </h5>
                <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                  Il est recommandé de placer les cartons de même couleur (solides) en colonnes uniformes pour maximiser la stabilité verticale.
                </p>
              </div>
            </div>

            <div className={`p-3 rounded-lg border flex gap-2.5 items-start ${
              darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="text-[10px] font-bold font-mono uppercase tracking-wide text-slate-300">
                  Centre de Gravité
                </h5>
                <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                  Répartissez le poids uniformément. Les cartons les plus lourds (poids net brut le plus élevé) doivent être empotés au niveau du sol.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
