import React from 'react';
import { ArrowRight, ClipboardList, FileSpreadsheet, FolderOpen, Gauge, Home, Settings, Truck } from 'lucide-react';

type Ribbon = 'packing' | 'projects' | 'history' | 'exports' | 'dashboard' | 'files' | 'settings' | 'delivery';

type Props = { onNavigate: (ribbon: Ribbon) => void };

const actions: Array<{ ribbon: Ribbon; title: string; detail: string; icon: React.ElementType; tone: string }> = [
  { ribbon: 'packing', title: 'Créer un projet', detail: 'Références, stratégie et saisie', icon: ClipboardList, tone: 'from-violet-600 to-indigo-700' },
  { ribbon: 'projects', title: 'Travaux', detail: 'Consulter et charger les projets', icon: FolderOpen, tone: 'from-indigo-600 to-blue-700' },
  { ribbon: 'delivery', title: 'Delivery Plan', detail: 'Consulter les données SQLite', icon: Truck, tone: 'from-cyan-600 to-blue-700' },
  { ribbon: 'history', title: 'Historique', detail: 'Packing lists enregistrées', icon: Gauge, tone: 'from-fuchsia-600 to-violet-700' },
  { ribbon: 'exports', title: 'Fichiers exportés', detail: 'PDF et XLSX générés', icon: FileSpreadsheet, tone: 'from-amber-500 to-orange-600' },
  { ribbon: 'settings', title: 'Paramètres', detail: 'Configuration de Ruba', icon: Settings, tone: 'from-slate-700 to-slate-900' },
];

export default function HomeScreen({ onNavigate }: Props) {
  return <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-5 py-6 text-white sm:px-10 lg:px-16">
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col justify-center">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500 shadow-lg shadow-violet-900/40"><Home size={24}/></div><div><p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-300">Ruba Industrial Workspace</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Accueil</h1></div></div><span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-violet-100">Version 2.9.0</span></header>
      <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">Centre de pilotage</p><h2 className="mt-2 max-w-3xl text-2xl font-black sm:text-3xl">Que souhaitez-vous faire aujourd’hui ?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Accédez directement à chaque module de préparation, de suivi et d’export de vos packing lists.</p><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{actions.map(({ ribbon, title, detail, icon: Icon, tone }) => <button key={ribbon} type="button" onClick={() => onNavigate(ribbon)} className="group flex min-h-[118px] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.08] p-4 text-left transition hover:-translate-y-1 hover:border-violet-300/60 hover:bg-white/[0.14]"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tone} shadow-lg`}><Icon size={22}/></span><span className="min-w-0 flex-1"><b className="block text-sm font-black text-white">{title}</b><span className="mt-1 block text-xs leading-5 text-slate-300">{detail}</span></span><ArrowRight size={17} className="shrink-0 text-violet-300 transition group-hover:translate-x-1"/></button>)}</div></section>
      <button type="button" onClick={() => onNavigate('dashboard')} className="self-start rounded-xl border border-violet-300/30 bg-violet-500/15 px-4 py-2.5 text-xs font-black text-violet-100 hover:bg-violet-500/25">Ouvrir le Dashboard global <ArrowRight size={14} className="ml-2 inline"/></button>
    </div>
  </div>;
}
