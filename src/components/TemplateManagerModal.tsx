import { useEffect, useMemo, useState } from 'react';
import { Box, Edit3, Plus, Ruler, Trash2, UserRound, Weight, X } from 'lucide-react';

type Category = 'dimension' | 'weight_piece' | 'weight_carton' | 'customer';
type TemplateRow = { id: string; category: Category; name: string; length_cm?: number; width_cm?: number; height_cm?: number; weight_kg?: number; active?: number };

type Props = { isOpen: boolean; onClose: () => void; darkMode?: boolean };

const categoryLabels: Record<Category, string> = { dimension: '📐 DIM. CARTON', weight_piece: '⚖️ POIDS PIÈCE', weight_carton: '📦 POIDS CARTON', customer: '👤 CUSTOMER' };

export default function TemplateManagerModal({ isOpen, onClose, darkMode = false }: Props) {
  const [category, setCategory] = useState<Category>('dimension');
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [form, setForm] = useState<Partial<TemplateRow>>({ name: '' });
  const [message, setMessage] = useState('');

  const refresh = async () => {
    if (!window.rubaDesktop?.listTemplates) return;
    setRows(await window.rubaDesktop.listTemplates(category));
  };
  useEffect(() => { if (isOpen) refresh().catch(() => setMessage('Impossible de charger la base des gabarits.')); }, [isOpen, category]);
  const volume = useMemo(() => Number(form.length_cm || 0) * Number(form.width_cm || 0) * Number(form.height_cm || 0) / 1000000, [form.length_cm, form.width_cm, form.height_cm]);
  const isDimension = category === 'dimension';
  const isWeight = category === 'weight_piece' || category === 'weight_carton';
  const isCustomer = category === 'customer';
  if (!isOpen) return null;

  const openNew = () => { setEditing(null); setForm({ category, name: '', length_cm: undefined, width_cm: undefined, height_cm: undefined, weight_kg: undefined }); setMessage(''); };
  const openEdit = (row: TemplateRow) => { setEditing(row); setForm({ ...row }); setMessage(''); };
  const save = async () => {
    if (!window.rubaDesktop?.saveTemplate || !String(form.name || '').trim()) { setMessage('Le nom du gabarit est obligatoire.'); return; }
    if (isDimension && [form.length_cm, form.width_cm, form.height_cm].some(value => !Number(value) || Number(value) <= 0)) { setMessage('Longueur, largeur et hauteur doivent être supérieures à zéro.'); return; }
    if (isWeight && (!Number(form.weight_kg) || Number(form.weight_kg) <= 0)) { setMessage('Le poids doit être supérieur à zéro.'); return; }
    await window.rubaDesktop.saveTemplate({ ...form, id: editing?.id, category, name: String(form.name).trim().toUpperCase() });
    setMessage('Gabarit enregistré dans la base séparée.'); setForm({ name: '' }); setEditing(null); await refresh();
  };
  const remove = async (row: TemplateRow) => { if (!window.confirm(`Supprimer le gabarit « ${row.name} » ?`)) return; await window.rubaDesktop?.deleteTemplate(row.id); await refresh(); setMessage('Gabarit supprimé.'); };

  return <div className="fixed inset-0 z-[9500] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"><div className={`flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${darkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
    <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-700">Base SQLite séparée · ruba_gabarits.sqlite</p><h2 className="mt-1 text-lg font-black">Gestion des Gabarits</h2><p className="text-xs text-slate-500">Les gabarits actifs apparaissent dans la Grille de saisie.</p></div><button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-200"><X size={18}/></button></header>
    <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">{(Object.keys(categoryLabels) as Category[]).map(key => <button key={key} onClick={() => setCategory(key)} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black ${category === key ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{key === 'dimension' ? <Ruler size={14}/> : key === 'weight_piece' || key === 'weight_carton' ? <Weight size={14}/> : <UserRound size={14}/>} {categoryLabels[key]}</button>)}</div>
    <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-5 lg:grid-cols-[1fr_330px]">
      <div className="overflow-auto rounded-xl border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-900 text-xs uppercase text-white"><tr><th className="px-4 py-3">Nom</th>{isDimension ? <><th className="px-4 py-3">Longueur (cm)</th><th className="px-4 py-3">Largeur (cm)</th><th className="px-4 py-3">Hauteur (cm)</th><th className="px-4 py-3">Volume m³</th></> : isWeight ? <th className="px-4 py-3">Poids (kg)</th> : <th className="px-4 py-3">Client</th>}<th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3 font-bold">{row.name}</td>{isDimension ? <><td className="px-4 py-3">{row.length_cm ?? row.lengthCm ?? '—'}</td><td className="px-4 py-3">{row.width_cm ?? row.widthCm ?? '—'}</td><td className="px-4 py-3">{row.height_cm ?? row.heightCm ?? '—'}</td><td className="px-4 py-3 font-semibold">{((Number(row.length_cm ?? row.lengthCm ?? 0) * Number(row.width_cm ?? row.widthCm ?? 0) * Number(row.height_cm ?? row.heightCm ?? 0)) / 1000000).toFixed(4)}</td></> : isWeight ? <td className="px-4 py-3">{row.weight_kg ?? row.weightKg ?? '—'}</td> : <td className="px-4 py-3">{row.name || '—'}</td>}<td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => openEdit(row)} className="rounded-lg border p-2 text-teal-700"><Edit3 size={14}/></button><button onClick={() => remove(row)} className="rounded-lg border border-rose-200 p-2 text-rose-600"><Trash2 size={14}/></button></div></td></tr>)}{rows.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-sm text-slate-500">Aucun gabarit dans cette catégorie.</td></tr>}</tbody></table></div>
      <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between"><h3 className="font-black">{editing ? 'Modifier le gabarit' : 'Nouveau gabarit'}</h3><button onClick={openNew} className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold"><Plus size={13}/> Nouveau</button></div><label className="mt-4 block text-xs font-bold">Nom<input value={String(form.name || '')} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm" placeholder="STANDARD"/></label>{isDimension ? <div className="mt-3 grid grid-cols-3 gap-2">{([['length_cm','Longueur'],['width_cm','Largeur'],['height_cm','Hauteur']] as const).map(([key, label]) => <label key={key} className="text-xs font-bold">{label}<input type="number" value={form[key] == null ? '' : form[key]} onChange={e => setForm({ ...form, [key]: Number(e.target.value) })} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-sm"/></label>)}</div> : isWeight ? <label className="mt-3 block text-xs font-bold">Poids (kg)<input type="number" value={form.weight_kg == null ? '' : form.weight_kg} onChange={e => setForm({ ...form, weight_kg: Number(e.target.value) })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"/></label> : <p className="mt-3 rounded-lg border border-sky-100 bg-sky-50 p-3 text-xs font-semibold text-sky-800">Le nom du gabarit sera proposé comme client dans Références.</p>}{isDimension && <p className="mt-3 rounded-lg bg-white p-3 text-xs text-slate-600">Volume calculé : <strong>{volume.toFixed(4)} m³</strong></p>}<button onClick={save} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-black text-white"><Plus size={14}/>{editing ? 'ENREGISTRER LA MODIFICATION' : 'AJOUTER LE GABARIT'}</button>{message && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{message}</p>}</aside>
    </div>
  </div></div>;
}
