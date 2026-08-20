import { useEffect, useState } from 'react';
import { Archive, Edit3, RefreshCw, Search, Trash2 } from 'lucide-react';

type HistoryItem = {
  id: string;
  name: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  project_name?: string;
  payload?: any;
};

type Props = {
  lists: HistoryItem[];
  onRefresh: () => void;
  onLoad: (item: HistoryItem) => void;
  onDelete: (item: HistoryItem) => void;
  onDeleteAll: () => void;
};

export default function PackingHistoryRibbon({ lists, onRefresh, onLoad, onDelete, onDeleteAll }: Props) {
  const [query, setQuery] = useState('');
  const filtered = lists.filter(item => `${item.name} ${item.project_name || ''}`.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => { setQuery(''); }, [lists.length]);

  return <section className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
      <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Ruba Records</p><h2 className="text-xl font-black text-slate-900">Historique des Packing Lists</h2><p className="mt-1 text-xs text-slate-500">Une base SQLite unique — {lists.length} fiche(s) enregistrée(s).</p></div>
      <div className="flex flex-wrap items-center gap-2"><button onClick={onRefresh} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><RefreshCw size={14}/> Actualiser</button><button onClick={onDeleteAll} disabled={!lists.length} className="flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={14}/> Tout supprimer</button></div>
    </div>
    <div className="border-b border-slate-100 p-5"><div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><Search size={16} className="text-slate-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une Packing List, un travail..." className="w-full text-sm outline-none"/></div></div>
    <div className="p-5">{filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"><Archive className="mx-auto text-slate-400" size={32}/><p className="mt-3 font-bold text-slate-700">Aucune Packing List enregistrée</p><p className="mt-1 text-xs text-slate-500">Utilisez « Sauvegarder la fiche » dans le ruban Sauvegardes.</p></div> : <div className="overflow-auto rounded-2xl border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-900 text-xs uppercase text-white"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Packing List</th><th className="px-4 py-3">Travail</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Mise à jour</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id} className="border-t border-slate-100"><td className="px-4 py-3 font-mono text-[11px] text-slate-500">{item.id}</td><td className="px-4 py-3 font-bold text-slate-900">{item.name}</td><td className="px-4 py-3 text-slate-600">{item.project_name || '—'}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">{item.status || 'draft'}</span></td><td className="px-4 py-3 text-xs text-slate-500">{item.updated_at ? new Date(item.updated_at).toLocaleString('fr-FR') : '—'}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => onLoad(item)} className="flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white"><Edit3 size={13}/> Charger / modifier</button><button onClick={() => onDelete(item)} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50" title="Supprimer"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>}</div>
  </section>;
}
