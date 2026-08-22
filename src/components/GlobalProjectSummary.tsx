import { BarChart3, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';
import { useMemo, useState } from 'react';

type ColorOption = { color?: string; po?: string; poQty?: number | string };

type Props = {
  meta: any;
  colors: any[];
  deliveryColorOptions?: ColorOption[];
  groupedOrders?: Array<{ order: string }>;
  darkMode?: boolean;
};

export default function GlobalProjectSummary({ meta, colors, deliveryColorOptions = [], groupedOrders = [], darkMode = false }: Props) {
  const [expanded, setExpanded] = useState(true);
  const rows = useMemo(() => {
    const map = new Map<string, { color: string; poQty: number; plQty: number }>();
    for (const option of deliveryColorOptions || []) {
      const color = String(option.color || '').trim();
      if (!color) continue;
      const key = color.toLowerCase();
      const current = map.get(key) || { color, poQty: 0, plQty: 0 };
      current.poQty += Number(option.poQty || 0);
      map.set(key, current);
    }
    for (const item of colors || []) {
      const color = String(item.nom || item.name || '').trim();
      if (!color) continue;
      const key = color.toLowerCase();
      const current = map.get(key) || { color, poQty: 0, plQty: 0 };
      current.plQty = Object.values(item.sizes || {}).reduce<number>((sum, size: any) => sum + Number(size?.qtyTot || size?.qty || 0), 0);
      map.set(key, current);
    }
    return [...map.values()];
  }, [colors, deliveryColorOptions]);
  const totals = rows.reduce((sum, row) => ({ poQty: sum.poQty + row.poQty, plQty: sum.plQty + row.plQty }), { poQty: 0, plQty: 0 });
  const variance = totals.poQty > 0 ? ((totals.plQty - totals.poQty) / totals.poQty) * 100 : 0;
  const format = (value: number) => value.toLocaleString('fr-FR');
  const tone = variance < 0 ? 'text-amber-700' : variance > 0 ? 'text-rose-700' : 'text-emerald-700';
  const barWidth = Math.min(100, Math.abs(variance));

  return <div className={`sticky top-0 z-40 border-b shadow-md ${darkMode ? 'border-white/10 bg-[#111827]/[.97] text-white' : 'border-slate-200 bg-white/[.98] text-slate-900'} backdrop-blur`}>
    <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white"><ClipboardList size={16}/></div><div className="min-w-0"><p className="truncate text-[9px] font-black uppercase tracking-[.16em] text-indigo-700">Projet actif</p><div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] font-bold"><span>Order # <b className="font-mono">{meta?.order || '—'}</b></span><span>PO <b className="font-mono">{meta?.po || '—'}</b></span><span className="max-w-[220px] truncate">{meta?.customer || 'Client non sélectionné'}</span>{groupedOrders.length > 0 && <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-black text-indigo-800">{groupedOrders.length + 1} commandes</span>}</div></div></div>
      <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 md:flex"><span className="text-[9px] font-black uppercase text-slate-500">PL</span><b className="font-mono text-xs">{format(totals.plQty)} pcs</b><span className="text-[9px] font-black uppercase text-slate-500">PO</span><b className="font-mono text-xs">{format(totals.poQty)} pcs</b><span className={`font-mono text-xs font-black ${tone}`}>{variance > 0 ? '+' : ''}{variance.toFixed(1)}%</span></div>
      <button type="button" onClick={() => setExpanded(value => !value)} className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[10px] font-black text-indigo-700"><BarChart3 size={14}/><span>{rows.length} couleur(s)</span>{expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</button>
    </div>
    {expanded && <div className="mx-auto max-w-[1800px] overflow-x-auto px-4 pb-2"><div className="flex min-w-max gap-2">{rows.length ? rows.map(row => { const percent = row.poQty > 0 ? ((row.plQty - row.poQty) / row.poQty) * 100 : 0; const width = Math.min(100, Math.abs(percent)); const rowTone = percent < 0 ? 'text-amber-700' : percent > 0 ? 'text-rose-700' : 'text-emerald-700'; return <div key={row.color} className="min-w-[180px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5"><div className="flex items-center justify-between gap-3"><span className="max-w-[105px] truncate text-[10px] font-black uppercase text-slate-700">{row.color}</span><span className={`font-mono text-[10px] font-black ${rowTone}`}>{percent > 0 ? '+' : ''}{percent.toFixed(1)}%</span></div><div className="mt-1 h-1.5 rounded-full bg-slate-200"><div className={`h-1.5 rounded-full ${percent < 0 ? 'bg-amber-500' : percent > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${width}%` }}/></div><p className="mt-0.5 text-[9px] text-slate-500">PL {format(row.plQty)} / PO {format(row.poQty)} pcs</p></div>; }) : <p className="py-1 text-[10px] text-slate-500">Aucune couleur disponible pour le projet actif.</p>}</div></div>}
  </div>;
}

