import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Search, 
  Sliders, 
  X, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  LayoutGrid, 
  ListFilter, 
  Check, 
  Scale, 
  Sparkles
} from 'lucide-react';
import { ColorResult, ColorConfig, PackedRow } from '../types';

interface CartonVisualizerProps {
  activeResults: ColorResult[];
  colors: ColorConfig[];
  darkMode: boolean;
  onSelectCartonLabel?: (cartonNumber: number, colorNom: string) => void;
  onSwitchToLabels?: () => void;
}

interface IndividualCarton {
  cartonNumber: number;
  colorName: string;
  colorHex: string;
  type: 'solid' | 'solid_r' | 'mixed';
  sizes: { [sizeName: string]: number };
  pcsPerCarton: number;
  capacity: number;
  fillPercent: number;
  skus: string[];
  netWeight: number;
  grossWeight: number;
  cbm: number;
}

export default function CartonVisualizer({
  activeResults,
  colors,
  darkMode,
  onSelectCartonLabel,
  onSwitchToLabels
}: CartonVisualizerProps) {
  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'solid' | 'remainder'>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [selectedCarton, setSelectedCarton] = useState<IndividualCarton | null>(null);

  // Helper: Parse carton range to extract bounds
  const parseCartonRange = (rangeStr: string) => {
    const parts = rangeStr.split('-');
    const start = parseInt(parts[0], 10) || 1;
    const end = parseInt(parts[1], 10) || start;
    return { start, end };
  };

  // Helper: Get row's capacity
  const getRowCapacity = (row: PackedRow, colorConfig?: ColorConfig) => {
    if (row.type === 'solid') {
      return row.pcsPerCarton; // standard full solid
    }
    const sizesInRow = Object.keys(row.sizes).filter(sz => row.sizes[sz] > 0);
    if (sizesInRow.length === 0) return 25;
    const capList = sizesInRow.map(sz => colorConfig?.sizes?.[sz]?.cap || 25);
    return Math.max(...capList);
  };

  // 1. Expand PackedRows into list of individual cartons
  const allCartons = useMemo(() => {
    const list: IndividualCarton[] = [];
    
    activeResults.forEach(res => {
      const colorConfig = colors.find(c => c.nom === res.nom);
      
      res.rows.forEach(row => {
        const { start, end } = parseCartonRange(row.cartonRange);
        const count = row.nbr;
        
        // Calculate per-carton metrics
        const netWeightSingle = row.netWeightRow / count;
        const grossWeightSingle = row.grossWeightRow / count;
        const cbmSingle = row.cbmRow / count;
        const capacitySingle = getRowCapacity(row, colorConfig);
        
        // Compute fill rate
        let fillPercent = 100;
        if (row.type !== 'solid') {
          fillPercent = capacitySingle > 0 
            ? Math.min(100, Math.round((row.pcsPerCarton / capacitySingle) * 100))
            : 100;
        }

        // Push individual cartons
        for (let num = start; num <= end; num++) {
          list.push({
            cartonNumber: num,
            colorName: res.nom,
            colorHex: res.color,
            type: row.type,
            sizes: row.sizes,
            pcsPerCarton: row.pcsPerCarton,
            capacity: capacitySingle,
            fillPercent,
            skus: row.skus,
            netWeight: netWeightSingle,
            grossWeight: grossWeightSingle,
            cbm: cbmSingle
          });
        }
      });
    });

    // Sort cartons by number ascending
    return list.sort((a, b) => a.cartonNumber - b.cartonNumber);
  }, [activeResults, colors]);

  // Extract all unique sizes available across results for filtering
  const allAvailableSizes = useMemo(() => {
    const sizesSet = new Set<string>();
    allCartons.forEach(c => {
      Object.keys(c.sizes).forEach(sz => {
        if (c.sizes[sz] > 0) {
          sizesSet.add(sz);
        }
      });
    });
    return Array.from(sizesSet).sort();
  }, [allCartons]);

  // Apply filters
  const filteredCartons = useMemo(() => {
    return allCartons.filter(carton => {
      // 1. Carton number or color query
      const matchesSearch = searchQuery.trim() === '' || 
        carton.cartonNumber.toString() === searchQuery.trim() ||
        carton.colorName.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Type filter
      const matchesType = typeFilter === 'all' ||
        (typeFilter === 'solid' && carton.type === 'solid') ||
        (typeFilter === 'remainder' && carton.type !== 'solid');

      // 3. Size content filter
      const matchesSize = sizeFilter === 'all' || 
        (carton.sizes[sizeFilter] && carton.sizes[sizeFilter] > 0);

      return matchesSearch && matchesType && matchesSize;
    });
  }, [allCartons, searchQuery, typeFilter, sizeFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = allCartons.length;
    const solids = allCartons.filter(c => c.type === 'solid').length;
    const remainders = total - solids;
    const avgRemainderFill = remainders > 0
      ? Math.round(allCartons.filter(c => c.type !== 'solid').reduce((sum, c) => sum + c.fillPercent, 0) / remainders)
      : 0;

    return { total, solids, remainders, avgRemainderFill };
  }, [allCartons]);

  return (
    <div className="space-y-6">
      {/* Visual Header Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {/* Total Cartons */}
        <div className={`p-4 rounded-xl border flex items-center gap-4 shadow-sm transition-all ${
          darkMode ? 'bg-[#121216] border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-500">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-[10px] font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Cartons
            </div>
            <div className={`text-xl font-black font-mono ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {stats.total}
            </div>
          </div>
        </div>

        {/* Solid Cartons (Full 100%) */}
        <div className={`p-4 rounded-xl border flex items-center gap-4 shadow-sm transition-all ${
          darkMode ? 'bg-[#121216] border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-[10px] font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Cartons Pleins (100%)
            </div>
            <div className={`text-xl font-black font-mono ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {stats.solids} <span className="text-xs font-semibold text-emerald-500">({stats.total > 0 ? Math.round((stats.solids / stats.total) * 100) : 0}%)</span>
            </div>
          </div>
        </div>

        {/* Leftover / Remainder Cartons */}
        <div className={`p-4 rounded-xl border flex items-center gap-4 shadow-sm transition-all ${
          darkMode ? 'bg-[#121216] border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-[10px] font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Cartons Reste (LAST)
            </div>
            <div className={`text-xl font-black font-mono ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {stats.remainders} <span className="text-xs font-semibold text-amber-500">({stats.total > 0 ? Math.round((stats.remainders / stats.total) * 100) : 0}%)</span>
            </div>
          </div>
        </div>

        {/* Avg Remainder Fill Rate */}
        <div className={`p-4 rounded-xl border flex items-center gap-4 shadow-sm transition-all ${
          darkMode ? 'bg-[#121216] border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-500">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-[10px] font-mono font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Remplissage Moyen Reste
            </div>
            <div className={`text-xl font-black font-mono ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {stats.avgRemainderFill}%
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar / Filters Control */}
      <div className={`p-4 rounded-xl border shadow-sm print:hidden transition-all ${
        darkMode ? 'bg-[#0F0F12] border-white/10' : 'bg-white border-slate-250'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par numéro de carton ou couleur..."
              className={`w-full pl-9 pr-4 py-2 text-xs rounded-lg border font-mono transition-all outline-none focus:ring-1 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-black/30 border-white/10 text-white placeholder-slate-500 focus:border-white/20' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-slate-300'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Filter by Type */}
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono font-bold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Type :</span>
              <div className={`p-0.5 rounded-lg border flex gap-1 ${darkMode ? 'bg-black/30 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                {(['all', 'solid', 'remainder'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 text-[10px] font-bold font-mono uppercase rounded transition-all cursor-pointer ${
                      typeFilter === t
                        ? 'bg-slate-800 text-white shadow-sm'
                        : `${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`
                    }`}
                  >
                    {t === 'all' ? 'Tous' : t === 'solid' ? 'Pleins' : 'Restes'}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter by Size */}
            {allAvailableSizes.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-mono font-bold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Taille :</span>
                <select
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  className={`px-2 py-1 text-[11px] font-mono font-bold rounded-lg border outline-none ${
                    darkMode 
                      ? 'bg-[#121216] border-white/10 text-white' 
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">TOUTES LES TAILLES</option>
                  {allAvailableSizes.map(sz => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      {filteredCartons.length === 0 ? (
        <div className={`p-12 text-center border rounded-xl border-dashed ${
          darkMode ? 'border-white/10 bg-white/2' : 'border-slate-200 bg-slate-50'
        }`}>
          <Package className="w-10 h-10 text-slate-400 mx-auto mb-3 animate-bounce" />
          <p className={`text-xs font-mono font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Aucun carton ne correspond aux critères de recherche.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setTypeFilter('all'); setSizeFilter('all'); }}
            className="mt-3 text-xs text-blue-500 hover:underline font-mono font-bold"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredCartons.map((carton) => {
            const isSelected = selectedCarton?.cartonNumber === carton.cartonNumber && selectedCarton?.colorName === carton.colorName;
            const isFull = carton.type === 'solid';
            
            return (
              <motion.div
                key={`${carton.colorName}-${carton.cartonNumber}`}
                layoutId={`carton-card-${carton.colorName}-${carton.cartonNumber}`}
                onClick={() => setSelectedCarton(carton)}
                whileHover={{ scale: 1.03, y: -2 }}
                className={`group relative rounded-xl border p-3 cursor-pointer shadow-sm transition-all overflow-hidden select-none ${
                  isSelected 
                    ? 'ring-2 ring-blue-500' 
                    : ''
                } ${
                  darkMode 
                    ? 'bg-[#121216] hover:bg-[#16161c] border-white/10' 
                    : 'bg-white hover:bg-slate-50/50 border-slate-200'
                }`}
              >
                {/* Colored Top Bar */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1" 
                  style={{ backgroundColor: carton.colorHex }}
                />

                {/* Card Top Details */}
                <div className="flex items-center justify-between mb-2 mt-1">
                  <span className={`text-[10px] font-black font-mono tracking-tight px-1.5 py-0.5 rounded-md ${
                    darkMode ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-800'
                  }`}>
                    #{carton.cartonNumber}
                  </span>
                  
                  {/* Status Badge */}
                  {isFull ? (
                    <span className="text-[8px] font-black font-mono tracking-wide uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      SOLIDE
                    </span>
                  ) : (
                    <span className="text-[8px] font-black font-mono tracking-wide uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      RESTE {carton.fillPercent}%
                    </span>
                  )}
                </div>

                {/* Custom Cardboard Box Illustration */}
                <div className="my-3 flex flex-col items-center justify-center py-1">
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    {/* Box body */}
                    <div className={`w-12 h-10 rounded-md border-2 relative transition-all ${
                      isFull 
                        ? (darkMode ? 'bg-emerald-900/20 border-emerald-500/60' : 'bg-emerald-50 border-emerald-500/60')
                        : (darkMode ? 'bg-amber-950/20 border-amber-500/60' : 'bg-amber-50/50 border-amber-500/60')
                    }`}>
                      {/* Packing Tape horizontal */}
                      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-3 h-full border-l border-r ${
                        darkMode ? 'bg-orange-900/30 border-orange-950/40' : 'bg-amber-800/10 border-amber-900/10'
                      }`} />
                      
                      {/* Box packing tape fold vertical */}
                      <div className={`absolute left-0 right-0 top-1.5 h-1 border-t border-b ${
                        darkMode ? 'border-amber-900/20' : 'border-amber-900/5'
                      }`} />

                      {/* Display Total Pieces inside center */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-xs font-black font-mono ${
                          isFull 
                            ? 'text-emerald-500' 
                            : 'text-amber-500'
                        }`}>
                          {carton.pcsPerCarton}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] font-bold font-mono tracking-wide uppercase mt-1 truncate max-w-full text-center" style={{ color: carton.colorHex }}>
                    {carton.colorName}
                  </div>
                </div>

                {/* Quick content list */}
                <div className="space-y-1 mt-2 pt-2 border-t border-dashed border-slate-700/10">
                  <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
                    {Object.keys(carton.sizes).map(sz => {
                      const qty = carton.sizes[sz];
                      if (qty <= 0) return null;
                      return (
                        <span key={sz} className={`text-[8.5px] font-bold font-mono px-1 py-0.15 rounded ${
                          darkMode ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {sz}:<span className="font-extrabold text-blue-500">{qty}</span>
                        </span>
                      );
                    })}
                  </div>
                  
                  {/* Linear progress bar */}
                  <div className="w-full h-1 bg-slate-700/10 rounded-full overflow-hidden mt-1.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        isFull ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${carton.fillPercent}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Carton Inspect Panel / Sidebar Drawer Overlay */}
      <AnimatePresence>
        {selectedCarton && (
          <div className="fixed inset-0 z-50 overflow-hidden print:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCarton(null)}
              className="absolute inset-0 bg-black transition-opacity"
            />

            {/* Drawer Body */}
            <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className={`w-screen max-w-md border-l shadow-2xl relative flex flex-col h-full ${
                  darkMode ? 'bg-[#0F0F12] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                {/* Drawer Header */}
                <div className="px-6 py-5 border-b flex items-center justify-between border-slate-700/10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-500">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black font-mono uppercase tracking-wide">
                        Détails du Carton #{selectedCarton.cartonNumber}
                      </h2>
                      <p className={`text-[10px] font-mono uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Couleur: <span className="font-bold" style={{ color: selectedCarton.colorHex }}>{selectedCarton.colorName}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCarton(null)}
                    className="p-1 rounded-lg hover:bg-slate-700/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Drawer Contents Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {/* Visual Box Rendering */}
                  <div className={`p-6 rounded-2xl border relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br ${
                    darkMode ? 'from-black/40 to-black/10 border-white/5' : 'from-slate-50 to-slate-100/50 border-slate-100'
                  }`}>
                    {/* Fill Status Progress Ring / Banner */}
                    <div className="absolute top-3 right-3">
                      {selectedCarton.type === 'solid' ? (
                        <span className="text-[9px] font-black font-mono tracking-wide px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                          🟢 PLEIN (100%)
                        </span>
                      ) : (
                        <span className="text-[9px] font-black font-mono tracking-wide px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                          🟡 RESTE ({selectedCarton.fillPercent}% remp.)
                        </span>
                      )}
                    </div>

                    <div className="relative w-28 h-28 flex items-center justify-center my-4">
                      {/* Box outline */}
                      <div className={`w-24 h-20 rounded-xl border-3 relative shadow-md transition-all ${
                        selectedCarton.type === 'solid'
                          ? (darkMode ? 'bg-emerald-950/30 border-emerald-500/80' : 'bg-emerald-50/80 border-emerald-500/70')
                          : (darkMode ? 'bg-amber-950/30 border-amber-500/80' : 'bg-amber-50/80 border-amber-500/70')
                      }`}>
                        {/* Tape horizontal */}
                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-6 border-l border-r bg-amber-800/15 border-amber-900/10" />
                        {/* Tape fold vertical */}
                        <div className="absolute left-0 right-0 top-3 h-2 border-t border-b border-amber-900/10" />
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-2xl font-black font-mono ${
                            selectedCarton.type === 'solid' ? 'text-emerald-500' : 'text-amber-500'
                          }`}>
                            {selectedCarton.pcsPerCarton}
                          </span>
                          <span className={`text-[8px] font-bold font-mono tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            PIÈCES / {selectedCarton.capacity} MAX
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Fill bar */}
                    <div className="w-full max-w-xs space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono font-bold uppercase text-slate-400">
                        <span>Remplissage</span>
                        <span>{selectedCarton.pcsPerCarton} / {selectedCarton.capacity} Pcs ({selectedCarton.fillPercent}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-700/20 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            selectedCarton.type === 'solid' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${selectedCarton.fillPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sizes Breakdown Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-extrabold font-mono uppercase tracking-wider text-slate-400">
                      📦 CONSTITUANTS DU CARTON
                    </h3>
                    <div className={`p-4 rounded-xl border space-y-2.5 ${
                      darkMode ? 'bg-black/30 border-white/5' : 'bg-slate-50 border-slate-100'
                    }`}>
                      {Object.keys(selectedCarton.sizes).map(sz => {
                        const qty = selectedCarton.sizes[sz];
                        if (qty <= 0) return null;
                        return (
                          <div key={sz} className="flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="font-bold">Taille : {sz}</span>
                            </div>
                            <span className="font-black px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/10">
                              {qty} Pcs
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Technical details Grid (Weight, CBM, SKU) */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-extrabold font-mono uppercase tracking-wider text-slate-400">
                      ⚖️ INFORMATIONS LOGISTIQUES
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Weights */}
                      <div className={`p-3 rounded-xl border flex flex-col justify-center ${
                        darkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'
                      }`}>
                        <span className="text-[9px] font-mono text-slate-400 uppercase">Poids Net</span>
                        <span className="text-sm font-black font-mono text-teal-500">{selectedCarton.netWeight.toFixed(2)} KG</span>
                      </div>
                      <div className={`p-3 rounded-xl border flex flex-col justify-center ${
                        darkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'
                      }`}>
                        <span className="text-[9px] font-mono text-slate-400 uppercase">Poids Brut</span>
                        <span className="text-sm font-black font-mono text-red-500">{selectedCarton.grossWeight.toFixed(2)} KG</span>
                      </div>
                      {/* CBM */}
                      <div className={`p-3 rounded-xl border flex flex-col justify-center col-span-2 ${
                        darkMode ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'
                      }`}>
                        <span className="text-[9px] font-mono text-slate-400 uppercase">Volume (CBM)</span>
                        <span className="text-sm font-black font-mono text-indigo-500">{selectedCarton.cbm.toFixed(4)} m³</span>
                      </div>
                    </div>
                  </div>

                  {/* SKUs Section */}
                  {selectedCarton.skus.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-extrabold font-mono uppercase tracking-wider text-slate-400">
                        🏷️ STRÉGIE SKU / CODES BARRES
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCarton.skus.map(sku => (
                          <span key={sku} className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg border ${
                            darkMode ? 'bg-white/5 border-white/10 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                          }`}>
                            {sku}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-4 border-t flex gap-2 border-slate-700/10">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectCartonLabel) {
                        onSelectCartonLabel(selectedCarton.cartonNumber, selectedCarton.colorName);
                        if (onSwitchToLabels) onSwitchToLabels();
                        setSelectedCarton(null);
                      }
                    }}
                    className={`flex-1 py-2 px-3 font-mono font-bold text-xs rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                      darkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>IMPRIMER ÉTIQUETTE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCarton(null)}
                    className={`px-3 py-2 font-mono font-bold text-xs rounded-lg cursor-pointer transition-all border ${
                      darkMode ? 'border-white/10 text-white hover:bg-white/5' : 'border-slate-200 text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    Fermer
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
