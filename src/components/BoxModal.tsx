import { useState, useEffect } from 'react';
import { X, Scale, Maximize } from 'lucide-react';
import { SizeDetails } from '../types';

interface BoxModalProps {
  isOpen: boolean;
  sizeName: string;
  colorName: string;
  initialDetails: SizeDetails;
  onClose: () => void;
  onSave: (updated: SizeDetails) => void;
  darkMode?: boolean;
}

export default function BoxModal({
  isOpen,
  sizeName,
  colorName,
  initialDetails,
  onClose,
  onSave,
  darkMode = true
}: BoxModalProps) {
  const [wPiece, setWPiece] = useState(0.25);
  const [wCarton, setWCarton] = useState(0.8);
  const [dimL, setDimL] = useState(61);
  const [diml, setDiml] = useState(41);
  const [dimH, setDimH] = useState(30);

  useEffect(() => {
    if (isOpen) {
      setWPiece(initialDetails.wPiece);
      setWCarton(initialDetails.wCarton);
      setDimL(initialDetails.dimL);
      setDiml(initialDetails.diml);
      setDimH(initialDetails.dimH);
    }
  }, [isOpen, initialDetails]);

  if (!isOpen) return null;

  const handleSave = () => {
    const totalVolumeCbm = (dimL * diml * dimH) / 1000000;
    onSave({
      ...initialDetails,
      wPiece,
      wCarton,
      dimL,
      diml,
      dimH,
      cbmUnit: totalVolumeCbm
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9500] backdrop-blur-xs px-4">
      <div className={`border rounded-xl max-w-md w-full overflow-hidden shadow-2xl transition-all ${
        darkMode ? 'bg-[#1a1d27] border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className={`border-b p-5 flex items-center justify-between ${
          darkMode ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex flex-col">
            <h3 className={`text-sm font-mono font-semibold tracking-wider uppercase ${
              darkMode ? 'text-blue-400' : 'text-blue-600'
            }`}>
              ✏️ DÉTAILS DU COLISAGE
            </h3>
            <p className={`text-xs font-sans mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Taille <span className={`font-mono font-bold leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>{sizeName}</span> de la couleur <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{colorName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Section: Weight */}
          <div className="space-y-3">
            <h4 className={`text-[10px] font-mono font-bold tracking-widest uppercase flex items-center gap-1.5 ${
              darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <Scale className="w-3.5 h-3.5 text-blue-500" />
              ⚖️ Poids (KG)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={`text-[10px] font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Poids Pièce (KG)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={wPiece}
                  onChange={(e) => setWPiece(parseFloat(e.target.value) || 0)}
                  className={`w-full font-mono font-medium rounded-lg px-3 py-2 text-sm focus:outline-none transition-all border ${
                    darkMode
                      ? 'bg-[#222636] border-slate-700 hover:border-slate-600 focus:border-blue-500 text-white'
                      : 'bg-slate-50 border-slate-300 hover:border-slate-400 focus:border-blue-500 text-slate-900'
                  }`}
                  placeholder="0.250"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={`text-[10px] font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Poids Carton Vide (KG)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={wCarton}
                  onChange={(e) => setWCarton(parseFloat(e.target.value) || 0)}
                  className={`w-full font-mono font-medium rounded-lg px-3 py-2 text-sm focus:outline-none transition-all border ${
                    darkMode
                      ? 'bg-[#222636] border-slate-700 hover:border-slate-600 focus:border-blue-500 text-white'
                      : 'bg-slate-50 border-slate-300 hover:border-slate-400 focus:border-blue-500 text-slate-900'
                  }`}
                  placeholder="0.80"
                />
              </div>
            </div>
          </div>

          {/* Section: Dimensions */}
          <div className="space-y-3">
            <h4 className={`text-[10px] font-mono font-bold tracking-widest uppercase flex items-center gap-1.5 ${
              darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <Maximize className="w-3.5 h-3.5 text-blue-500" />
              📐 Dimensions Carton (cm)
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className={`text-[10px] font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Longueur (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={dimL}
                  onChange={(e) => setDimL(parseFloat(e.target.value) || 0)}
                  className={`w-full font-mono font-medium rounded-lg px-3 py-2 text-sm focus:outline-none transition-all border ${
                    darkMode
                      ? 'bg-[#222636] border-slate-700 hover:border-slate-600 focus:border-blue-500 text-white'
                      : 'bg-slate-50 border-slate-300 hover:border-slate-400 focus:border-blue-500 text-slate-900'
                  }`}
                  placeholder="60"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={`text-[10px] font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Largeur (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={diml}
                  onChange={(e) => setDiml(parseFloat(e.target.value) || 0)}
                  className={`w-full font-mono font-medium rounded-lg px-3 py-2 text-sm focus:outline-none transition-all border ${
                    darkMode
                      ? 'bg-[#222636] border-slate-700 hover:border-slate-600 focus:border-blue-500 text-white'
                      : 'bg-slate-50 border-slate-300 hover:border-slate-400 focus:border-blue-500 text-slate-900'
                  }`}
                  placeholder="40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={`text-[10px] font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Hauteur (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={dimH}
                  onChange={(e) => setDimH(parseFloat(e.target.value) || 0)}
                  className={`w-full font-mono font-medium rounded-lg px-3 py-2 text-sm focus:outline-none transition-all border ${
                    darkMode
                      ? 'bg-[#222636] border-slate-700 hover:border-slate-600 focus:border-blue-500 text-white'
                      : 'bg-slate-50 border-slate-300 hover:border-slate-400 focus:border-blue-500 text-slate-900'
                  }`}
                  placeholder="30"
                />
              </div>
            </div>
          </div>
        </div>

        <div className={`border-t p-4 flex gap-3 ${
          darkMode ? 'bg-[#151821] border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            onClick={onClose}
            className={`flex-1 py-2.5 font-medium rounded-lg text-sm transition-all cursor-pointer border ${
              darkMode
                ? 'bg-transparent hover:bg-slate-800 border-slate-700 text-slate-300'
                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
            }`}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:brightness-110 text-white font-semibold rounded-lg text-sm transition-all cursor-pointer"
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}
