import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, ClipboardList, FileSpreadsheet, FolderOpen, Gauge, Home, RefreshCw, Search, Settings, Truck } from 'lucide-react';

type Ribbon = 'packing' | 'projects' | 'history' | 'exports' | 'dashboard' | 'files' | 'settings' | 'delivery';
type Props = { onNavigate: (ribbon: Ribbon) => void };
type Summary = { projects: number; packingLists: number; files: number; deliveryPlans: number; breakdownRows: number };

type Project = { id: string; name?: string; customer?: string; order_number?: string; po_number?: string; status?: string; updated_at?: string; archived?: boolean };

const actions: Array<{ ribbon: Ribbon; title: string; detail: string; icon: React.ElementType; tone: string }> = [
  { ribbon: 'packing', title: 'Créer un projet', detail: 'Références, stratégie et saisie', icon: ClipboardList, tone: 'from-violet-600 to-indigo-700' },
  { ribbon: 'projects', title: 'Travaux', detail: 'Consulter et charger les projets', icon: FolderOpen, tone: 'from-indigo-600 to-blue-700' },
  { ribbon: 'delivery', title: 'Delivery Plan', detail: 'Consulter les données SQLite', icon: Truck, tone: 'from-cyan-600 to-blue-700' },
  { ribbon: 'history', title: 'Historique', detail: 'Packing lists enregistrées', icon: Gauge, tone: 'from-fuchsia-600 to-violet-700' },
  { ribbon: 'exports', title: 'Fichiers exportés', detail: 'PDF et XLSX générés', icon: FileSpreadsheet, tone: 'from-amber-500 to-orange-600' },
  { ribbon: 'settings', title: 'Paramètres', detail: 'Configuration de Ruba', icon: Settings, tone: 'from-slate-700 to-slate-900' },
];

export default function HomeScreen({ onNavigate }: Props) {
  const [summary, setSummary] = useState<Summary>({ projects: 0, packingLists: 0, files: 0, deliveryPlans: 0, breakdownRows: 0 });
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const api = window.rubaDesktop;
      if (!api) throw new Error('Base locale indisponible');
      const [nextSummary, nextProjects] = await Promise.all([api.dbSummary(), api.listProjects({ archived: false })]);
      setSummary(nextSummary || { projects: 0, packingLists: 0, files: 0, deliveryPlans: 0, breakdownRows: 0 });
      setProjects(Array.isArray(nextProjects) ? nextProjects : []);
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les données SQLite');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const filteredProjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter(project => [project.name, project.customer, project.order_number, project.po_number, project.status].some(value => String(value || '').toLowerCase().includes(needle)));
  }, [projects, query]);

  const formatDate = (value?: string) => value ? new Date(value).toLocaleString('fr-FR') : '—';
  const kpis = [['Projets actifs', summary.projects, 'from-cyan-600 to-blue-700'], ['Packing Lists', summary.packingLists, 'from-violet-600 to-fuchsia-700'], ['Fichiers', summary.files, 'from-blue-600 to-indigo-700'], ['Delivery Plans', summary.deliveryPlans, 'from-fuchsia-600 to-violet-700']];
  const topRibbons: Array<[Ribbon, string]> = [['packing', 'COLISAGE OPÉRATIONNEL'], ['projects', 'TRAVAUX'], ['history', 'HISTORIQUE'], ['dashboard', 'DASHBOARD'], ['delivery', 'DELIVERY PLAN'], ['settings', 'PARAMÈTRES'], ['exports', 'FICHIER EXPORTER']];

  return <div className="min-h-screen bg-[#071126] text-slate-100">
    <div className="sticky top-0 z-30 border-b border-indigo-300/20 bg-[#050b1b]/95 shadow-2xl backdrop-blur">
      <div className="mx-auto flex min-h-[68px] max-w-[1800px] items-center gap-5 overflow-x-auto px-5 py-3">
        <div className="flex shrink-0 items-center gap-2.5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 shadow-lg shadow-violet-950/50"><Home size={21}/></div><span className="text-xl font-black tracking-tight">Ruba</span></div>
        <nav className="flex min-w-max flex-1 items-center justify-center gap-1.5">{topRibbons.map(([ribbon, label]) => <button key={ribbon} type="button" onClick={() => onNavigate(ribbon)} className="rounded-lg px-3 py-2 text-[10px] font-black tracking-wide text-slate-300 hover:bg-white/10 hover:text-white">{label}</button>)}<button type="button" onClick={() => onNavigate('dashboard')} className="flex items-center gap-1.5 rounded-lg border border-violet-300/70 bg-violet-700 px-3 py-2 text-[10px] font-black tracking-wide text-white shadow-lg shadow-violet-950/40"><Home size={13}/> ACCUEIL</button></nav>
      </div>
    </div>
    <main className="mx-auto max-w-[1800px] space-y-5 px-5 py-5 lg:px-8">
      <section className="rounded-2xl border border-indigo-300/25 bg-gradient-to-r from-[#0b1b3d] via-[#101b45] to-[#24154d] p-5 shadow-xl"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Accueil / Centre de pilotage</p><h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Vue globale de Ruba</h1><p className="mt-1 text-sm text-slate-300">Les indicateurs et les travaux ci-dessous proviennent de la base SQLite centrale.</p></div><button type="button" onClick={() => void refresh()} className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/15"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Actualiser</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{kpis.map(([label, value, tone]) => <div key={label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0b1630]/80 p-4"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${tone}`}><BarChart3 size={20}/></span><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-white">{Number(value).toLocaleString('fr-FR')}</p></div></div>)}</div></section>
      <section className="rounded-2xl border border-indigo-300/20 bg-[#0b1731] p-5 shadow-xl"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">Accès rapide</p><h2 className="mt-1 text-lg font-black text-white">Modules essentiels</h2></div><span className="rounded-full border border-violet-300/30 bg-violet-500/10 px-3 py-1.5 text-[10px] font-black uppercase text-violet-200">Navigation directe</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{actions.map(({ ribbon, title, detail, icon: Icon, tone }) => <button key={ribbon} type="button" onClick={() => onNavigate(ribbon)} className="group flex min-h-[112px] flex-col justify-between rounded-xl border border-white/10 bg-[#101f40] p-4 text-left hover:-translate-y-0.5 hover:border-violet-300/60 hover:bg-[#172956]"><div className="flex items-center justify-between"><span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${tone}`}><Icon size={18}/></span><ArrowRight size={15} className="text-violet-300 group-hover:translate-x-1"/></div><span><b className="mt-3 block text-xs font-black text-white">{title}</b><span className="mt-1 block text-[10px] leading-4 text-slate-400">{detail}</span></span></button>)}</div></section>
      <section className="rounded-2xl border border-indigo-300/20 bg-[#0b1731] p-5 shadow-xl"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Travaux récents</p><h2 className="mt-1 text-lg font-black text-white">Projets enregistrés</h2></div><div className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#071126] px-3 py-2"><Search size={15} className="text-slate-400"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un projet..." className="w-56 bg-transparent text-xs text-white outline-none placeholder:text-slate-500"/></div></div>{error && <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>}<div className="mt-4 overflow-auto rounded-xl border border-white/10"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-[#162957] text-[10px] uppercase tracking-wider text-cyan-200"><tr><th className="px-4 py-3">Projet</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Commande / PO</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Dernière mise à jour</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody>{filteredProjects.map(project => <tr key={project.id} className="border-t border-white/10 bg-[#0d1b39] hover:bg-[#142550]"><td className="px-4 py-3 font-bold text-white">{project.name || 'Projet sans nom'}</td><td className="px-4 py-3 text-slate-300">{project.customer || '—'}</td><td className="px-4 py-3 font-mono text-cyan-200">{project.order_number || '—'} <span className="text-slate-500">/ {project.po_number || '—'}</span></td><td className="px-4 py-3"><span className="rounded-full bg-cyan-500/15 px-2 py-1 text-[10px] font-bold uppercase text-cyan-200">{project.status || 'brouillon'}</span></td><td className="px-4 py-3 text-slate-400">{formatDate(project.updated_at)}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => onNavigate('projects')} className="rounded-lg border border-violet-300/30 px-2.5 py-1.5 text-[10px] font-bold text-violet-200 hover:bg-violet-500/15">Ouvrir</button></td></tr>)}{!loading && filteredProjects.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">Aucun projet enregistré ne correspond à la recherche.</td></tr>}</tbody></table></div></section>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-indigo-300/15 pt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500"><span>Ruba Industrial Workspace</span><span>Base SQLite centrale • Version 2.9.0</span></footer>
    </main>
  </div>;
}
