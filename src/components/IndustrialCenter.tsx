import { useEffect, useMemo, useState, type ClipboardEvent } from 'react';
import { BarChart3, FolderOpen, Plus, RefreshCw, Save, Search, Trash2, Upload, ZoomIn, ZoomOut, Camera, Download, Filter, CheckSquare } from 'lucide-react';

type CenterTab = 'dashboard' | 'projects' | 'files' | 'delivery' | 'settings';
type DeliveryRow = Record<string, string | number> & { id: string; cbm: number };
const isDesktop = () => typeof window !== 'undefined' && Boolean(window.rubaDesktop);

const deliveryColumns: Array<{ key: string; label: string; width: string; kind?: 'date' | 'number' }> = [
  { key: 'date', label: 'DATE', width: '110px', kind: 'date' },
  { key: 'season', label: 'SEASON', width: '100px' },
  { key: 'customerCode', label: 'CUSTOMER CODE', width: '170px' },
  { key: 'customerName', label: 'CUSTOMER NAME', width: '250px' },
  { key: 'customerPo', label: 'CUSTOMER PO', width: '260px' },
  { key: 'color', label: 'COLOR', width: '240px' },
  { key: 'dest', label: 'DEST', width: '90px' },
  { key: 'poQty', label: 'PO QTY', width: '110px', kind: 'number' },
  { key: 'targetBooking', label: 'TARGET BOOKING', width: '140px', kind: 'date' },
  { key: 'actualBooking', label: 'ACTUAL BOOKING', width: '140px', kind: 'date' },
  { key: 'targetApproval', label: 'TARGET APPROVAL', width: '145px', kind: 'date' },
  { key: 'approvalReceived', label: 'APPROVAL RECEIVED', width: '150px', kind: 'date' },
  { key: 'pcsPerCtn', label: 'PCS / CTN', width: '110px', kind: 'number' },
  { key: 'packingType', label: 'PACKING TYPE', width: '150px' },
  { key: 'numberOfCarton', label: 'NUMBER OF CARTON', width: '150px', kind: 'number' },
  { key: 'l', label: 'L (cm)', width: '95px', kind: 'number' },
  { key: 'h', label: 'H (cm)', width: '95px', kind: 'number' },
  { key: 'w', label: 'W (cm)', width: '95px', kind: 'number' },
  { key: 'cbm', label: 'CBM', width: '110px', kind: 'number' },
  { key: 'grossWeight', label: 'GROSS KG / CTN', width: '150px', kind: 'number' },
  { key: 'initialShipMode', label: 'INITIAL SHIP MODE', width: '150px' },
  { key: 'targetPl', label: 'TARGET PL', width: '125px', kind: 'date' },
];
const dateKeys = new Set(deliveryColumns.filter(column => column.kind === 'date').map(column => column.key));
const numericKeys = new Set(deliveryColumns.filter(column => column.kind === 'number' && column.key !== 'cbm').map(column => column.key));
const createRow = (): DeliveryRow => Object.fromEntries(deliveryColumns.map(column => [column.key, column.key === 'cbm' ? 0 : ''])) as DeliveryRow;
const normalizeRow = (input: any): DeliveryRow => {
  const row = { ...createRow(), ...(input || {}) } as DeliveryRow;
  row.id = String(input?.id || `delivery_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  for (const key of numericKeys) row[key] = Number(row[key] || 0);
  row.cbm = Number(((Number(row.l) || 0) * (Number(row.h) || 0) * (Number(row.w) || 0)) / 1000000).toFixed(6) as unknown as number;
  return row;
};
const headerAliases: Record<string, string> = {
  date: 'date', season: 'season', 'customer code': 'customerCode', 'customer name': 'customerName', 'customer po': 'customerPo', color: 'color', dest: 'dest', 'po qty': 'poQty', 'target booking': 'targetBooking', 'target date for booking': 'targetBooking', 'actual booking': 'actualBooking', 'actual date for booking': 'actualBooking', 'target approval': 'targetApproval', 'target approval date': 'targetApproval', 'approval received': 'approvalReceived', 'date received approval': 'approvalReceived', 'pcs / ctn': 'pcsPerCtn', 'pcs per ctn': 'pcsPerCtn', 'packing type': 'packingType', 'number of carton': 'numberOfCarton', l: 'l', h: 'h', w: 'w', cbm: 'cbm', 'gross kg / ctn': 'grossWeight', 'gross weight per carton': 'grossWeight', 'initial ship mode': 'initialShipMode', 'target pl': 'targetPl'
};
const normalizeHeader = (value: string) => value.toLowerCase().replace(/[()]/g, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

export default function IndustrialCenter({ onBack, onLoadProject, projectPayload, initialTab = 'dashboard', showTabs = true }: { onBack: () => void; onLoadProject?: (project: any) => Promise<void> | void; projectPayload?: any; initialTab?: CenterTab; showTabs?: boolean }) {
  const [tab, setTab] = useState<CenterTab>(initialTab);
  const [summary, setSummary] = useState({ projects: 0, packingLists: 0, files: 0, deliveryPlans: 0, breakdownRows: 0 });
  const [projects, setProjects] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [deliverySearch, setDeliverySearch] = useState('');
  const [storageRoot, setStorageRoot] = useState('');
  const [projectName, setProjectName] = useState('');
  const [customer, setCustomer] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [planName, setPlanName] = useState('');
  const [planId, setPlanId] = useState('');
  const [rows, setRows] = useState<DeliveryRow[]>([normalizeRow({})]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [zoom, setZoom] = useState(() => Number(localStorage.getItem('ruba_ui_zoom') || 100));
  const [accent, setAccent] = useState(() => localStorage.getItem('ruba_accent') || '#0f766e');
  const [message, setMessage] = useState('');

  useEffect(() => { setTab(initialTab); }, [initialTab]);
  const refresh = async () => {
    if (!isDesktop()) return;
    const api = window.rubaDesktop!;
    const [nextSummary, nextProjects, nextFiles, root] = await Promise.all([api.dbSummary(), api.listProjects(search), api.listFiles({ search }), api.getStorageRoot()]);
    setSummary(nextSummary); setProjects(nextProjects); setFiles(nextFiles); setStorageRoot(root);
    if (!selectedProjectId && nextProjects[0]) setSelectedProjectId(nextProjects[0].id);
  };
  useEffect(() => { refresh().catch(() => setMessage('Le centre local sera disponible dans la version desktop.')); }, [search]);
  useEffect(() => { document.body.style.zoom = `${zoom / 100}`; document.documentElement.style.setProperty('--ruba-accent', accent); return () => { document.body.style.zoom = '1'; }; }, [zoom, accent]);

  const applyZoom = (value: number) => { const next = Math.max(80, Math.min(125, value)); setZoom(next); localStorage.setItem('ruba_ui_zoom', String(next)); };
  const saveAccent = (value: string) => { setAccent(value); localStorage.setItem('ruba_accent', value); document.documentElement.style.setProperty('--ruba-accent', value); };
  const createProject = async () => { if (!isDesktop() || !projectName.trim()) return; const saved = await window.rubaDesktop!.saveProject({ name: projectName.trim(), customer, status: 'draft', payload: projectPayload || {} }); setProjectName(''); setCustomer(''); setSelectedProjectId(saved.id); setMessage('Travail enregistré dans SQLite.'); await refresh(); };
  const chooseRoot = async () => { if (!isDesktop()) return; const next = await window.rubaDesktop!.chooseStorageRoot(); if (next) { setStorageRoot(next); setMessage('Dossier de stockage modifié.'); } };
  const capture = async () => { if (!isDesktop()) return; const result = await window.rubaDesktop!.captureWindow(); if (!result.canceled) setMessage(`Capture enregistrée : ${result.filePath}`); };
  const updateRow = (id: string, key: string, value: string) => setRows(previous => previous.map(row => { if (row.id !== id) return row; const next = { ...row, [key]: numericKeys.has(key) ? Number(value || 0) : value } as DeliveryRow; next.cbm = Number(((Number(next.l) || 0) * (Number(next.h) || 0) * (Number(next.w) || 0)) / 1000000).toFixed(6) as unknown as number; return next; }));
  const filteredRows = useMemo(() => rows.filter(row => {
    const matchesGlobal = !deliverySearch || Object.values(row).some(value => String(value ?? '').toLowerCase().includes(deliverySearch.toLowerCase()));
    const matchesColumns = Object.entries(filters).every(([key, value]) => !value || String(row[key] ?? '').toLowerCase().includes(String(value).toLowerCase()));
    return matchesGlobal && matchesColumns;
  }), [rows, filters, deliverySearch]);
  const totalCbm = rows.reduce((sum, row) => sum + Number(row.cbm || 0), 0);
  const deleteSelectedRows = () => { if (!selectedRows.length) return; setRows(previous => previous.filter(row => !selectedRows.includes(row.id))); setSelectedRows([]); };
  const savePlan = async () => { if (!isDesktop() || !selectedProjectId || !planName.trim()) { setMessage('Choisissez un travail et renseignez le nom du Delivery Plan.'); return; } const cleanRows = rows.filter(row => Object.values(row).some(value => String(value ?? '').trim() && value !== 0)); const plan = await window.rubaDesktop!.saveDeliveryPlan({ id: planId || undefined, projectId: selectedProjectId, planName, payload: { rows: cleanRows } }); setPlanId(plan.id); await window.rubaDesktop!.replaceBreakdown({ deliveryPlanId: plan.id, rows: cleanRows }); setMessage('Delivery Plan et breakdown enregistrés dans SQLite.'); await refresh(); };
  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData('text/plain'); if (!text.includes('\t') && !text.includes('\n')) return;
    event.preventDefault(); const matrix = text.trim().split(/\r?\n/).map(line => line.split('\t'));
    const first = matrix[0].map(normalizeHeader); const hasHeaders = first.some(header => Boolean(headerAliases[header]));
    const keys = hasHeaders ? first.map(header => headerAliases[header] || '') : deliveryColumns.map(column => column.key);
    const data = (hasHeaders ? matrix.slice(1) : matrix).filter(line => line.some(cell => String(cell).trim()));
    setRows(data.map(line => normalizeRow(Object.fromEntries(line.map((value, index) => keys[index] ? [keys[index], value] : []).filter(Boolean)))));
    setFilters({}); setSelectedRows([]); setMessage(`${data.length} ligne(s) collée(s) depuis Excel.`);
  };
  const toggleSelected = (id: string) => setSelectedRows(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);
  const tabs = useMemo(() => [['dashboard', 'Dashboard'], ['projects', 'Travaux'], ['files', 'Fichiers Excel'], ['delivery', 'Delivery Plan'], ['settings', 'Paramètres']] as const, []);

  return <section className="flex-1 min-h-0 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ ['--ruba-accent' as any]: accent }}>
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Ruba Industrial Workspace</p><h2 className="text-xl font-black text-slate-900">Centre de pilotage</h2></div><div className="flex flex-wrap items-center gap-2"><button onClick={() => applyZoom(zoom - 5)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"><ZoomOut size={16}/></button><span className="min-w-12 text-center text-xs font-bold text-slate-600">{zoom}%</span><button onClick={() => applyZoom(zoom + 5)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"><ZoomIn size={16}/></button><button onClick={capture} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"><Camera size={15}/> Capture</button><button onClick={onBack} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Retour au colisage</button></div></div>
    {showTabs && <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-5 py-3">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`rounded-xl px-3 py-2 text-xs font-bold ${tab === id ? 'text-white shadow-sm' : 'bg-slate-50 text-slate-600'}`} style={tab === id ? { backgroundColor: accent } : undefined}>{label}</button>)}</div>}
    {message && <div className="mx-5 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{message}</div>}
    {tab === 'dashboard' && <div className="grid gap-4 p-5 md:grid-cols-5">{[['Travaux', summary.projects], ['Packing Lists', summary.packingLists], ['Fichiers', summary.files], ['Delivery Plans', summary.deliveryPlans], ['Lignes breakdown', summary.breakdownRows]].map(([label, value]: any) => <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: accent }} /><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-slate-900">{value}</p></div>)}</div>}
    {tab === 'projects' && <div className="space-y-4 p-5"><div className="flex flex-wrap gap-2"><input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Nom du travail" className="rounded-lg border px-3 py-2 text-sm"/><input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Client" className="rounded-lg border px-3 py-2 text-sm"/><button onClick={createProject} className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ backgroundColor: accent }}><Plus size={14}/> Nouveau travail</button></div><div className="overflow-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="bg-slate-900 text-xs uppercase text-white"><tr><th className="px-4 py-3">Nom</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Dernière mise à jour</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{projects.map(p => <tr key={p.id} className="border-t"><td className="px-4 py-3 font-bold">{p.name}</td><td className="px-4 py-3">{p.customer}</td><td className="px-4 py-3">{p.status}</td><td className="px-4 py-3 text-slate-500">{new Date(p.updated_at).toLocaleString()}</td><td className="px-4 py-3"><div className="flex justify-end gap-3"><button onClick={async () => { const full = await window.rubaDesktop?.getProject(p.id); if (full) await onLoadProject?.(full); setMessage(`Projet chargé : ${p.name}`); }} className="rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-bold text-teal-700">Charger</button><button onClick={async () => { if (!window.confirm(`Supprimer le projet « ${p.name} » ?`)) return; await window.rubaDesktop?.deleteProject(p.id); refresh(); }} className="text-rose-600"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div></div>}
    {tab === 'files' && <div className="space-y-4 p-5"><div className="flex items-center gap-2"><div className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-2"><Search size={15} className="text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrer les fichiers et travaux" className="w-full text-sm outline-none"/></div><button onClick={refresh} className="rounded-lg border p-2"><RefreshCw size={16}/></button><button onClick={async () => { const imported = await window.rubaDesktop?.importFile({ fileKind: 'excel' }); if (imported) { setMessage(`Fichier importé : ${imported.name}`); await refresh(); } }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white" style={{ backgroundColor: accent }}><Upload size={14}/> Importer Excel</button></div><div className="overflow-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="bg-slate-900 text-xs uppercase text-white"><tr><th className="px-4 py-3">Fichier</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Travail</th><th className="px-4 py-3">Chemin</th></tr></thead><tbody>{files.map(f => <tr key={f.id} className="border-t"><td className="px-4 py-3 font-bold">{f.name}</td><td className="px-4 py-3">{f.file_kind}</td><td className="px-4 py-3">{f.project_name || '—'}</td><td className="max-w-md truncate px-4 py-3 text-slate-500">{f.stored_path}</td></tr>)}</tbody></table></div></div>}
    {tab === 'delivery' && <div className="space-y-4 p-5"><div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4"><select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="">Choisir un travail</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Nom du Delivery Plan" className="rounded-lg border bg-white px-3 py-2 text-sm"/><button onClick={savePlan} className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ backgroundColor: accent }}><Save size={14}/> Enregistrer le plan</button></div><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 rounded-lg border px-3 py-2"><Search size={15} className="text-slate-400"/><input value={deliverySearch} onChange={e => setDeliverySearch(e.target.value)} placeholder="Rechercher dans le plan..." className="w-72 max-w-full text-sm outline-none"/></div><div className="flex items-center gap-2 text-xs font-bold text-slate-600"><span>{filteredRows.length}/{rows.length} ligne(s)</span><span>CBM total : <b className="text-teal-700">{totalCbm.toFixed(4)} m³</b></span><button onClick={deleteSelectedRows} disabled={!selectedRows.length} className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-white disabled:opacity-40"><Trash2 size={14}/> Supprimer ({selectedRows.length})</button></div></div><div className="overflow-auto rounded-xl border" onPaste={handlePaste}><table className="min-w-[3100px] table-fixed text-left text-xs"><thead className="sticky top-0 z-20 bg-slate-900 text-[10px] uppercase text-white"><tr><th className="sticky left-0 z-30 w-[48px] bg-slate-900 px-2 py-3"><CheckSquare size={14}/></th>{deliveryColumns.map(column => <th key={column.key} style={{ width: column.width, minWidth: column.width }} className="whitespace-nowrap border-l border-white/15 px-2 py-3">{column.label}</th>)}</tr><tr className="sticky top-[38px] z-20 bg-slate-100 text-slate-700"><th className="sticky left-0 z-30 bg-slate-100 px-2 py-1"><Filter size={13}/></th>{deliveryColumns.map(column => <th key={column.key} style={{ width: column.width, minWidth: column.width }} className="border-l border-slate-200 px-1 py-1"><input value={filters[column.key] || ''} onChange={e => setFilters(previous => ({ ...previous, [column.key]: e.target.value }))} placeholder="Filtrer..." className="w-full rounded border border-slate-300 bg-white px-1.5 py-1 text-[10px] font-normal text-slate-700 outline-none" /></th>)}</tr></thead><tbody>{filteredRows.map(row => <tr key={row.id} className="border-t hover:bg-teal-50/40"><td className="sticky left-0 z-10 bg-white p-1 text-center"><input type="checkbox" checked={selectedRows.includes(row.id)} onChange={() => toggleSelected(row.id)} /></td>{deliveryColumns.map(column => <td key={column.key} className="border-l border-slate-100 p-1"><input type={column.kind === 'date' ? 'date' : column.kind === 'number' ? 'number' : 'text'} readOnly={column.key === 'cbm'} value={String(row[column.key] ?? '')} onChange={e => updateRow(row.id, column.key, e.target.value)} className={`w-full rounded border px-2 py-1.5 text-xs ${column.key === 'cbm' ? 'bg-teal-50 font-bold text-teal-800' : 'bg-white'}`} /></td>)}</tr>)}</tbody></table></div><div className="flex flex-wrap gap-2"><button onClick={() => setRows(previous => [...previous, normalizeRow({})])} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><Plus size={14}/> Ajouter une ligne</button><button onClick={() => { setRows([normalizeRow({})]); setSelectedRows([]); setFilters({}); }} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><RefreshCw size={14}/> Vider la grille</button><span className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800"><Download size={14}/> Collez une plage Excel avec en-têtes. Les filtres restent actifs au-dessus de chaque colonne.</span></div></div>}
    {tab === 'settings' && <div className="space-y-5 p-5"><div className="rounded-2xl border border-slate-200 p-5"><h3 className="font-black">Stockage local</h3><p className="mt-2 break-all text-xs text-slate-500">{storageRoot || 'Stockage local de Ruba'}</p><button onClick={chooseRoot} className="mt-3 flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold"><FolderOpen size={14}/> Modifier le dossier</button></div><div className="rounded-2xl border border-slate-200 p-5"><h3 className="font-black">Thème et couleurs</h3><div className="mt-4 flex items-center gap-3"><input type="color" value={accent} onChange={e => saveAccent(e.target.value)} className="h-10 w-14 cursor-pointer rounded border"/><span className="text-sm font-semibold text-slate-700">Couleur principale des boutons et rubans</span><button onClick={() => saveAccent('#0f766e')} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><Save size={14}/> Réinitialiser</button></div></div></div>}
  </section>;
}
