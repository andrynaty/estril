import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Download } from 'lucide-react';
import { ModelsDatabase, CartonModel, WeightPieceModel, WeightCartonModel } from '../types';

interface MajBsdModalProps {
  isOpen: boolean;
  database: ModelsDatabase;
  onClose: () => void;
  onSaveDatabase: (updatedDb: ModelsDatabase) => void;
  darkMode?: boolean;
}

type TabType = 'dim' | 'wp' | 'wc';

export default function MajBsdModal({
  isOpen,
  database,
  onClose,
  onSaveDatabase,
  darkMode = true
}: MajBsdModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dim');
  const [selectedIdx, setSelectedIdx] = useState<number>(-1);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formL, setFormL] = useState('');
  const [forml, setForml] = useState('');
  const [formH, setFormH] = useState('');
  const [formWP, setFormWP] = useState('');
  const [formWC, setFormWC] = useState('');

  useEffect(() => {
    // Reset selection & forms when changing tabs or closed/reopened
    setSelectedIdx(-1);
    setIsCreating(false);
    setStatusMsg(null);
    clearForm();
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  const clearForm = () => {
    setFormName('');
    setFormL('');
    setForml('');
    setFormH('');
    setFormWP('');
    setFormWC('');
  };

  const getActiveList = (): Array<any> => {
    if (activeTab === 'dim') return database.dim_models;
    if (activeTab === 'wp') return database.weight_piece_models;
    return database.weight_carton_models;
  };

  const handleSelectModel = (idx: number) => {
    setSelectedIdx(idx);
    setIsCreating(false);
    setStatusMsg(null);

    const model = getActiveList()[idx];
    if (!model) return;

    setFormName(model.name);
    if (activeTab === 'dim') {
      const dbModel = model as CartonModel;
      setFormL(String(dbModel.L));
      setForml(String(dbModel.l));
      setFormH(String(dbModel.h));
    } else if (activeTab === 'wp') {
      const wpModel = model as WeightPieceModel;
      setFormWP(String(wpModel.wPiece));
    } else if (activeTab === 'wc') {
      const wcModel = model as WeightCartonModel;
      setFormWC(String(wcModel.wCarton));
    }
  };

  const handleStartCreate = () => {
    setSelectedIdx(-1);
    setIsCreating(true);
    setStatusMsg(null);
    clearForm();
  };

  const handleDeleteModel = () => {
    if (selectedIdx < 0) return;
    const list = getActiveList();
    const model = list[selectedIdx];
    if (!model) return;

    if (!window.confirm(`Supprimer le modèle "${model.name}" ?`)) return;

    const updatedDb = { ...database };
    if (activeTab === 'dim') {
      updatedDb.dim_models = database.dim_models.filter((_, i) => i !== selectedIdx);
    } else if (activeTab === 'wp') {
      updatedDb.weight_piece_models = database.weight_piece_models.filter((_, i) => i !== selectedIdx);
    } else if (activeTab === 'wc') {
      updatedDb.weight_carton_models = database.weight_carton_models.filter((_, i) => i !== selectedIdx);
    }

    onSaveDatabase(updatedDb);
    setSelectedIdx(-1);
    clearForm();
    setStatusMsg({ text: '✅ Modèle supprimé de la base de données.', isError: false });
  };

  const handleValidateForm = () => {
    const cleanName = formName.trim().toUpperCase();
    if (!cleanName) {
      setStatusMsg({ text: '❌ Nom requis !', isError: true });
      return;
    }

    const updatedDb = { ...database };

    if (activeTab === 'dim') {
      const L = parseFloat(formL);
      const l = parseFloat(forml);
      const h = parseFloat(formH);
      if (isNaN(L) || isNaN(l) || isNaN(h) || L <= 0 || l <= 0 || h <= 0) {
        setStatusMsg({ text: '❌ Longueur, Largeur et Hauteur requis et doivent être supérieurs à 0 !', isError: true });
        return;
      }

      const newModel: CartonModel = { name: cleanName, L, l, h };
      if (isCreating) {
        updatedDb.dim_models = [...database.dim_models, newModel];
      } else {
        updatedDb.dim_models = database.dim_models.map((m, i) => i === selectedIdx ? newModel : m);
      }
    } else if (activeTab === 'wp') {
      const wPiece = parseFloat(formWP);
      if (isNaN(wPiece) || wPiece <= 0) {
        setStatusMsg({ text: '❌ Poids pièce requis et supérieur à 0 !', isError: true });
        return;
      }

      const newModel: WeightPieceModel = { name: cleanName, wPiece };
      if (isCreating) {
        updatedDb.weight_piece_models = [...database.weight_piece_models, newModel];
      } else {
        updatedDb.weight_piece_models = database.weight_piece_models.map((m, i) => i === selectedIdx ? newModel : m);
      }
    } else if (activeTab === 'wc') {
      const wCarton = parseFloat(formWC);
      if (isNaN(wCarton) || wCarton <= 0) {
        setStatusMsg({ text: '❌ Poids carton requis et supérieur à 0 !', isError: true });
        return;
      }

      const newModel: WeightCartonModel = { name: cleanName, wCarton };
      if (isCreating) {
        updatedDb.weight_carton_models = [...database.weight_carton_models, newModel];
      } else {
        updatedDb.weight_carton_models = database.weight_carton_models.map((m, i) => i === selectedIdx ? newModel : m);
      }
    }

    onSaveDatabase(updatedDb);
    setIsCreating(false);
    setSelectedIdx(-1);
    clearForm();
    setStatusMsg({ text: '✅ Validé ! Vos changements sont enregistrés localement.', isError: false });
  };

  const handleDownloadJson = () => {
    const formattedDb = {
      ...database,
      last_updated: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(formattedDb, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'models_db.json';
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg({ text: '⬇️ Téléchargement lancé. Remplacez le fichier "models_db.json" dans votre code ou partage.', isError: false });
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[9500] backdrop-blur-xs px-4">
      <div className={`border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col transition-all ${
        darkMode ? 'bg-[#1a1d27] border-emerald-500/70 text-white' : 'bg-white border-slate-205 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`border-b p-5 flex items-center justify-between ${
          darkMode ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex flex-col">
            <h3 className={`text-sm font-mono font-bold tracking-wider uppercase ${
              darkMode ? 'text-emerald-400' : 'text-emerald-600'
            }`}>
              🗂️ MAJ BASE DE DONNÉES — MODÈLES DE LOGISTIQUE
            </h3>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Modifiez, ajoutez ou supprimez vos gabarits d'emballage et téléchargez le fichier .json complet.
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

        {/* Tab Selection */}
        <div className={`p-5 pb-2 flex gap-2 border-b ${
          darkMode ? 'border-slate-800' : 'border-slate-200 bg-slate-55/60'
        }`}>
          <button
            onClick={() => setActiveTab('dim')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer border ${
              activeTab === 'dim'
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                : (darkMode ? 'bg-[#222636] border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900')
            }`}
          >
            📐 DIM. CARTON
          </button>
          <button
            onClick={() => setActiveTab('wp')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer border ${
              activeTab === 'wp'
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                : (darkMode ? 'bg-[#222636] border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900')
            }`}
          >
            ⚖️ POIDS PIÈCE
          </button>
          <button
            onClick={() => setActiveTab('wc')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer border ${
              activeTab === 'wc'
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                : (darkMode ? 'bg-[#222636] border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900')
            }`}
          >
            📦 POIDS CARTON
          </button>
        </div>

        {/* List Grid */}
        <div className="p-5 flex-1 flex flex-col space-y-4">
          <div className={`text-[10px] font-mono uppercase tracking-widest ${
            darkMode ? 'text-slate-500' : 'text-slate-400'
          }`}>
            Choisissez un modèle ou ajoutez-en un :
          </div>

          <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[180px] overflow-y-auto p-1.5 border rounded-lg ${
            darkMode ? 'border-slate-800/60 bg-slate-900/20' : 'border-slate-200 bg-slate-50/50'
          }`}>
            {getActiveList().map((item, idx) => {
              let detailText = '';
              if (activeTab === 'dim') detailText = `L${item.L} × l${item.l} × h${item.h} cm`;
              else if (activeTab === 'wp') detailText = `${item.wPiece} kg Piece`;
              else detailText = `${item.wCarton} kg Box`;

              const isSelected = selectedIdx === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectModel(idx)}
                  className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer text-xs ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : (darkMode ? 'border-slate-800 bg-[#222636] text-slate-300 hover:border-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 shadow-2xs')
                  }`}
                >
                  <span className={`font-mono font-bold tracking-tight uppercase truncate ${
                    darkMode ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    {item.name}
                  </span>
                  <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>{detailText}</span>
                </button>
              );
            })}

            <button
              onClick={handleStartCreate}
              className={`p-3 rounded-lg border border-dashed text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-xs ${
                isCreating
                  ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400 font-semibold'
                  : (darkMode ? 'border-slate-750 bg-transparent text-emerald-400 hover:border-emerald-500 hover:bg-slate-800/30' : 'border-slate-300 bg-transparent text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50/40')
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau modèle</span>
            </button>
          </div>

          {/* Form container */}
          {(selectedIdx >= 0 || isCreating) && (
            <div className={`border rounded-xl p-4 flex flex-col gap-4 animate-fadeIn ${
              darkMode ? 'bg-[#222636] border-slate-800' : 'bg-slate-50 border-slate-200 shadow-2xs'
            }`}>
              <h4 className={`text-[10px] font-mono tracking-wider font-bold uppercase ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {isCreating ? '🆕 NOUVEL ENREGISTREMENT' : `✏️ ÉDITION DU MODÈLE : ${formName}`}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className={`text-[10px] font-mono uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Nom du modèle</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className={`border rounded-lg px-3 py-2 text-xs focus:outline-none transition-all ${
                      darkMode
                        ? 'bg-[#1a1d27] border-slate-705 focus:border-emerald-500 text-white'
                        : 'bg-white border-slate-300 focus:border-emerald-505 text-slate-900'
                    }`}
                    placeholder="CLIENT / INDICATION"
                  />
                </div>

                {activeTab === 'dim' && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className={`text-[10px] font-mono uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>L (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formL}
                        onChange={(e) => setFormL(e.target.value)}
                        className={`border rounded-lg px-3 py-2 text-xs focus:outline-none transition-all font-mono ${
                          darkMode
                            ? 'bg-[#1a1d27] border-slate-705 focus:border-emerald-500 text-white'
                            : 'bg-white border-slate-300 focus:border-emerald-505 text-slate-900'
                        }`}
                        placeholder="60"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={`text-[10px] font-mono uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>l (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={forml}
                        onChange={(e) => setForml(e.target.value)}
                        className={`border rounded-lg px-3 py-2 text-xs focus:outline-none transition-all font-mono ${
                          darkMode
                            ? 'bg-[#1a1d27] border-slate-705 focus:border-emerald-500 text-white'
                            : 'bg-white border-slate-300 focus:border-emerald-505 text-slate-900'
                        }`}
                        placeholder="40"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={`text-[10px] font-mono uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>h (cm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formH}
                        onChange={(e) => setFormH(e.target.value)}
                        className={`border rounded-lg px-3 py-2 text-xs focus:outline-none transition-all font-mono ${
                          darkMode
                            ? 'bg-[#1a1d27] border-slate-705 focus:border-emerald-500 text-white'
                            : 'bg-white border-slate-300 focus:border-emerald-505 text-slate-900'
                        }`}
                        placeholder="30"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'wp' && (
                  <div className="flex flex-col gap-1">
                    <label className={`text-[10px] font-mono uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Poids (KG)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formWP}
                      onChange={(e) => setFormWP(e.target.value)}
                      className={`border rounded-lg px-3 py-2 text-xs focus:outline-none transition-all font-mono ${
                        darkMode
                          ? 'bg-[#1a1d27] border-slate-705 focus:border-emerald-500 text-white'
                          : 'bg-white border-slate-300 focus:border-emerald-505 text-slate-900'
                      }`}
                      placeholder="0.250"
                    />
                  </div>
                )}

                {activeTab === 'wc' && (
                  <div className="flex flex-col gap-1">
                    <label className={`text-[10px] font-mono uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Vide (KG)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formWC}
                      onChange={(e) => setFormWC(e.target.value)}
                      className={`border rounded-lg px-3 py-2 text-xs focus:outline-none transition-all font-mono ${
                        darkMode
                          ? 'bg-[#1a1d27] border-slate-705 focus:border-emerald-500 text-white'
                          : 'bg-white border-slate-300 focus:border-emerald-505 text-slate-900'
                      }`}
                      placeholder="0.80"
                    />
                  </div>
                )}
              </div>

              <div className={`flex justify-end gap-2 pt-2 border-t ${darkMode ? 'border-slate-800/80' : 'border-slate-200'}`}>
                {!isCreating && (
                  <button
                    onClick={handleDeleteModel}
                    className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Supprimer
                  </button>
                )}
                <button
                  onClick={handleValidateForm}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  Valider Gabarit
                </button>
              </div>
            </div>
          )}

          {/* Status Message */}
          {statusMsg && (
            <div
              className={`px-4 py-3 rounded-xl font-mono text-xs ${
                statusMsg.isError
                  ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                  : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              }`}
            >
              {statusMsg.text}
            </div>
          )}
        </div>

        {/* Action Toolbar */}
        <div className={`border-t p-5 flex flex-wrap gap-3 justify-between items-center ${
          darkMode ? 'bg-[#12151c] border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            onClick={handleDownloadJson}
            className="px-4 py-3 bg-gradient-to-r from-blue-500 to-emerald-500 hover:brightness-110 text-white font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/10"
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger models_db.json
          </button>
          <button
            onClick={onClose}
            className={`px-4 py-2.5 border font-semibold rounded-lg text-xs transition-all cursor-pointer ${
              darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100 bg-white'
            }`}
          >
            ✕ Fermer BSD
          </button>
        </div>
      </div>
    </div>
  );
}
