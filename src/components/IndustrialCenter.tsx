import { useEffect, useMemo, useState } from 'react';
import type { ClipboardEvent } from 'react';
import { Camera, FolderOpen, Plus, RefreshCw, Save, Search, Trash2, Upload, X, ZoomIn, ZoomOut } from 'lucide-react';

type CenterTab = 'dashboard' | 'projects' | 'files' | 'delivery' | 'settings';
type DeliveryRow = Record<string, string | number> & { id: string; cbm: number };

type Props = {
  onBack: () => void;
  onLoadProject?: (project: any) => Promise<void> | void;
  projectPayload?: any;
  initialTab?: CenterTab;
  showTabs?: boolean;
};

const isDesktop = () => typeof window !== 'undefined' && Boolean(window.rubaDesktop);
const makeRowId = () => `delivery_row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const deliveryColumns = [
  ['date', 'DATE'], ['season', 'SEASON'], ['customerCode', 'CUSTOMER CODE'], ['customerName', 'CUSTOMER NAME'],
  ['customerPo', 'CUSTOMER PO'], ['color', 'COLOR'], ['dest', 'DEST'], ['poQty', 'PO QTY'],
  ['targetBooking', 'TARGET DATE FOR BOOKING'], ['actualBooking', 'ACTUAL DATE FOR BOOKING'],
  ['targetApproval', 'TARGET DATE RECEIVED'], ['actualApproval', 'ACTUAL DATE RECEIVED'], ['pcsPerCtn', 'PCS PER CTN'],
  ['packingType', 'PACKING TYPE'], ['numberOfCarton', 'NUMBER OF CARTON'], ['length', 'L'], ['height', 'H'], ['width', 'W'],
  ['cbm', 'CBM'], ['grossWeightPerCarton', 'GROSS WEIGHT PER CARTON'], ['shipMode', 'INITIAL SHIP MODE'], ['targetPl', 'TARGET PL']
] as const;
const numericKeys = new Set(['poQty', 'pcsPerCtn', 'numberOfCarton', 'length', 'height', 'width', 'cbm', 'grossWeightPerCarton']);
const emptyRow = (): DeliveryRow => Object.fromEntries([['id', makeRowId()], ...deliveryColumns.map(([key]) => [key, key === 'cbm' ? 0 : ''])]) as DeliveryRow;
const calculateCbm = (row: Partial<DeliveryRow>) => {
  const l = Number(row.length || 0); const h = Number(row.height || 0); const w = Number(row.width || 0);
  return l > 0 && h > 0 && w > 0 ? Number(((l * h * w) / 1000000).toFixed(6)) : 0;
};
const normalizeRow = (input: Record<string, any>): DeliveryRow => {
  const row = { ...emptyRow(), ...input, id: String(input.id || makeRowId()) } as DeliveryRow;
  deliveryColumns.forEach(([key]) => { if (numericKeys.has(key)) row[key] = Number(row[key] || 0); });
  row.cbm = calculateCbm(row);
  return row;
};

export default function IndustrialCenter({ onBack, onLoadProject, projectPayload, initialTab = 'dashboard', showTabs = true }: Props) {
  const [tab, setTab] = useState<CenterTab>(initialTab);
  const [summary, setSummary] = useState({ projects: 0, packingLists: 0, files: 0, deliveryPlans: 0, breakdownRows: 0 });
  const [projects, setProjects] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [deliverySearch, setDeliverySearch] = useState('');
  const [storageRoot, setStorageRoot] = useState('');
  const [projectName, setProjectName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [customer, setCustomer] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [planName, setPlanName] = useState('');
  const [planId, setPlanId] = useState('');
  const [rows, setRows] = useState<DeliveryRow[]>([emptyRow()]);
  const [zoom, setZoom] = useState(() => Number(localStorage.getItem('ruba_ui_zoom') || 100));
  const [accent, setAccent] = useState(() => localStorage.getItem('ruba_accent') || '#0f766e');
  const [headerColor, setHeaderColor] = useState(() => localStorage.getItem('ruba_table_header_color') || '#0f766e');
  const [message, setMessage] = useState('');

  const refresh = async () => {
    if (!isDesktop()) return;
    const api = window.rubaDesktop!;
    const [nextSummary, nextProjects, nextFiles, root] = await Promise.all([api.dbSummary(), api.listProjects(search), api.listFiles({ search }), api.getStorageRoot()]);
    setSummary(nextSummary); setProjects(nextProjects); setFiles(nextFiles); setStorageRoot(root);
    if (!selectedProjectId && nextProjects[0]) setSelectedProjectId(nextProjects[0].id);
  };
  useEffect(() => { refresh().catch(() => setMessage('Le centre local sera disponible dans la version desktop.')); }, [search]);
  useEffect(() => { setTab(initialTab); }, [initialTab]);
  useEffect(() => { document.body.style.zoom = `${zoom / 100}`; document.documentElement.style.setProperty('--ruba-accent', accent); return () => { document.body.style.zoom = '1'; }; }, [zoom, accent]);
  useEffect(() => { localStorage.setItem('ruba_table_header_color', headerColor); }, [headerColor]);
  useEffect(() => {
    if (!selectedProjectId || !isDesktop()) return;
    window.rubaDesktop!.listDeliveryPlans(selectedProjectId).then((nextPlans) => {
      setPlans(nextPlans);
      const latest = nextPlans[0];
      if (latest) {
        const payload = typeof latest.payload_json === 'string' ? JSON.parse(latest.payload_json || '{}') : latest.payload || {};
        setPlanId(latest.id); setPlanName(latest.plan_name || 'Delivery Plan');
        if (Array.isArray(payload.rows) && payload.rows.length) setRows(payload.rows.map(normalizeRow));
      }
    }).catch(() => setMessage('Impossible de charger le Delivery Plan du travail.'));
  }, [selectedProjectId]);

  const filteredRows = useMemo(() => {
    const q = deliverySearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row => deliveryColumns.some(([key]) => String(row[key] ?? '').toLowerCase().includes(q)));
  }, [rows, deliverySearch]);
  const totalCbm = useMemo(() => rows.reduce((sum, row) => sum + Number(row.cbm || 0), 0), [rows]);

  const applyZoom = (value: number) => { const next = Math.max(80, Math.min(125, value)); setZoom(next); localStorage.setItem('ruba_ui_zoom', String(next)); };
  const saveAccent = (value: string) => { setAccent(value); localStorage.setItem('ruba_accent', value); };
  const updateRow = (id: string, key: string, value: string) => setRows(prev => prev.map(row => {
    if (row.id !== id) return row;
    const next = { ...row, [key]: numericKeys.has(key) ? Number(value || 0) : value } as DeliveryRow;
    if (['length', 'height', 'width'].includes(key)) next.cbm = calculateCbm(next);
    return next;
  }));
  const deleteRow = (id: string) => setRows(prev => prev.length > 1 ? prev.filter(row => row.id !== id) : [emptyRow()]);
  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData('text/plain');
    if (!text.includes('\t') && !text.includes('\n')) return;
    event.preventDefault();
    const parsed = text.trim().split(/\r?\n/).map(line => line.split('\t'));
    if (!parsed.length) return;
    const first = parsed[0].map(value => value.trim().toUpperCase());
    const aliases: Record<string, string> = Object.fromEntries(deliveryColumns.flatMap(([key, label]) => [[label, key], [key.toUpperCase(), key]]));
    const hasHeaders = first.some(value => Boolean(aliases[value]));
    const keys = hasHeaders ? first.map(value => aliases[value] || '') : deliveryColumns.map(([key]) => key);
    const sourceRows = hasHeaders ? parsed.slice(1) : parsed;
    const pasted = sourceRows.filter(line => line.some(Boolean)).map(line => {
      const input: Record<string, any> = {};
      keys.forEach((key, index) => { if (key) input[key] = line[index] || ''; });
      return normalizeRow(input);
    });
    if (pasted.length) { setRows(pasted); setMessage(`${pasted.length} ligne(s) importée(s) depuis Excel.`); }
  };
  const createProject = async () => {
    if (!isDesktop() || !orderNumber.trim()) { setMessage('Le numéro de commande est obligatoire.'); return; }
    const name = `${orderNumber.trim()}${customer.trim() ? ` — ${customer.trim()}` : ''}`;
    const saved = await window.rubaDesktop!.saveProject({ name: projectName.trim() || name, customer: customer.trim(), orderNumber: orderNumber.trim(), status: 'draft', payload: projectPayload || {} });
    setProjectName(''); setOrderNumber(''); setCustomer(''); setSelectedProjectId(saved.id); setMessage(`Projet créé : ${saved.name}`); await refresh();
  };
  const chooseRoot = async () => { if (!isDesktop()) return; const next = await window.rubaDesktop!.chooseStorageRoot(); if (next) { setStorageRoot(next); setMessage('Dossier de stockage modifié.'); } };
  const capture = async () => { if (!isDesktop()) return; const result = await window.rubaDesktop!.captureWindow(); if (!result.canceled) setMessage(`Capture enregistrée : ${result.filePath}`); };
  const savePlan = async () => {
    if (!isDesktop() || !selectedProjectId) { setMessage('Choisissez un travail avant d’enregistrer le plan.'); return; }
    const plan = await window.rubaDesktop!.saveDeliveryPlan({ id: planId || undefined, projectId: selectedProjectId, planName: planName.trim() || 'Delivery Plan', payload: { columns: deliveryColumns, rows } });
    setPlanId(plan.id); setPlanName(plan.plan_name || planName || 'Delivery Plan'); await window.rubaDesktop!.replaceBreakdown({ deliveryPlanId: plan.id, rows }); setMessage(`Delivery Plan enregistré : ${rows.length} ligne(s), ${totalCbm.toFixed(4)} m³.`); await refresh();
  };
  const openProject = async (project: any) => { try { const full = await window.rubaDesktop?.getProject(project.id); if (!full) throw new Error('Projet introuvable.'); await onLoadProject?.(full); setMessage(`Projet chargé : ${project.name}`); } catch (error: any) { setMessage(`Erreur de chargement : ${error?.message || error}`); } };
  const tabs = useMemo(() => [['dashboard', 'Dashboard'], ['projects', 'Travaux'], ['files', 'Fichiers Excel'], ['delivery', 'Delivery Plan'], ['settings', 'Paramètres']] as const, []);

  return <section className="flex-1 min-h-0 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ ['--ruba-accent' as any]: accent }}>
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Ruba Industrial Workspace</p><h2 className="text-xl font-black text-slate-900">Centre de pilotage</h2></div><div className="flex flex-wrap items-center gap-2"><button onClick={() => applyZoom(zoom - 5)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700" title="Réduire le zoom"><ZoomOut size={16}/></button><span className="min-w-12 text-center text-xs font-bold text-slate-600">{zoom}%</span><button onClick={() => applyZoom(zoom + 5)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700" title="Augmenter le zoom"><ZoomIn size={16}/></button><button onClick={capture} className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"><Camera size={15}/> Capture</button><button onClick={onBack} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Retour au colisage</button></div></div>
    {showTabs && <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-5 py-3">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`rounded-xl px-3 py-2 text-xs font-bold ${tab === id ? 'text-white shadow-sm' : 'bg-slate-50 text-slate-600'}`} style={tab === id ? { backgroundColor: accent } : undefined}>{label}</button>)}</div>}
    {message && <div className="mx-5 mt-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"><span>{message}</span><button onClick={() => setMessage('')}><X size={14}/></button></div>}
    {tab === 'dashboard' && <div className="grid gap-4 p-5 md:grid-cols-5">{[['Travaux', summary.projects], ['Packing Lists', summary.packingLists], ['Fichiers', summary.files], ['Delivery Plans', summary.deliveryPlans], ['Lignes breakdown', summary.breakdownRows]].map(([label, value]: any) => <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: accent }} /><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-slate-900">{value}</p></div>)}<div className="md:col-span-4 rounded-2xl border border-slate-200 p-5"><div className="flex items-center justify-between"><h3 className="font-black text-slate-900">Vue opérationnelle</h3><button onClick={() => refresh()} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><RefreshCw size={14}/> Actualiser</button></div><p className="mt-3 text-sm text-slate-600">Les projets, fichiers, Delivery Plans et breakdowns sont centralisés dans la base locale de Ruba.</p></div></div>}
    {tab === 'projects' && <div className="space-y-4 p-5"><div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4"><input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="N° de commande *" className="rounded-lg border px-3 py-2 text-sm"/><input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Customer" className="rounded-lg border px-3 py-2 text-sm"/><input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Nom personnalisé (facultatif)" className="rounded-lg border px-3 py-2 text-sm"/><button onClick={createProject} className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ backgroundColor: accent }}><Plus size={14}/> Nouveau travail</button></div><div className="overflow-auto rounded-xl border"><table className="w-full min-w-[780px] text-left text-sm"><thead style={{ backgroundColor: headerColor }} className="text-xs uppercase text-white"><tr><th className="px-4 py-3">ID projet</th><th className="px-4 py-3">Commande</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">PO</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Mise à jour</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{projects.map(p => <tr key={p.id} className="border-t"><td className="px-4 py-3 font-mono text-xs">{p.id}</td><td className="px-4 py-3 font-bold">{p.order_number || '—'}</td><td className="px-4 py-3">{p.customer || '—'}</td><td className="px-4 py-3">{p.po_number || '—'}</td><td className="px-4 py-3">{p.status}</td><td className="px-4 py-3 text-slate-500">{new Date(p.updated_at).toLocaleString('fr-FR')}</td><td className="px-4 py-3"><div className="flex justify-end gap-3"><button onClick={() => openProject(p)} className="rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-bold text-teal-700">Charger</button><button onClick={async () => { if (!window.confirm(`Supprimer le projet « ${p.name} » ?`)) return; await window.rubaDesktop?.deleteProject(p.id); await refresh(); }} className="text-rose-600"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div></div>}
    {tab === 'files' && <div className="space-y-4 p-5"><div className="flex items-center gap-2"><div className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-2"><Search size={15} className="text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrer les fichiers et projets" className="w-full text-sm outline-none"/></div><button onClick={refresh} className="rounded-lg border p-2"><RefreshCw size={16}/></button><button onClick={async () => { const imported = await window.rubaDesktop?.importFile({ fileKind: 'excel', projectId: selectedProjectId || undefined }); if (imported) { setMessage(`Fichier importé : ${imported.name}`); await refresh(); } }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white" style={{ backgroundColor: accent }}><Upload size={14}/> Importer Excel</button></div><div className="overflow-auto rounded-xl border"><table className="w-full min-w-[760px] text-left text-sm"><thead style={{ backgroundColor: headerColor }} className="text-xs uppercase text-white"><tr><th className="px-4 py-3">Fichier</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Projet</th><th className="px-4 py-3">Chemin</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{files.map(f => <tr key={f.id} className="border-t"><td className="px-4 py-3 font-bold">{f.name}</td><td className="px-4 py-3">{f.file_kind}</td><td className="px-4 py-3">{f.project_name || '—'}</td><td className="max-w-md truncate px-4 py-3 text-slate-500">{f.stored_path}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => window.rubaDesktop?.openStoredFile?.(f.stored_path)} className="rounded border px-3 py-1 text-xs font-bold">Ouvrir</button><button onClick={async () => { if (!window.confirm(`Supprimer « ${f.name} » ?`)) return; await window.rubaDesktop?.deleteFile(f.id); await refresh(); }} className="rounded border border-rose-200 p-1.5 text-rose-600"><Trash2 size={14}/></button></div></td></tr>)}</tbody></table></div></div>}
    {tab === 'delivery' && <div className="space-y-4 p-5"><div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4"><select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="">Choisir un travail</option>{projects.map(p => <option key={p.id} value={p.id}>{p.order_number || p.name} — {p.customer || 'Sans client'}</option>)}</select><input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Nom du Delivery Plan" className="rounded-lg border px-3 py-2 text-sm"/><button onClick={savePlan} className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ backgroundColor: accent }}><Save size={14}/> Enregistrer</button></div><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 rounded-lg border px-3 py-2"><Search size={15} className="text-slate-400"/><input value={deliverySearch} onChange={e => setDeliverySearch(e.target.value)} placeholder="Rechercher dans le plan..." className="w-72 max-w-full text-sm outline-none"/></div><div className="text-xs font-bold text-slate-600">{rows.length} ligne(s) · CBM total : <span className="text-teal-700">{totalCbm.toFixed(4)} m³</span></div></div><div className="overflow-auto rounded-xl border" onPaste={handlePaste}><table className="min-w-[2400px] text-left text-xs"><thead style={{ backgroundColor: headerColor }} className="sticky top-0 z-10 text-[10px] uppercase text-white"><tr>{deliveryColumns.map(([, label]) => <th key={label} className="whitespace-nowrap px-2 py-3">{label}</th>)}<th className="sticky right-0 bg-rose-700 px-2 py-3">ACTION</th></tr></thead><tbody>{filteredRows.map(row => <tr key={row.id} className="border-t hover:bg-slate-50">{deliveryColumns.map(([key]) => <td key={key} className="p-1"><input readOnly={key === 'cbm'} type={numericKeys.has(key) ? 'number' : 'text'} value={String(row[key] ?? '')} onChange={e => updateRow(row.id, key, e.target.value)} className={`w-full min-w-[76px] rounded border px-2 py-1.5 text-xs ${key === 'cbm' ? 'bg-teal-50 font-bold text-teal-800' : 'bg-white'}`}/></td>)}<td className="sticky right-0 bg-white p-1"><button onClick={() => deleteRow(row.id)} className="rounded border border-rose-200 p-1.5 text-rose-600" title="Supprimer la ligne"><Trash2 size={14}/></button></td></tr>)}</tbody></table></div><div className="flex flex-wrap gap-2"><button onClick={addRow} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><Plus size={14}/> Ajouter une ligne</button><span className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">Copiez directement depuis Excel puis collez dans la grille. La première ligne peut contenir les en-têtes.</span></div>{plans.length > 0 && <div className="rounded-xl border border-slate-200 p-3"><p className="mb-2 text-xs font-black uppercase text-slate-500">Plans enregistrés pour ce projet</p><div className="flex flex-wrap gap-2">{plans.map(plan => <button key={plan.id} onClick={() => { const payload = typeof plan.payload_json === 'string' ? JSON.parse(plan.payload_json || '{}') : plan.payload || {}; setPlanId(plan.id); setPlanName(plan.plan_name); if (Array.isArray(payload.rows)) setRows(payload.rows.map(normalizeRow)); }} className={`rounded-lg border px-3 py-2 text-xs font-bold ${plan.id === planId ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200'}`}>{plan.plan_name}</button>)}</div></div>}</div>}
    {tab === 'settings' && <div className="space-y-5 p-5"><div className="rounded-2xl border border-slate-200 p-5"><h3 className="font-black">Stockage local</h3><p className="mt-2 break-all text-xs text-slate-500">{storageRoot || 'Navigateur : stockage local du profil'}</p><button onClick={chooseRoot} className="mt-3 flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold"><FolderOpen size={14}/> Modifier le dossier</button></div><div className="rounded-2xl border border-slate-200 p-5"><h3 className="font-black">Thème et couleurs persistants</h3><div className="mt-4 grid gap-4 md:grid-cols-2"><label className="flex items-center gap-3 text-sm font-semibold">Couleur principale<input type="color" value={accent} onChange={e => saveAccent(e.target.value)} className="h-10 w-14 cursor-pointer rounded border"/></label><label className="flex items-center gap-3 text-sm font-semibold">En-têtes de tableaux<input type="color" value={headerColor} onChange={e => setHeaderColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded border"/></label></div><div className="mt-4 flex gap-2"><button onClick={() => { saveAccent('#0f766e'); setHeaderColor('#0f766e'); setZoom(100); localStorage.setItem('ruba_ui_zoom', '100'); }} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><Save size={14}/> Réinitialiser</button><span className="text-xs text-slate-500">Les choix sont conservés au prochain démarrage.</span></div></div></div>}
  </section>;
}
