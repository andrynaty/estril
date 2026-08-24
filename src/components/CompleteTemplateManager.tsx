import { useEffect, useState } from 'react';
import { Check, Edit3, Plus, RefreshCw, Trash2 } from 'lucide-react';

type CartonTemplate = {
  id?: string;
  name: string;
  category: 'carton';
  cap: number;
  weightPiece: number;
  weightCarton: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  active?: number;
};

const emptyTemplate: CartonTemplate = {
  name: '', category: 'carton', cap: 25, weightPiece: 0.25, weightCarton: 0.8,
  lengthCm: 61, widthCm: 41, heightCm: 30, active: 1
};

export default function CompleteTemplateManager({ darkMode, onApply }: { darkMode: boolean; onApply: (template: CartonTemplate) => void }) {
  const [templates, setTemplates] = useState<CartonTemplate[]>([]);
  const [draft, setDraft] = useState<CartonTemplate>(emptyTemplate);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const inputClass = `w-full rounded-lg border px-2.5 py-2 text-xs outline-none ${darkMode ? 'border-white/10 bg-[#0F0F12] text-white' : 'border-slate-300 bg-white text-slate-800'}`;
  const load = async () => { if (!window.rubaDesktop?.listTemplates) return; setLoading(true); try { const rows = await window.rubaDesktop.listTemplates('carton'); setTemplates((rows || []).map((row: any) => ({ ...emptyTemplate, ...row, cap: Number(row.cap ?? row.payload?.cap ?? 25), weightPiece: Number(row.weightPiece ?? row.payload?.weightPiece ?? 0), weightCarton: Number(row.weightCarton ?? row.payload?.weightCarton ?? row.weightKg ?? 0), lengthCm: Number(row.lengthCm ?? row.payload?.lengthCm ?? 0), widthCm: Number(row.widthCm ?? row.payload?.widthCm ?? 0), heightCm: Number(row.heightCm ?? row.payload?.heightCm ?? 0) }))); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const save = async () => { if (!draft.name.trim()) { setMessage('Renseignez le nom du gabarit.'); return; } if (!window.rubaDesktop?.saveTemplate) return; const saved = await window.rubaDesktop.saveTemplate({ id: draft.id, category: 'carton', name: draft.name.trim(), cap: draft.cap, weightPiece: draft.weightPiece, weightCarton: draft.weightCarton, lengthCm: draft.lengthCm, widthCm: draft.widthCm, heightCm: draft.heightCm, payload: draft }); setMessage('Gabarit enregistré dans SQLite.'); setDraft({ ...emptyTemplate, id: undefined }); await load(); return saved; };
  const remove = async (template: CartonTemplate) => { if (!template.id || !window.rubaDesktop?.deleteTemplate || !window.confirm(`Supprimer le gabarit « ${template.name} » ?`)) return; await window.rubaDesktop.deleteTemplate(template.id); setMessage('Gabarit supprimé.'); await load(); };
  const field = (key: keyof CartonTemplate, label: string, step = '0.01') => <label className="space-y-1"><span className={`block text-[10px] font-bold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span><input className={inputClass} type={key === 'name' ? 'text' : 'number'} step={key === 'name' ? undefined : step} value={String(draft[key] ?? '')} onChange={e => setDraft(previous => ({ ...previous, [key]: key === 'name' ? e.target.value : Number(e.target.value) }))}/></label>;
  return <section className={`mt-4 rounded-2xl border p-4 ${darkMode ? 'border-white/10 bg-white/[0.03]' : 'border-violet-200 bg-violet-50/60'}`}><div className="flex flex-wrap items-center justify-between gap-2"><div><p className={`text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-violet-300' : 'text-violet-700'}`}>Gabarits centralisés — v3.0.0</p><h3 className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Gabarit carton complet</h3><p className="mt-1 text-[11px] text-slate-500">Enregistrez le poids carton vide, le poids par pièce, la capacité et les dimensions dans SQLite.</p></div><button type="button" onClick={() => void load()} className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold"><RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Actualiser</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{field('name', 'Nom du gabarit')}{field('weightCarton', 'Poids carton vide (kg)')}{field('weightPiece', 'Poids par pièce (kg)')}{field('cap', 'PCS max / carton', '1')}{field('lengthCm', 'Longueur (cm)')}{field('widthCm', 'Largeur (cm)')}{field('heightCm', 'Hauteur (cm)')}</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void save()} className="flex items-center gap-1 rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white"><Check size={14}/> {draft.id ? 'Mettre à jour' : 'Enregistrer le gabarit'}</button><button type="button" onClick={() => setDraft({ ...emptyTemplate })} className="rounded-lg border px-3 py-2 text-xs font-bold">Nouveau</button>{message && <span className="self-center text-xs font-semibold text-emerald-700">{message}</span>}</div><div className="mt-4 overflow-auto rounded-xl border"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-900 text-[10px] uppercase text-white"><tr><th className="px-3 py-2">Gabarit</th><th className="px-3 py-2">Vide</th><th className="px-3 py-2">Pièce</th><th className="px-3 py-2">Max</th><th className="px-3 py-2">Dimensions</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody>{templates.map(template => <tr key={template.id || template.name} className="border-t"><td className="px-3 py-2 font-bold">{template.name}</td><td className="px-3 py-2">{template.weightCarton.toFixed(3)} kg</td><td className="px-3 py-2">{template.weightPiece.toFixed(3)} kg</td><td className="px-3 py-2">{template.cap} pcs</td><td className="px-3 py-2">{template.lengthCm} × {template.widthCm} × {template.heightCm} cm</td><td className="px-3 py-2"><div className="flex justify-end gap-2"><button type="button" onClick={() => onApply(template)} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white">Appliquer</button><button type="button" onClick={() => setDraft(template)} className="rounded-lg border p-1.5"><Edit3 size={13}/></button><button type="button" onClick={() => void remove(template)} className="rounded-lg border border-rose-200 p-1.5 text-rose-600"><Trash2 size={13}/></button></div></td></tr>)}{!templates.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Aucun gabarit carton complet enregistré.</td></tr>}</tbody></table></div></section>;
}
