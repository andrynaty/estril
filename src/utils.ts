import { ColorConfig, ColorResult, PackedRow, SizeDetails, OrderMeta, ModelsDatabase } from './types';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Palette color helpers for visual alignment
export const PALETTE = [
  '#4f8ef7', '#38d9a9', '#f5a623', '#9b72f5', '#e05c5c', '#06b6d4', '#ec4899', '#f6e05e'
];

export const BG_COLORS_DARK = [
  'rgba(79,142,247,0.13)', 'rgba(56,217,169,0.13)', 'rgba(245,166,35,0.13)', 'rgba(155,114,245,0.13)',
  'rgba(224,92,92,0.13)', 'rgba(6,182,212,0.13)', 'rgba(236,72,153,0.13)', 'rgba(246,224,94,0.13)'
];

export const BG_COLORS_LIGHT = [
  'rgba(79,142,247,0.08)', 'rgba(56,217,169,0.08)', 'rgba(245,166,35,0.08)', 'rgba(155,114,245,0.08)',
  'rgba(224,92,92,0.08)', 'rgba(6,182,212,0.08)', 'rgba(236,72,153,0.08)', 'rgba(246,224,94,0.08)'
];

export function parseCartonRange(range: string): { start: string; end: string } {
  if (!range) return { start: '', end: '' };
  const parts = range.split('-');
  const start = parts[0]?.trim() || '';
  const end = (parts[1] || parts[0])?.trim() || '';
  return { start, end };
}

export function isRemainderRow(row: PackedRow, colorConfig: ColorConfig | undefined): boolean {
  if (row.type === 'mixed' || row.type === 'solid_r') {
    return true;
  }
  if (row.type === 'solid') {
    const sizeNames = Object.keys(row.sizes);
    if (sizeNames.length === 1) {
      const t = sizeNames[0];
      const cap = colorConfig?.sizes[t]?.cap ?? 25;
      if (row.pcsPerCarton < cap) {
        return true;
      }
    }
  }
  return false;
}

export function getRemainderRowColor(
  row: PackedRow,
  res: ColorResult,
  colorConfig: ColorConfig | undefined,
  darkMode: boolean
) {
  if (!isRemainderRow(row, colorConfig)) return null;
  
  const remainderRows = res.rows.filter(r => isRemainderRow(r, colorConfig));
  const index = remainderRows.findIndex(r => r.cartonRange === row.cartonRange && r.type === row.type && r.pcsPerCarton === row.pcsPerCarton);
  if (index === -1) return null;
  
  const palette = [
    { bg: '#fef5ad', text: '#000000', darkBg: '#b45309', darkText: '#ffffff' }, // Amber/Yellow
    { bg: '#dcfce7', text: '#000000', darkBg: '#15803d', darkText: '#ffffff' }, // Green
    { bg: '#dbeafe', text: '#000000', darkBg: '#1d4ed8', darkText: '#ffffff' }, // Blue
    { bg: '#fce7f3', text: '#000000', darkBg: '#be185d', darkText: '#ffffff' }, // Pink
    { bg: '#f3e8ff', text: '#000000', darkBg: '#7e22ce', darkText: '#ffffff' }, // Purple
    { bg: '#ffedd5', text: '#000000', darkBg: '#c2410c', darkText: '#ffffff' }, // Orange
    { bg: '#ccfbf1', text: '#000000', darkBg: '#0f766e', darkText: '#ffffff' }, // Teal
    { bg: '#e0f2fe', text: '#000000', darkBg: '#0369a1', darkText: '#ffffff' }  // Sky Blue
  ];
  
  const c = palette[index % palette.length];
  return {
    bg: darkMode ? c.darkBg : c.bg,
    text: darkMode ? '#ffffff' : '#000000',
    border: darkMode ? 'border-amber-500/30' : 'border-slate-300',
    rawBg: c.bg,
    rawText: '#000000'
  };
}

/**
 * Computes how items are packed and calculates weights, CBM, and carton numbers sequentially.
 */
export function computeColorResult(
  colorConfig: ColorConfig,
  globalMode: 'strict_solide' | 'mixte_autorise',
  forceSingleCarton: boolean,
  maxSizesPerBox: number,
  colorIndex: number,
  forceSubCapSolidInMixed: boolean = false
): ColorResult {
  const { nom, mode: configMode, tailles, sizes } = colorConfig;
  const color = PALETTE[colorIndex % PALETTE.length];
  const activeMode = configMode === 'inherit' ? globalMode : configMode;

  const rows: PackedRow[] = [];
  let numCartonStart = 1;

  // Sizes packed summary
  const packedSizes: { [sizeName: string]: number } = {};
  tailles.forEach(t => { packedSizes[t] = 0; });

  // 1. Force single carton mode
  if (forceSingleCarton) {
    const rowSizes: { [sizeName: string]: number } = {};
    let totalPcs = 0;
    let maxWCarton = 0.80;
    let maxCbm = 0.08;
    let skusSet = new Set<string>();

    tailles.forEach(t => {
      const q = sizes[t]?.qtyTot || 0;
      if (q > 0) {
        rowSizes[t] = q;
        totalPcs += q;
        if (sizes[t].wCarton > maxWCarton) maxWCarton = sizes[t].wCarton;
        if (sizes[t].cbmUnit > maxCbm) maxCbm = sizes[t].cbmUnit;
        if (sizes[t].sku) skusSet.add(sizes[t].sku);
        packedSizes[t] += q;
      }
    });

    if (totalPcs > 0) {
      let netWeightTotal = 0;
      tailles.forEach(t => {
        netWeightTotal += (rowSizes[t] || 0) * (sizes[t]?.wPiece || 0);
      });

      rows.push({
        cartonRange: '1-1',
        type: 'solid',
        nbr: 1,
        sizes: rowSizes,
        pcsPerCarton: totalPcs,
        totalPcs,
        skus: Array.from(skusSet),
        netWeightRow: netWeightTotal,
        grossWeightRow: netWeightTotal + maxWCarton,
        cbmRow: maxCbm
      });
    }

    const calculatedTotals = {
      c: 1,
      p: totalPcs,
      n: totalPcs > 0 ? rows[0].netWeightRow : 0,
      g: totalPcs > 0 ? rows[0].grossWeightRow : 0,
      v: totalPcs > 0 ? rows[0].cbmRow : 0,
      sizes: packedSizes
    };

    return {
      nom,
      color,
      tailles,
      mode: activeMode,
      rows,
      totals: calculatedTotals
    };
  }

  // 1b. Custom Remainder Packing Logic
  if (activeMode === 'mixte_autorise' && colorConfig.customRemaindersEnabled && colorConfig.customRemainders && colorConfig.customRemainders.length > 0) {
    // Pack full cartons first
    tailles.forEach(t => {
      const q = sizes[t]?.qtyTot || 0;
      const cap = sizes[t]?.cap || 25;
      const wPiece = sizes[t]?.wPiece || 0.25;
      const wCarton = sizes[t]?.wCarton || 0.80;
      const cbmUnit = sizes[t]?.cbmUnit || 0.08;
      const sizeSku = sizes[t]?.sku || '';

      if (q <= 0) return;

      const n = Math.floor(q / cap);
      if (n > 0) {
        const rowSizes = { [t]: cap };
        const totalPcs = cap * n;
        const netW = cap * wPiece;

        rows.push({
          cartonRange: `${numCartonStart}-${numCartonStart + n - 1}`,
          type: 'solid',
          nbr: n,
          sizes: rowSizes,
          pcsPerCarton: cap,
          totalPcs,
          skus: sizeSku ? [sizeSku] : [],
          netWeightRow: netW * n,
          grossWeightRow: (netW + wCarton) * n,
          cbmRow: cbmUnit * n
        });
        numCartonStart += n;
        packedSizes[t] += totalPcs;
      }
    });

    // Pack the custom cartons specified
    colorConfig.customRemainders.forEach(cc => {
      const mixedSizes: { [sizeName: string]: number } = {};
      let maxWCarton = 0.80;
      let maxCbm = 0.08;
      let netWeight = 0;
      const rowSkusSet = new Set<string>();
      let boxSum = 0;
      let hasItems = false;

      Object.entries(cc.sizes).forEach(([sz, qte]) => {
        if (qte > 0 && tailles.includes(sz)) {
          hasItems = true;
          mixedSizes[sz] = qte;
          boxSum += qte;
          const spec = sizes[sz];
          if (spec) {
            if (spec.wCarton > maxWCarton) maxWCarton = spec.wCarton;
            if (spec.cbmUnit > maxCbm) maxCbm = spec.cbmUnit;
            netWeight += qte * spec.wPiece;
            if (spec.sku) rowSkusSet.add(spec.sku);
          }
          packedSizes[sz] += qte;
        }
      });

      if (hasItems) {
        rows.push({
          cartonRange: `${numCartonStart}-${numCartonStart}`,
          type: 'mixed',
          nbr: 1,
          sizes: mixedSizes,
          pcsPerCarton: boxSum,
          totalPcs: boxSum,
          skus: Array.from(rowSkusSet),
          netWeightRow: netWeight,
          grossWeightRow: netWeight + maxWCarton,
          cbmRow: maxCbm
        });
        numCartonStart++;
      }
    });

    // Pack any leftovers (unallocated remainders) as solid_r (individual solid remainder cartons)
    tailles.forEach(t => {
      const q = sizes[t]?.qtyTot || 0;
      const cap = sizes[t]?.cap || 25;
      const r = q % cap;

      let allocatedInCustom = 0;
      colorConfig.customRemainders?.forEach(cc => {
        allocatedInCustom += cc.sizes[t] || 0;
      });

      const leftover = r - allocatedInCustom;
      if (leftover > 0) {
        const rowSizes = { [t]: leftover };
        const wPiece = sizes[t]?.wPiece || 0.25;
        const wCarton = sizes[t]?.wCarton || 0.80;
        const cbmUnit = sizes[t]?.cbmUnit || 0.08;
        const sizeSku = sizes[t]?.sku || '';
        const netW = leftover * wPiece;

        rows.push({
          cartonRange: `${numCartonStart}-${numCartonStart}`,
          type: 'solid_r',
          nbr: 1,
          sizes: rowSizes,
          pcsPerCarton: leftover,
          totalPcs: leftover,
          skus: sizeSku ? [sizeSku] : [],
          netWeightRow: netW,
          grossWeightRow: netW + wCarton,
          cbmRow: cbmUnit
        });
        numCartonStart++;
        packedSizes[t] += leftover;
      }
    });

    // Calculate global totals
    let totC = 0;
    let totP = 0;
    let totN = 0;
    let totG = 0;
    let totV = 0;

    rows.forEach(r => {
      totC += r.nbr;
      totP += r.totalPcs;
      totN += r.netWeightRow;
      totG += r.grossWeightRow;
      totV += r.cbmRow;
    });

    return {
      nom,
      color,
      tailles,
      mode: activeMode,
      colorIndex,
      rows,
      totals: {
        c: totC,
        p: totP,
        n: totN,
        g: totG,
        v: totV,
        sizes: packedSizes
      }
    };
  }

  // 2. Standard packing logic
  interface RestInfo {
    taille: string;
    qte: number;
    cap: number;
    sku: string;
  }
  const restInfoList: RestInfo[] = [];

  tailles.forEach(t => {
    const q = sizes[t]?.qtyTot || 0;
    const cap = sizes[t]?.cap || 25;
    const wPiece = sizes[t]?.wPiece || 0.25;
    const wCarton = sizes[t]?.wCarton || 0.80;
    const cbmUnit = sizes[t]?.cbmUnit || 0.08;
    const sizeSku = sizes[t]?.sku || '';

    if (q <= 0) return;

    if (activeMode === 'mixte_autorise') {
      if (forceSubCapSolidInMixed && q < cap) {
        // Treat total quantity < cap as a full solid carton when option is enabled
        const rowSizes = { [t]: q };
        const netW = q * wPiece;

        rows.push({
          cartonRange: `${numCartonStart}-${numCartonStart}`,
          type: 'solid',
          nbr: 1,
          sizes: rowSizes,
          pcsPerCarton: q,
          totalPcs: q,
          skus: sizeSku ? [sizeSku] : [],
          netWeightRow: netW,
          grossWeightRow: netW + wCarton,
          cbmRow: cbmUnit
        });
        numCartonStart++;
        packedSizes[t] += q;
      } else {
        const n = Math.floor(q / cap);
        const r = q % cap;

        if (n > 0) {
          const rowSizes = { [t]: cap };
          const totalPcs = cap * n;
          const netW = cap * wPiece;

          rows.push({
            cartonRange: `${numCartonStart}-${numCartonStart + n - 1}`,
            type: 'solid',
            nbr: n,
            sizes: rowSizes,
            pcsPerCarton: cap,
            totalPcs,
            skus: sizeSku ? [sizeSku] : [],
            netWeightRow: netW * n,
            grossWeightRow: (netW + wCarton) * n,
            cbmRow: cbmUnit * n
          });
          numCartonStart += n;
          packedSizes[t] += totalPcs;
        }

        if (r > 0) {
          restInfoList.push({ taille: t, qte: r, cap, sku: sizeSku });
        }
      }
    } else {
      // Solid strict pack
      const n = Math.floor(q / cap);
      const r = q % cap;

      if (n > 0) {
        const rowSizes = { [t]: cap };
        const totalPcs = cap * n;
        const netW = cap * wPiece;

        rows.push({
          cartonRange: `${numCartonStart}-${numCartonStart + n - 1}`,
          type: 'solid',
          nbr: n,
          sizes: rowSizes,
          pcsPerCarton: cap,
          totalPcs,
          skus: sizeSku ? [sizeSku] : [],
          netWeightRow: netW * n,
          grossWeightRow: (netW + wCarton) * n,
          cbmRow: cbmUnit * n
        });
        numCartonStart += n;
        packedSizes[t] += totalPcs;
      }

      if (r > 0) {
        const rowSizes = { [t]: r };
        const netW = r * wPiece;

        rows.push({
          cartonRange: `${numCartonStart}-${numCartonStart}`,
          type: 'solid_r',
          nbr: 1,
          sizes: rowSizes,
          pcsPerCarton: r,
          totalPcs: r,
          skus: sizeSku ? [sizeSku] : [],
          netWeightRow: netW,
          grossWeightRow: netW + wCarton,
          cbmRow: cbmUnit
        });
        numCartonStart++;
        packedSizes[t] += r;
      }
    }
  });

  // Combine remains for mixed authorized packing
  if (activeMode === 'mixte_autorise' && restInfoList.length > 0) {
    const list = [...restInfoList];
    while (list.length > 0) {
      // Sort remains by quantity descending to pack largest sets first
      list.sort((a, b) => b.qte - a.qte);

      // Capacity is the max container capacity of the target sizes
      const limitGroup = list.slice(0, maxSizesPerBox);
      const cartonCap = Math.max(...limitGroup.map(item => item.cap));

      const selectedList: RestInfo[] = [];
      let boxSum = 0;

      for (let i = 0; i < list.length && selectedList.length < maxSizesPerBox; i++) {
        const item = list[i];
        if (boxSum + item.qte <= cartonCap) {
          selectedList.push(item);
          boxSum += item.qte;
        }
      }

      // If nothing matches without overfilling, force take at least the first item
      if (selectedList.length === 0 && list.length > 0) {
        const first = list[0];
        selectedList.push(first);
        boxSum += first.qte;
      }

      // Remove selected size fragments from the active remains pool
      selectedList.forEach(sel => {
        const fIdx = list.findIndex(item => item.taille === sel.taille);
        if (fIdx >= 0) list.splice(fIdx, 1);
      });

      // Construct metrics for mixed carton
      const mixedSizes: { [sizeName: string]: number } = {};
      let maxWCarton = 0.80;
      let maxCbm = 0.08;
      let netWeight = 0;
      const rowSkusSet = new Set<string>();

      selectedList.forEach(item => {
        mixedSizes[item.taille] = item.qte;
        const spec = sizes[item.taille];
        if (spec) {
          if (spec.wCarton > maxWCarton) maxWCarton = spec.wCarton;
          if (spec.cbmUnit > maxCbm) maxCbm = spec.cbmUnit;
          netWeight += item.qte * spec.wPiece;
          if (spec.sku) rowSkusSet.add(spec.sku);
        }
        packedSizes[item.taille] += item.qte;
      });

      rows.push({
        cartonRange: `${numCartonStart}-${numCartonStart}`,
        type: 'mixed',
        nbr: 1,
        sizes: mixedSizes,
        pcsPerCarton: boxSum,
        totalPcs: boxSum,
        skus: Array.from(rowSkusSet),
        netWeightRow: netWeight,
        grossWeightRow: netWeight + maxWCarton,
        cbmRow: maxCbm
      });
      numCartonStart++;
    }
  }

  // Calculate global totals
  let totC = 0;
  let totP = 0;
  let totN = 0;
  let totG = 0;
  let totV = 0;

  rows.forEach(r => {
    totC += r.nbr;
    totP += r.totalPcs;
    totN += r.netWeightRow;
    totG += r.grossWeightRow;
    totV += r.cbmRow;
  });

  return {
    nom,
    color,
    tailles,
    mode: activeMode,
    colorIndex,
    rows,
    totals: {
      c: totC,
      p: totP,
      n: totN,
      g: totG,
      v: totV,
      sizes: packedSizes
    }
  };
}

/**
 * Generates SQL DB snapshot statements.
 */
export function generateSQLString(
  meta: OrderMeta,
  globalMode: string,
  maxSizes: number,
  forceSingle: boolean,
  couleurs: {
    nom: string;
    mode: string;
    selectedPieceWeightModelName?: string;
    selectedCartonWeightModelName?: string;
    selectedDimModelName?: string;
  }[],
  sizesInputs: { [colorIdx: number]: { tailles: string[]; D: { [size: string]: SizeDetails } } },
  allResults: ColorResult[],
  forceSubCapSolid: boolean = false
): string {
  const ts = new Date().toISOString();
  let sql = `-- PACKING LIST PRO v10 — SQL EXPORT\n-- Généré le: ${ts}\n\n`;

  sql += `CREATE TABLE IF NOT EXISTS packing_config(\n  key TEXT PRIMARY KEY,\n  value TEXT\n);\n`;
  sql += `CREATE TABLE IF NOT EXISTS colors(\n  id INTEGER PRIMARY KEY,\n  nom TEXT,\n  mode TEXT DEFAULT 'inherit',\n  selected_piece_weight_model TEXT DEFAULT '',\n  selected_carton_weight_model TEXT DEFAULT '',\n  selected_dim_model TEXT DEFAULT ''\n);\n`;
  sql += `CREATE TABLE IF NOT EXISTS sizes(\n  color_id INTEGER,\n  size_index INTEGER,\n  name TEXT,\n  qty INTEGER DEFAULT 0,\n  cap INTEGER DEFAULT 25,\n  w_piece REAL DEFAULT 0.250,\n  w_carton REAL DEFAULT 0.80,\n  dim_L REAL DEFAULT 61,\n  dim_l REAL DEFAULT 41,\n  dim_h REAL DEFAULT 30,\n  sku TEXT DEFAULT '',\n  PRIMARY KEY(color_id, size_index)\n);\n`;
  sql += `CREATE TABLE IF NOT EXISTS packing_snapshot(\n  id INTEGER PRIMARY KEY DEFAULT 1,\n  all_results_json TEXT,\n  generated_at TEXT\n);\n\n`;

  sql += 'DELETE FROM packing_config;\n';

  const cfg: [string, string][] = [
    ['order', meta.order],
    ['customer', meta.customer],
    ['po', meta.po],
    ['ref_client', meta.refClient],
    ['invoice', meta.invoice],
    ['style', meta.style],
    ['style_number', meta.styleNumber],
    ['sku', meta.sku],
    ['yarn', meta.yarn],
    ['composition', meta.composition],
    ['destination', meta.destination],
    ['address', meta.address],
    ['pays', meta.pays],
    ['port_depart', meta.portDepart],
    ['port_arrivee', meta.portArrivee],
    ['global_mode', globalMode],
    ['max_sizes', String(maxSizes)],
    ['filename', meta.filename],
    ['force_single_ctn', forceSingle ? '1' : '0'],
    ['force_subcap_solid', forceSubCapSolid ? '1' : '0']
  ];

  const esc = (s: string) => String(s || '').replace(/'/g, "''");

  cfg.forEach(([k, v]) => {
    sql += `INSERT INTO packing_config(key, value) VALUES ('${esc(k)}', '${esc(v)}');\n`;
  });

  sql += '\nDELETE FROM colors;\nDELETE FROM sizes;\n';

  couleurs.forEach((c, ci) => {
    sql += `INSERT INTO colors(id, nom, mode, selected_piece_weight_model, selected_carton_weight_model, selected_dim_model) ` +
      `VALUES (${ci}, '${esc(c.nom)}', '${esc(c.mode)}', '${esc(c.selectedPieceWeightModelName || '')}', '${esc(c.selectedCartonWeightModelName || '')}', '${esc(c.selectedDimModelName || '')}');\n`;
    const input = sizesInputs[ci];
    if (input) {
      input.tailles.forEach((sizeName, si) => {
        const spec = input.D[sizeName];
        if (spec) {
          sql += `INSERT INTO sizes(color_id, size_index, name, qty, cap, w_piece, w_carton, dim_L, dim_l, dim_h, sku) ` +
            `VALUES (${ci}, ${si}, '${esc(sizeName)}', ${spec.qtyTot}, ${spec.cap}, ${spec.wPiece}, ${spec.wCarton}, ${spec.dimL}, ${spec.diml}, ${spec.dimH}, '${esc(spec.sku)}');\n`;
        }
      });
    }
  });

  sql += '\nDELETE FROM packing_snapshot;\n';
  if (allResults.length > 0) {
    const serialized = allResults.map(r => ({
      nom: r.nom,
      color: r.color,
      mode: r.mode,
      tailles: r.tailles,
      D: r.totals.sizes, // stats/packed qty mapping
      statsData: {
        c: r.totals.c,
        p: r.totals.p,
        n: r.totals.n,
        g: r.totals.g,
        v: r.totals.v,
        ...r.totals.sizes
      }
    }));
    sql += `INSERT INTO packing_snapshot(id, all_results_json, generated_at) VALUES (1, '${JSON.stringify(serialized).replace(/'/g, "''")}', '${ts}');\n`;
  }

  sql += '\n-- FIN EXPORT SQL\n';
  return sql;
}

/**
 * Helper to split SQL insert values by commas while ignoring commas inside single quotes
 * and handling escaped single quotes correctly.
 */
function parseSqlValues(valuesStr: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    if (char === "'") {
      if (inQuotes && valuesStr[i + 1] === "'") {
        current += "'";
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses SQL backup outputs to restore input states.
 */
export function parseSQLString(sql: string) {
  const cfg: { [key: string]: string } = {};
  const colors: { id: number; nom: string; mode: string }[] = [];
  const sizes: { [colorId: number]: { [sizeIdx: number]: any } } = {};

  const lines = sql.split('\n');

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('INSERT INTO packing_config')) {
      const valGroup = trimmed.match(/VALUES\s*\((.*)\)/i);
      if (valGroup) {
        const parts = parseSqlValues(valGroup[1]);
        if (parts.length >= 2) {
          // Remove eventual outer single quotes if present
          const k = parts[0].replace(/^'|'$/g, '');
          const v = parts[1].replace(/^'|'$/g, '');
          cfg[k] = v;
        }
      }
    } else if (trimmed.startsWith('INSERT INTO colors')) {
      const valGroup = trimmed.match(/VALUES\s*\((.*)\)/i);
      if (valGroup) {
        const parts = parseSqlValues(valGroup[1]);
        if (parts.length >= 3) {
          const id = parseInt(parts[0].replace(/^'|'$/g, ''));
          const nom = parts[1].replace(/^'|'$/g, '');
          const mode = parts[2].replace(/^'|'$/g, '');
          const selectedPieceWeightModelName = parts[3] ? parts[3].replace(/^'|'$/g, '') : undefined;
          const selectedCartonWeightModelName = parts[4] ? parts[4].replace(/^'|'$/g, '') : undefined;
          const selectedDimModelName = parts[5] ? parts[5].replace(/^'|'$/g, '') : undefined;
          colors.push({
            id,
            nom,
            mode,
            selectedPieceWeightModelName,
            selectedCartonWeightModelName,
            selectedDimModelName
          } as any);
        }
      }
    } else if (trimmed.startsWith('INSERT INTO sizes')) {
      const valGroup = trimmed.match(/VALUES\s*\((.*)\)/i);
      if (valGroup) {
        const parts = parseSqlValues(valGroup[1]);
        if (parts.length >= 11) {
          const color_id = parseInt(parts[0].replace(/^'|'$/g, ''));
          const size_index = parseInt(parts[1].replace(/^'|'$/g, ''));
          const name = parts[2].replace(/^'|'$/g, '');
          const qty = parseInt(parts[3].replace(/^'|'$/g, '')) || 0;
          const cap = parseInt(parts[4].replace(/^'|'$/g, '')) || 25;
          const wPiece = parseFloat(parts[5].replace(/^'|'$/g, '')) || 0.25;
          const wCarton = parseFloat(parts[6].replace(/^'|'$/g, '')) || 0.8;
          const dimL = parseFloat(parts[7].replace(/^'|'$/g, '')) || 61;
          const diml = parseFloat(parts[8].replace(/^'|'$/g, '')) || 41;
          const dimH = parseFloat(parts[9].replace(/^'|'$/g, '')) || 30;
          const sku = parts[10] ? parts[10].replace(/^'|'$/g, '') : '';

          if (!sizes[color_id]) sizes[color_id] = {};
          sizes[color_id][size_index] = { name, qty, cap, wPiece, wCarton, dimL, diml, dimH, sku };
        }
      }
    }
  });

  return { cfg, colors, sizes };
}

/**
 * Creates Excel Worksheets for all result tabs and a combined ledger.
 */
export async function exportToExcel(
  allResults: ColorResult[],
  meta: OrderMeta,
  originalSizesInputs: { [colorIdx: number]: { tailles: string[]; D: { [size: string]: SizeDetails } } },
  printColumns?: { sku: boolean; [key: string]: boolean }
) {
  if (allResults.length === 0) {
    throw new Error("Générez d'abord la Packing List.");
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Packing List Pro v10';
  wb.created = new Date();

  const colorsHex = {
    navyBg: '1A2E4A', navyFg: 'FFFFFF',
    blueBg: '2C5282', blueFg: 'FFFFFF',
    tealBg: '004D40', tealFg: 'FFFFFF',
    redBg: '7B1A1A',  redFg: 'FFFFFF',
    greenBg: '1A4731',greenFg: 'FFFFFF',
    totalBg: 'FFF9C4',totalFg: '7B6000',
    rowA: 'EBF5FB',   rowB: 'FFFFFF',
    infoBg: 'EBF4FF', infoFg: '1A3A6B',
    bkBg: 'FFF8E1',   bkFg: '5D4037',
    skuFg: '1A5C2A',  netFg: '00695C', grossFg: 'B71C1C',
    yellowBg: 'F6E05E',yellowFg: '1A1A1A',
    styleBg: '34495E',styleFg: 'FFFFFF',
  };

  const borderThin = {
    top: { style: 'thin' as const },
    bottom: { style: 'thin' as const },
    left: { style: 'thin' as const },
    right: { style: 'thin' as const }
  };

  const borderMedium = {
    top: { style: 'medium' as const },
    bottom: { style: 'medium' as const },
    left: { style: 'medium' as const },
    right: { style: 'medium' as const }
  };

  const isStandardSizeAlwaysShown = (sizeName: string) => {
    const norm = sizeName.toUpperCase().trim();
    return ['XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '2 XL'].includes(norm);
  };

  const userFilename = (meta.filename || 'PACKING_LIST').replace(/\.xlsx$/i, '') + '.xlsx';

  // 0.A INFORMATIONS COMMANDE SHEET
  const wsInfo = wb.addWorksheet('INFORMATIONS COMMANDE', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 }
  });
  wsInfo.columns = [
    { width: 32 }, // Paramètre
    { width: 48 }  // Valeur
  ];

  wsInfo.mergeCells('A1:B1');
  const infoTitle = wsInfo.getCell('A1');
  infoTitle.value = "FICHE D'INFORMATIONS DE LA COMMANDE & RÉFÉRENCE";
  infoTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.navyBg } };
  infoTitle.font = { color: { argb: 'FF' + colorsHex.navyFg }, size: 14, bold: true, name: 'Calibri' };
  infoTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsInfo.getRow(1).height = 36;

  const infoItems = [
    { key: 'CLIENT / CUSTOMER', val: meta.customer || '—' },
    { key: 'COMMANDE / ORDER N°', val: meta.order || '—' },
    { key: 'CLIENT PO#', val: meta.po || '—' },
    { key: 'RÉFÉRENCE CLIENT / CUSTOMER REF', val: meta.refClient || '—' },
    { key: 'FACTURE / INVOICE N°', val: meta.invoice || '—' },
    { key: 'STYLE / MODÈLE', val: meta.style || '—' },
    { key: 'STYLE N° / MODEL N°', val: meta.styleNumber || '—' },
    { key: 'SKU / CODE ARTICLE', val: meta.sku || '—' },
    { key: 'FIL / YARN', val: meta.yarn || '—' },
    { key: 'COMPOSITION', val: meta.composition || '—' },
    { key: 'DESTINATION', val: meta.destination || '—' },
    { key: 'ADRESSE DE LIVRAISON / ADDRESS', val: meta.address || '—' },
    { key: 'PAYS / COUNTRY', val: meta.pays || '—' },
    { key: 'PORT DE DÉPART / PORT OF LOADING', val: meta.portDepart || '—' },
    { key: 'PORT D\'ARRIVÉE / PORT OF DISCHARGE', val: meta.portArrivee || '—' },
    { key: 'QUANTITÉ DE COMMANDE', val: meta.qty || '—' },
    { key: 'DATE D\'EXPORTATION', val: new Date().toLocaleDateString('fr-FR') }
  ];

  let infoRowIdx = 3;
  infoItems.forEach((item) => {
    const row = wsInfo.getRow(infoRowIdx);
    const cellKey = row.getCell(1);
    const cellVal = row.getCell(2);

    cellKey.value = item.key;
    cellKey.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF4FF' } }; // Soft blue infoBg
    cellKey.font = { color: { argb: 'FF' + colorsHex.infoFg }, size: 10, bold: true };
    cellKey.border = borderThin;
    cellKey.alignment = { horizontal: 'right', vertical: 'middle' };

    cellVal.value = item.val;
    cellVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    cellVal.font = { color: { argb: '333333' }, size: 10 };
    cellVal.border = borderThin;
    if (item.key.includes('QUANTITÉ') || item.key.includes('DATE')) {
      cellVal.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      cellVal.alignment = { horizontal: 'left', vertical: 'middle' };
    }

    row.height = 22;
    infoRowIdx++;
  });

  // 0.B RÉCAPITULATIF EXPÉDITION SHEET
  const wsRecap = wb.addWorksheet('RÉCAPITULATIF EXPÉDITION', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 }
  });
  wsRecap.columns = [
    { width: 24 }, // A: Couleur
    { width: 16 }, // B: Cartons
    { width: 18 }, // C: Style d'emballage
    { width: 16 }, // D: Pièces
    { width: 16 }, // E: Poids Net (KG)
    { width: 16 }  // F: Poids Brut (KG)
  ];

  wsRecap.mergeCells('A1:F1');
  const recapTitle = wsRecap.getCell('A1');
  recapTitle.value = "RÉCAPITULATIF ET ANALYSES DE L'EXPÉDITION";
  recapTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.navyBg } };
  recapTitle.font = { color: { argb: 'FF' + colorsHex.navyFg }, size: 14, bold: true, name: 'Calibri' };
  recapTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsRecap.getRow(1).height = 36;

  wsRecap.mergeCells('A2:F2');
  const recapSub = wsRecap.getCell('A2');
  recapSub.value = "TABLEAU DE BORD GÉNÉRAL DE LOGISTIQUE ET SYNTHÈSE DES GRILLES DE COLISAGE";
  recapSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF4FF' } };
  recapSub.font = { color: { argb: 'FF' + colorsHex.infoFg }, size: 10, bold: true, italic: true };
  recapSub.alignment = { horizontal: 'center', vertical: 'middle' };
  wsRecap.getRow(2).height = 24;

  const buildKpiCard = (ws: any, rowStart: number, colStart: number, colEnd: number, title: string, value: string | number, sub: string, bgColor: string, txtColor: string) => {
    ws.mergeCells(rowStart, colStart, rowStart, colEnd);
    const titleCell = ws.getRow(rowStart).getCell(colStart);
    titleCell.value = title;
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } };
    titleCell.font = { color: { argb: 'FF' + txtColor }, size: 9, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(rowStart).height = 18;

    ws.mergeCells(rowStart + 1, colStart, rowStart + 1, colEnd);
    const valCell = ws.getRow(rowStart + 1).getCell(colStart);
    valCell.value = value;
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } };
    valCell.font = { color: { argb: 'FF' + txtColor }, size: 16, bold: true };
    valCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(rowStart + 1).height = 28;

    ws.mergeCells(rowStart + 2, colStart, rowStart + 2, colEnd);
    const subCell = ws.getRow(rowStart + 2).getCell(colStart);
    subCell.value = sub;
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgColor } };
    subCell.font = { color: { argb: 'FF' + '777777' }, size: 8, italic: true };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(rowStart + 2).height = 16;

    for (let r = rowStart; r <= rowStart + 2; r++) {
      for (let c = colStart; c <= colEnd; c++) {
        ws.getRow(r).getCell(c).border = borderThin;
      }
    }
  };

  let gPcs = 0;
  let gCtn = 0;
  let gNet = 0;
  let gGross = 0;
  let gVol = 0;
  allResults.forEach(res => {
    gPcs += res.totals.p;
    gCtn += res.totals.c;
    gNet += res.totals.n;
    gGross += res.totals.g;
    gVol += res.totals.v;
  });

  buildKpiCard(wsRecap, 4, 1, 1, "TOTAL PIÈCES", gPcs.toLocaleString('fr-FR'), "Pièces expédiées", "FFF9C4", "7B6000"); // Yellow/amber
  buildKpiCard(wsRecap, 4, 2, 2, "TOTAL CARTONS", gCtn, "Cartons colisage", "E8F8F5", "117A65"); // Greenish
  buildKpiCard(wsRecap, 4, 3, 4, "POIDS GLOBAL (NET / BRUT)", `${gNet.toFixed(1)} / ${gGross.toFixed(1)} KG`, `Net: ${gNet.toFixed(1)} KG · Brut: ${gGross.toFixed(1)} KG`, "EBF5FB", "1F618D"); // Bluish
  buildKpiCard(wsRecap, 4, 5, 6, "VOLUME TOTAL", `${gVol.toFixed(3)} m³`, "Cubage estimé (CBM)", "FDEDEC", "78281F"); // Reddish

  let recapRowIdx = 8;
  wsRecap.mergeCells(recapRowIdx, 1, recapRowIdx, 6);
  const tTitle = wsRecap.getRow(recapRowIdx).getCell(1);
  tTitle.value = "TABLEAU DE SYNTHÈSE DES TOTAUX PAR COULEUR";
  tTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.navyBg } };
  tTitle.font = { color: { argb: 'FF' + colorsHex.navyFg }, size: 10, bold: true };
  tTitle.alignment = { horizontal: 'left', vertical: 'middle' };
  wsRecap.getRow(recapRowIdx).height = 22;
  recapRowIdx++;

  const rHdr = wsRecap.getRow(recapRowIdx);
  const rHdrVals = ["Couleur / Color", "Total Cartons", "Style d'emballage", "Total Pièces", "Poids Net Total", "Poids Brut Total"];
  rHdrVals.forEach((val, idx) => {
    const cell = rHdr.getCell(idx + 1);
    cell.value = val;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.blueBg } };
    cell.font = { color: { argb: 'FF' + colorsHex.blueFg }, size: 10, bold: true };
    cell.border = borderThin;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  wsRecap.getRow(recapRowIdx).height = 24;
  recapRowIdx++;

  allResults.forEach((res, resIdx) => {
    const row = wsRecap.getRow(recapRowIdx);
    const isEven = resIdx % 2 === 0;

    const cNom = row.getCell(1);
    cNom.value = res.nom;
    cNom.font = { bold: true, color: { argb: '000000' } };
    cNom.alignment = { horizontal: 'left', vertical: 'middle' };
    cNom.border = borderThin;
    cNom.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (isEven ? 'FFFDF0' : 'FFFFFF') } };

    const cCartons = row.getCell(2);
    cCartons.value = res.totals.c;
    cCartons.font = { bold: true };
    cCartons.alignment = { horizontal: 'center', vertical: 'middle' };
    cCartons.border = borderThin;
    cCartons.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (isEven ? 'FFFDF0' : 'FFFFFF') } };

    const cMode = row.getCell(3);
    cMode.value = res.mode === 'strict_solide' ? 'SOLID PACK' : 'MIXED PACK';
    cMode.font = { size: 9, italic: true };
    cMode.alignment = { horizontal: 'center', vertical: 'middle' };
    cMode.border = borderThin;
    cMode.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (isEven ? 'FFFDF0' : 'FFFFFF') } };

    const cPcs = row.getCell(4);
    cPcs.value = res.totals.p;
    cPcs.font = { bold: true, color: { argb: 'FFD35400' } };
    cPcs.alignment = { horizontal: 'center', vertical: 'middle' };
    cPcs.border = borderThin;
    cPcs.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (isEven ? 'FFFDF0' : 'FFFFFF') } };

    const cNet = row.getCell(5);
    cNet.value = Number(res.totals.n.toFixed(2));
    cNet.font = { color: { argb: 'FF0E6655' } };
    cNet.alignment = { horizontal: 'center', vertical: 'middle' };
    cNet.border = borderThin;
    cNet.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (isEven ? 'FFFDF0' : 'FFFFFF') } };

    const cGross = row.getCell(6);
    cGross.value = Number(res.totals.g.toFixed(2));
    cGross.font = { color: { argb: 'FF78281F' } };
    cGross.alignment = { horizontal: 'center', vertical: 'middle' };
    cGross.border = borderThin;
    cGross.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (isEven ? 'FFFDF0' : 'FFFFFF') } };

    wsRecap.getRow(recapRowIdx).height = 20;
    recapRowIdx++;
  });

  const rowTtl = wsRecap.getRow(recapRowIdx);
  rowTtl.getCell(1).value = "TOTAL GÉNÉRAL EXPÉDITION";
  rowTtl.getCell(1).font = { bold: true, size: 10 };
  rowTtl.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  rowTtl.getCell(1).border = borderMedium;
  rowTtl.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.totalBg } };

  rowTtl.getCell(2).value = gCtn;
  rowTtl.getCell(2).font = { bold: true };
  rowTtl.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
  rowTtl.getCell(2).border = borderMedium;
  rowTtl.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.totalBg } };

  rowTtl.getCell(3).value = "MULTICOLORE";
  rowTtl.getCell(3).font = { bold: true, size: 9 };
  rowTtl.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
  rowTtl.getCell(3).border = borderMedium;
  rowTtl.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.totalBg } };

  rowTtl.getCell(4).value = gPcs;
  rowTtl.getCell(4).font = { bold: true, color: { argb: 'FF7B6000' } };
  rowTtl.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
  rowTtl.getCell(4).border = borderMedium;
  rowTtl.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.totalBg } };

  rowTtl.getCell(5).value = Number(gNet.toFixed(2));
  rowTtl.getCell(5).font = { bold: true };
  rowTtl.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  rowTtl.getCell(5).border = borderMedium;
  rowTtl.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.totalBg } };

  rowTtl.getCell(6).value = Number(gGross.toFixed(2));
  rowTtl.getCell(6).font = { bold: true };
  rowTtl.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
  rowTtl.getCell(6).border = borderMedium;
  rowTtl.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.totalBg } };

  wsRecap.getRow(recapRowIdx).height = 24;

  // 0.D PROJECTION DES COLIS SHEET
  const wsProj = wb.addWorksheet('PROJECTION DES COLIS', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
  });

  wsProj.columns = [
    { width: 32 }, // Column 1: Indication par colisage
    ...Array.from({ length: 15 }).map(() => ({ width: 12 })) // Size columns
  ];

  wsProj.mergeCells('A1:L1');
  const projTitle = wsProj.getCell('A1');
  projTitle.value = "SYNTHÈSE DE PROJECTION DES COLIS (SAISIE ACTUELLE)";
  projTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.navyBg } };
  projTitle.font = { color: { argb: 'FF' + colorsHex.navyFg }, size: 14, bold: true, name: 'Calibri' };
  projTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsProj.getRow(1).height = 36;

  wsProj.mergeCells('A2:L2');
  const projSub = wsProj.getCell('A2');
  projSub.value = "TABLEAU DE PROJECTION DES CARTONS, QUANTITÉS PLEINES (PACKÉES) ET COUPE DE RESTES DE COLISAGE";
  projSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF4FF' } };
  projSub.font = { color: { argb: 'FF' + colorsHex.infoFg }, size: 10, bold: true, italic: true };
  projSub.alignment = { horizontal: 'center', vertical: 'middle' };
  wsProj.getRow(2).height = 24;

  let pRowIdx = 4;

  allResults.forEach((res, ci) => {
    const realIdx = res.colorIndex ?? ci;
    const sizes = originalSizesInputs[realIdx]?.D || {};
    const tailles = res.tailles; 

    let sumQtyTot = 0;
    let sumQtyFullCtn = 0;
    let sumQtyFullPcs = 0;
    let sumQtyLastPcs = 0;

    tailles.forEach(t => {
      const qTot = sizes[t]?.qtyTot || 0;
      const c = sizes[t]?.cap || 25;
      const fullCtn = c > 0 ? Math.floor(qTot / c) : 0;
      const fullPcs = fullCtn * c;
      const lastPcs = qTot - fullPcs;

      sumQtyTot += qTot;
      sumQtyFullCtn += fullCtn;
      sumQtyFullPcs += fullPcs;
      sumQtyLastPcs += lastPcs;
    });

    // 1. Color row
    wsProj.mergeCells(pRowIdx, 1, pRowIdx, tailles.length + 2);
    const colorBanner = wsProj.getRow(pRowIdx).getCell(1);
    colorBanner.value = `🎨 COULEUR : ${res.nom.toUpperCase()} (${res.totals.c} ${res.totals.c > 1 ? 'cartons' : 'carton'})`;
    colorBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.styleBg } };
    colorBanner.font = { color: { argb: 'FFFFFFFF' }, size: 11, bold: true };
    colorBanner.alignment = { horizontal: 'left', vertical: 'middle' };
    wsProj.getRow(pRowIdx).height = 24;
    pRowIdx++;

    // 2. Table Header
    const gridHdr = wsProj.getRow(pRowIdx);
    const firstCell = gridHdr.getCell(1);
    firstCell.value = "INDICATION PAR COLISAGE";
    firstCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF4FF' } };
    firstCell.font = { color: { argb: 'FF' + colorsHex.infoFg }, size: 9, bold: true };
    firstCell.alignment = { horizontal: 'left', vertical: 'middle' };
    firstCell.border = borderThin;

    tailles.forEach((t, tIdx) => {
      const cell = gridHdr.getCell(tIdx + 2);
      cell.value = t;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.blueBg } };
      cell.font = { color: { argb: 'FF' + colorsHex.blueFg }, size: 10, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderThin;
    });

    const ttlColIdx = tailles.length + 2;
    const cellTtl = gridHdr.getCell(ttlColIdx);
    cellTtl.value = "TOTALE";
    cellTtl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6E05E' } };
    cellTtl.font = { color: { argb: 'FF1A1A1A' }, size: 10, bold: true };
    cellTtl.alignment = { horizontal: 'center', vertical: 'middle' };
    cellTtl.border = borderThin;

    wsProj.getRow(pRowIdx).height = 22;
    pRowIdx++;

    // Row: QTY PCS TOTALE
    const rQtyTot = wsProj.getRow(pRowIdx);
    rQtyTot.getCell(1).value = "QTY PCS TOTALE";
    rQtyTot.getCell(1).font = { size: 10, bold: true };
    rQtyTot.getCell(1).border = borderThin;
    rQtyTot.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
    rQtyTot.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

    tailles.forEach((t, tIdx) => {
      const cell = rQtyTot.getCell(tIdx + 2);
      cell.value = sizes[t]?.qtyTot || 0;
      cell.font = { size: 10, bold: true };
      cell.border = borderThin;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    const cellTotValue = rQtyTot.getCell(ttlColIdx);
    cellTotValue.value = sumQtyTot;
    cellTotValue.font = { size: 10, bold: true, color: { argb: 'FF0E6655' } };
    cellTotValue.border = borderThin;
    cellTotValue.alignment = { horizontal: 'center', vertical: 'middle' };
    cellTotValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F8F5' } };
    wsProj.getRow(pRowIdx).height = 20;
    pRowIdx++;

    // Row: QTY PCS PAR CARTON
    const rQtyCap = wsProj.getRow(pRowIdx);
    rQtyCap.getCell(1).value = "QTY PCS PAR CARTON";
    rQtyCap.getCell(1).font = { size: 10 };
    rQtyCap.getCell(1).border = borderThin;
    rQtyCap.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
    rQtyCap.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

    tailles.forEach((t, tIdx) => {
      const cell = rQtyCap.getCell(tIdx + 2);
      cell.value = sizes[t]?.cap || 0;
      cell.font = { size: 10 };
      cell.border = borderThin;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    const cellCapValue = rQtyCap.getCell(ttlColIdx);
    cellCapValue.value = "—";
    cellCapValue.font = { size: 10, color: { argb: 'FF777777' } };
    cellCapValue.border = borderThin;
    cellCapValue.alignment = { horizontal: 'center', vertical: 'middle' };
    wsProj.getRow(pRowIdx).height = 20;
    pRowIdx++;

    // Row: QTY CARTON FULL
    const rCtnFull = wsProj.getRow(pRowIdx);
    rCtnFull.getCell(1).value = "QTY CARTON FULL";
    rCtnFull.getCell(1).font = { size: 10 };
    rCtnFull.getCell(1).border = borderThin;
    rCtnFull.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
    rCtnFull.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

    tailles.forEach((t, tIdx) => {
      const cell = rCtnFull.getCell(tIdx + 2);
      const qTot = sizes[t]?.qtyTot || 0;
      const c = sizes[t]?.cap || 0;
      cell.value = c > 0 ? Math.floor(qTot / c) : 0;
      cell.font = { size: 10 };
      cell.border = borderThin;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    const cellCtnFullValue = rCtnFull.getCell(ttlColIdx);
    cellCtnFullValue.value = sumQtyFullCtn;
    cellCtnFullValue.font = { size: 10, bold: true, color: { argb: 'FFB71C1C' } };
    cellCtnFullValue.border = borderThin;
    cellCtnFullValue.alignment = { horizontal: 'center', vertical: 'middle' };
    cellCtnFullValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDEDEC' } };
    wsProj.getRow(pRowIdx).height = 20;
    pRowIdx++;

    // Row: QTY PCS FULL (TOTAL PACKÉ)
    const rPcsFull = wsProj.getRow(pRowIdx);
    rPcsFull.getCell(1).value = "QTY PCS FULL (TOTAL PACKÉ)";
    rPcsFull.getCell(1).font = { size: 10 };
    rPcsFull.getCell(1).border = borderThin;
    rPcsFull.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
    rPcsFull.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

    tailles.forEach((t, tIdx) => {
      const cell = rPcsFull.getCell(tIdx + 2);
      const qTot = sizes[t]?.qtyTot || 0;
      const c = sizes[t]?.cap || 0;
      cell.value = c > 0 ? Math.floor(qTot / c) * c : 0;
      cell.font = { size: 10 };
      cell.border = borderThin;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    const cellPcsFullValue = rPcsFull.getCell(ttlColIdx);
    cellPcsFullValue.value = sumQtyFullPcs;
    cellPcsFullValue.font = { size: 10, bold: true, color: { argb: 'FF1F618D' } };
    cellPcsFullValue.border = borderThin;
    cellPcsFullValue.alignment = { horizontal: 'center', vertical: 'middle' };
    cellPcsFullValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF5FB' } };
    wsProj.getRow(pRowIdx).height = 20;
    pRowIdx++;

    // Row: QTY PCS LAST (RESTE)
    const rPcsLast = wsProj.getRow(pRowIdx);
    rPcsLast.getCell(1).value = "QTY PCS LAST (RESTE)";
    rPcsLast.getCell(1).font = { size: 10, bold: true };
    rPcsLast.getCell(1).border = borderThin;
    rPcsLast.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
    rPcsLast.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

    tailles.forEach((t, tIdx) => {
      const cell = rPcsLast.getCell(tIdx + 2);
      const qTot = sizes[t]?.qtyTot || 0;
      const c = sizes[t]?.cap || 0;
      const rem = qTot - (c > 0 ? Math.floor(qTot / c) * c : 0);
      cell.value = rem;
      cell.font = { size: 10, bold: true };
      cell.border = borderThin;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (rem > 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } }; // Light red
        cell.font = { size: 10, bold: true, color: { argb: 'FFC62828' } };
      }
    });
    const cellPcsLastValue = rPcsLast.getCell(ttlColIdx);
    cellPcsLastValue.value = sumQtyLastPcs;
    cellPcsLastValue.font = { size: 10, bold: true, color: { argb: 'FFC62828' } };
    cellPcsLastValue.border = borderThin;
    cellPcsLastValue.alignment = { horizontal: 'center', vertical: 'middle' };
    cellPcsLastValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };
    wsProj.getRow(pRowIdx).height = 22;
    pRowIdx++;

    pRowIdx += 2; // Extra blank row spacing
  });

  // 0.C SAISIE COLISAGE SHEET (INPUT GRID ORIGINAL VALUES)
  const wsSaisie = wb.addWorksheet('SAISIE COLISAGE', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
  });

  wsSaisie.columns = [
    { width: 30 }, // Column 1: Parameter name
    ...Array.from({ length: 15 }).map(() => ({ width: 14 })) // Size columns space
  ];

  wsSaisie.mergeCells('A1:P1');
  const saisieTitle = wsSaisie.getCell('A1');
  saisieTitle.value = "GRILLE DE SAISIE DE COLISAGE ORIGINAL (DONNÉES CLIENT / INPUTS)";
  saisieTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.navyBg } };
  saisieTitle.font = { color: { argb: 'FF' + colorsHex.navyFg }, size: 14, bold: true, name: 'Calibri' };
  saisieTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsSaisie.getRow(1).height = 36;

  wsSaisie.mergeCells('A2:P2');
  const saisieSub = wsSaisie.getCell('A2');
  saisieSub.value = "VALEURS INITIALES DES QUANTITÉS À EMBALLER, CAPACITÉS MAX PAR CARTON ET SKU PAR TAILLE ET COULEUR";
  saisieSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF4FF' } };
  saisieSub.font = { color: { argb: 'FF' + colorsHex.infoFg }, size: 10, bold: true, italic: true };
  saisieSub.alignment = { horizontal: 'center', vertical: 'middle' };
  wsSaisie.getRow(2).height = 24;

  let sRowIdx = 4;

  allResults.forEach((res, ci) => {
    const realIdx = res.colorIndex ?? ci;
    const sizes = originalSizesInputs[realIdx]?.D || {};
    const tailles = res.tailles; 

    // 1. Color banner Row
    wsSaisie.mergeCells(sRowIdx, 1, sRowIdx, tailles.length + 1);
    const colorHeaderCell = wsSaisie.getRow(sRowIdx).getCell(1);
    colorHeaderCell.value = `🎨 COULEUR : ${res.nom.toUpperCase()}`;
    colorHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.styleBg } };
    colorHeaderCell.font = { color: { argb: 'FFFFFFFF' }, size: 11, bold: true };
    colorHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    wsSaisie.getRow(sRowIdx).height = 24;
    sRowIdx++;

    // 2. Table Header (Sizes row)
    const hdrRow = wsSaisie.getRow(sRowIdx);
    const paramCell = hdrRow.getCell(1);
    paramCell.value = "PARAMÈTRE DE COLISAGE";
    paramCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.blueBg } };
    paramCell.font = { color: { argb: 'FF' + colorsHex.blueFg }, size: 10, bold: true };
    paramCell.alignment = { horizontal: 'left', vertical: 'middle' };
    paramCell.border = borderThin;

    tailles.forEach((t, tIdx) => {
      const sizeCell = hdrRow.getCell(tIdx + 2);
      sizeCell.value = t;
      sizeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.blueBg } };
      sizeCell.font = { color: { argb: 'FF' + colorsHex.blueFg }, size: 10, bold: true };
      sizeCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sizeCell.border = borderThin;
    });
    wsSaisie.getRow(sRowIdx).height = 22;
    sRowIdx++;

    // 3. Row QtyTot
    const qtyRow = wsSaisie.getRow(sRowIdx);
    const qtyTitleCell = qtyRow.getCell(1);
    qtyTitleCell.value = "Quantité Totale à Emballer";
    qtyTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
    qtyTitleCell.font = { size: 10, bold: true };
    qtyTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    qtyTitleCell.border = borderThin;

    tailles.forEach((t, tIdx) => {
      const cell = qtyRow.getCell(tIdx + 2);
      cell.value = sizes[t]?.qtyTot || 0;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      cell.font = { size: 10, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderThin;
    });
    wsSaisie.getRow(sRowIdx).height = 20;
    sRowIdx++;

    // 4. Row Capacidad
    const capRow = wsSaisie.getRow(sRowIdx);
    const capTitleCell = capRow.getCell(1);
    capTitleCell.value = "Pièces Max par Carton (Cap)";
    capTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
    capTitleCell.font = { size: 10, bold: true };
    capTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    capTitleCell.border = borderThin;

    tailles.forEach((t, tIdx) => {
      const cell = capRow.getCell(tIdx + 2);
      cell.value = sizes[t]?.cap || 0;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      cell.font = { size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderThin;
    });
    wsSaisie.getRow(sRowIdx).height = 20;
    sRowIdx++;

    // 5. Row SKU
    const skuRow = wsSaisie.getRow(sRowIdx);
    const skuTitleCell = skuRow.getCell(1);
    skuTitleCell.value = "SKU spécifique (facultatif)";
    skuTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
    skuTitleCell.font = { size: 10, bold: true, color: { argb: 'FF1A5C2A' } };
    skuTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    skuTitleCell.border = borderThin;

    tailles.forEach((t, tIdx) => {
      const cell = skuRow.getCell(tIdx + 2);
      cell.value = sizes[t]?.sku || '';
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      cell.font = { size: 9, color: { argb: 'FF1A5C2A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderThin;
    });
    wsSaisie.getRow(sRowIdx).height = 20;
    sRowIdx++;

    sRowIdx += 2;
  });

  // 1. INDIVIDUAL SHEETS FOR EACH COLOR
  allResults.forEach((res, ci) => {
    const { nom, color, rows, totals } = res;
    const realIdx = res.colorIndex ?? ci;
    const colorConfig = {
      nom: res.nom,
      mode: res.mode,
      tailles: res.tailles,
      sizes: originalSizesInputs[realIdx]?.D || {}
    } as ColorConfig;
    // Always show standard XS to 2XL, and show 3XL/4XL only if they are positive
    const tailles = res.tailles.filter(t => isStandardSizeAlwaysShown(t) || (originalSizesInputs[realIdx]?.D[t]?.qtyTot || 0) > 0);
    
    const sizeSpecInputs = originalSizesInputs[realIdx];
    const hasAnySku = !!(sizeSpecInputs && Object.values(sizeSpecInputs.D).some((s: any) => s && s.sku && String(s.sku).trim() !== ''));
    const isSkuColShown = printColumns ? !!(printColumns.sku && hasAnySku) : hasAnySku;
    const nc = tailles.length + (isSkuColShown ? 10 : 9);

    const ws = wb.addWorksheet(nom.substring(0, 31).replace(/[/*?:[\]]/g, ''), {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
    });

    // Column widths
    const cols = [
      { width: 12 }, // N° DÉBUT
      { width: 12 }, // N° FIN
      { width: 18 }, // COLOR / COULEUR
    ];
    if (isSkuColShown) {
      cols.push({ width: 22 }); // SKU
    }
    cols.push(...tailles.map(() => ({ width: 9 }))); // tailles
    cols.push(
      { width: 11 }, // PCS/CTN
      { width: 11 }, // NB CTN
      { width: 14 }, // TOTAL QTY
      { width: 16 }, // NET WEIGHT
      { width: 17 }, // GROSS WEIGHT
      { width: 12 }  // CBM
    );
    ws.columns = cols;

    let ri = 1;

    // Header title
    ws.mergeCells(ri, 1, ri, nc);
    const titleCell = ws.getRow(ri).getCell(1);
    titleCell.value = `PACKING LIST — ${meta.customer.toUpperCase()}${meta.order ? ' · ORDER: ' + meta.order : ''}${meta.invoice ? ' · INVOICE: ' + meta.invoice : ''}`;
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.navyBg } };
    titleCell.font = { color: { argb: 'FF' + colorsHex.navyFg }, size: 14, bold: true, name: 'Calibri' };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(ri).height = 36;
    ri++;

    // Detail box mapping
    const infoRows = [
      ['CUSTOMER / CLIENT :', meta.customer],
      meta.po ? ['PO# CLIENT :', meta.po] : null,
      meta.refClient ? ['REF CLIENT :', meta.refClient] : null,
      meta.style ? ['STYLE N° :', `${meta.style}${meta.styleNumber ? ' (' + meta.styleNumber + ')' : ''}`] : null,
      meta.invoice ? ['INVOICE N° :', meta.invoice] : null,
      meta.destination ? ['DESTINATION :', `${meta.destination}${meta.address ? ' — ' + meta.address : ''}`] : null,
      meta.pays ? ['PAYS :', meta.pays] : null,
      (meta.portDepart || meta.portArrivee) ? ['PORTS DETOUR :', `${meta.portDepart || ''} → ${meta.portArrivee || ''}`] : null,
      meta.yarn ? ['YARN / FIL :', meta.yarn] : null,
      meta.composition ? ['COMPOSITION :', meta.composition] : null,
    ].filter(Boolean) as [string, string][];

    infoRows.forEach(([k, v]) => {
      ws.mergeCells(ri, 2, ri, nc);
      const rowNum = ws.getRow(ri);

      const kc = rowNum.getCell(1);
      kc.value = k;
      kc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.infoBg } };
      kc.font = { color: { argb: 'FF' + colorsHex.infoFg }, size: 10, bold: true };
      kc.border = borderThin;
      kc.alignment = { horizontal: 'right', vertical: 'middle' };

      const vc = rowNum.getCell(2);
      vc.value = v;
      vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.infoBg } };
      vc.font = { color: { argb: 'FF' + colorsHex.infoFg }, size: 10, bold: false };
      vc.border = borderThin;
      vc.alignment = { horizontal: 'left', vertical: 'middle' };

      for (let colIdx = 3; colIdx <= nc; colIdx++) {
        const blockCell = rowNum.getCell(colIdx);
        blockCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.infoBg } };
        blockCell.border = borderThin;
      }
      rowNum.height = 18;
      ri++;
    });

    // Separator summary row
    ri++;
    ws.mergeCells(ri, 1, ri, nc);
    const summaryRowCell = ws.getRow(ri).getCell(1);
    summaryRowCell.value = `RÉSUMÉ COULEUR: Quantité: ${totals.p} · Colisages: ${totals.c} · Poids Net: ${totals.n.toFixed(2)} KG · Poids Brut: ${totals.g.toFixed(2)} KG · CBM: ${totals.v.toFixed(3)} m³`;
    summaryRowCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.bkBg } };
    summaryRowCell.font = { color: { argb: 'FF' + colorsHex.bkFg }, size: 10, bold: true };
    summaryRowCell.border = borderThin;
    summaryRowCell.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(ri).height = 20;
    ri++;

    ri++; // Blank gap

    // TABLE HEADER SETUP
    const hdrRow = ws.getRow(ri);
    const hdrVals = ['N° DÉBUT', 'N° FIN', 'COLOR / COULEUR'];
    if (isSkuColShown) {
      hdrVals.push('SKU');
    }
    hdrVals.push(...tailles, 'PCS/CTN', 'NB CTN', 'TOTAL QTY', 'NET WEIGHT\n(kg)', 'GROSS WEIGHT\n(kg)', 'CBM (m³)');

    hdrVals.forEach((val, index) => {
      const cell = hdrRow.getCell(index + 1);
      cell.value = val;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = borderMedium;
      cell.font = { color: { argb: 'FF' + colorsHex.navyFg }, size: 10, bold: true };

      if (index === 0 || index === 1 || index === 2) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.navyBg } };
      } else if (isSkuColShown && index === 3) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.greenBg } };
      } else {
        const sizeStartIdx = isSkuColShown ? 4 : 3;
        const sizeEndIdx = sizeStartIdx + tailles.length - 1;
        if (index >= sizeStartIdx && index <= sizeEndIdx) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.blueBg } };
        } else if (index === nc - 3) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.tealBg } };
        } else if (index === nc - 2) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.redBg } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.navyBg } };
        }
      }
    });
    hdrRow.height = 32;
    const hdrRi = ri;
    ri++;

    // Data stylePO info subheader
    ws.mergeCells(ri, 1, ri, nc);
    const subHeader = ws.getRow(ri);
    subHeader.getCell(1).value = `STYLE: ${meta.style || '—'} · CLIENT PO: ${meta.po || '—'}`;
    subHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.styleBg } };
    subHeader.font = { color: { argb: 'FF' + colorsHex.styleFg }, size: 9, bold: true };
    subHeader.border = borderThin;
    subHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    subHeader.height = 18;
    ri++;

    // Populate actual data rows for this color
    rows.forEach((r, rIdx) => {
      const isEven = rIdx % 2 === 0;
      const dataRow = ws.getRow(ri);

      const { start, end } = parseCartonRange(r.cartonRange);
      const startNum = parseInt(start, 10);
      const endNum = parseInt(end, 10);
      const startVal = isNaN(startNum) ? start : startNum;
      const endVal = isNaN(endNum) ? end : endNum;

      const vals = [
        startVal,
        endVal,
        nom,
      ];
      if (isSkuColShown) {
        vals.push(r.skus.join('/') || '—');
      }
      vals.push(
        ...tailles.map(t => r.sizes[t] || ''),
        r.pcsPerCarton,
        r.nbr,
        r.totalPcs,
        Number(r.netWeightRow.toFixed(2)),
        Number(r.grossWeightRow.toFixed(2)),
        Number(r.cbmRow.toFixed(4))
      );

      vals.forEach((val, valIdx) => {
        const cell = dataRow.getCell(valIdx + 1);
        cell.value = val;
        cell.border = borderThin;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (isEven ? colorsHex.rowA : colorsHex.rowB) } };
        if (valIdx === 0 || valIdx === 1) {
          cell.font = { color: { argb: 'FF' + colorsHex.navyBg }, size: 10, bold: true };
        } else if (valIdx === 2) {
          cell.font = { color: { argb: '000000' }, size: 10, bold: true };
        } else if (isSkuColShown && valIdx === 3) {
          cell.font = { color: { argb: 'FF' + colorsHex.skuFg }, size: 10 };
        } else if (valIdx === nc - 3) {
          cell.font = { color: { argb: 'FF' + colorsHex.netFg }, size: 10, bold: true };
        } else if (valIdx === nc - 2) {
          cell.font = { color: { argb: 'FF' + colorsHex.grossFg }, size: 10, bold: true };
        } else {
          cell.font = { color: { argb: '333333' }, size: 10 };
        }
      });

      dataRow.height = 18;
      ri++;
    });

    // Total row
    const totRow = ws.getRow(ri);
    const totVals: (string | number)[] = [
      'TOTAL',
      '',
      nom,
    ];
    if (isSkuColShown) {
      totVals.push('—');
    }
    totVals.push(
      ...tailles.map(t => totals.sizes[t] || 0),
      '',
      totals.c,
      totals.p,
      Number(totals.n.toFixed(2)),
      Number(totals.g.toFixed(2)),
      Number(totals.v.toFixed(3))
    );

    totVals.forEach((val, valIdx) => {
      const cell = totRow.getCell(valIdx + 1);
      cell.value = val;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.totalBg } };
      cell.font = { color: { argb: 'FF' + colorsHex.totalFg }, size: 11, bold: true };
      cell.border = borderThin;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    totRow.height = 24;
    ri += 2;

    // Table of global dimensions specs
    ws.mergeCells(ri, 1, ri, nc);
    const specTitle = ws.getRow(ri).getCell(1);
    specTitle.value = `DÉTAILS DIMENSIONS ET EN-TÊTES DE CARTONS PAR TAILLE`;
    specTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.greenBg } };
    specTitle.font = { color: { argb: 'FF' + colorsHex.greenFg }, size: 10, bold: true };
    specTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(ri).height = 20;
    ri++;

    // Table headers for specifications
    if (sizeSpecInputs) {
      const tableHeaders = ['SPÉCIALISATIONS', ...tailles];
      const thRow = ws.getRow(ri);
      tableHeaders.forEach((val, idx) => {
        const cell = thRow.getCell(idx + 1);
        cell.value = val;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.greenBg } };
        cell.font = { color: { argb: 'FF' + colorsHex.greenFg }, size: 9, bold: true };
        cell.border = borderThin;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      ri++;

      // SKU specifics
      if (isSkuColShown) {
        const skuRow = ws.getRow(ri);
        ['SKU / RÉFÉRENCE', ...tailles.map(t => sizeSpecInputs.D[t]?.sku || '—')].forEach((val, idx) => {
          const cell = skuRow.getCell(idx + 1);
          cell.value = val;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
          cell.font = { color: { argb: 'FF' + colorsHex.skuFg }, size: 10 };
          cell.border = borderThin;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        ri++;
      }

      // Dimensions specifics
      const dimRow = ws.getRow(ri);
      ['CARTON SIZES (LxW xH cm)', ...tailles.map(t => {
        const spec = sizeSpecInputs.D[t];
        return spec ? `${spec.dimL}x${spec.diml}x${spec.dimH}` : '—';
      })].forEach((val, idx) => {
        const cell = dimRow.getCell(idx + 1);
        cell.value = val;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
        cell.font = { color: { argb: '555555' }, size: 10 };
        cell.border = borderThin;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    }

    // Freeze details row & columns
    ws.views = [{ state: 'frozen', xSplit: isSkuColShown ? 4 : 3, ySplit: hdrRi, activeCell: ws.getRow(hdrRi + 1).getCell(isSkuColShown ? 5 : 4).address }];
  });

  // 2. DETAILED COMBINED LEDGER (ONLY FOR MULTI-COLOR ORDERS)
  if (allResults.length > 1) {
    let combinedSizes: string[] = [];
    allResults.forEach((r, rIdx) => {
      const realIdx = r.colorIndex ?? rIdx;
      r.tailles.forEach(t => {
        const qty = originalSizesInputs[realIdx]?.D[t]?.qtyTot || 0;
        const isAlways = isStandardSizeAlwaysShown(t);
        if ((isAlways || qty > 0) && !combinedSizes.includes(t)) {
          combinedSizes.push(t);
        }
      });
    });

    const hasAnySkuCombined = allResults.some((res, rIdx) => {
      const realIdx = res.colorIndex ?? rIdx;
      const sizeSpecInputs = originalSizesInputs[realIdx];
      return sizeSpecInputs && Object.values(sizeSpecInputs.D).some((s: any) => s && s.sku && String(s.sku).trim() !== '');
    });
    const isSkuColShownCombined = printColumns ? !!(printColumns.sku && hasAnySkuCombined) : hasAnySkuCombined;

    const ncComb = combinedSizes.length + (isSkuColShownCombined ? 10 : 9);
    const wsComb = wb.addWorksheet('LEDGER COMBINÉ', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
    });

    const colsComb = [
      { width: 12 }, // N° DÉBUT
      { width: 12 }, // N° FIN
      { width: 18 }, // COLOR / COULEUR
    ];
    if (isSkuColShownCombined) {
      colsComb.push({ width: 22 }); // SKU
    }
    colsComb.push(...combinedSizes.map(() => ({ width: 9 })));
    colsComb.push(
      { width: 11 }, // PCS/CTN
      { width: 11 }, // NB CTN
      { width: 14 }, // TOTAL QTY
      { width: 16 }, // NET WEIGHT
      { width: 17 }, // GROSS WEIGHT
      { width: 12 }  // CBM
    );
    wsComb.columns = colsComb;

    let ri = 1;
    wsComb.mergeCells(ri, 1, ri, ncComb);
    const titleCell = wsComb.getRow(ri).getCell(1);
    titleCell.value = `COMBINED GLOBAL PACKING LIST — ALL COLORS (${allResults.length})`;
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.navyBg } };
    titleCell.font = { color: { argb: 'FF' + colorsHex.navyFg }, size: 14, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    wsComb.getRow(ri).height = 36;
    ri++;

    // Combined meta info banner
    wsComb.mergeCells(ri, 1, ri, ncComb);
    const bannerRow = wsComb.getRow(ri);
    bannerRow.getCell(1).value = `COMMANDE: ${meta.order || '—'} · CLIENT: ${meta.customer || '—'} · PO: ${meta.po || '—'} · DESTINATION: ${meta.destination || '—'}`;
    bannerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.infoBg } };
    bannerRow.font = { color: { argb: 'FF' + colorsHex.infoFg }, size: 10, bold: true };
    bannerRow.border = borderThin;
    bannerRow.alignment = { horizontal: 'left', vertical: 'middle' };
    bannerRow.height = 20;
    ri++;

    ri++; // Blank gap

    // LEDGER HEADER
    const hdrRow = wsComb.getRow(ri);
    const hdrVals = ['N° DÉBUT', 'N° FIN', 'COLOR / COULEUR'];
    if (isSkuColShownCombined) {
      hdrVals.push('SKU');
    }
    hdrVals.push(...combinedSizes, 'PCS/CTN', 'NB CTN', 'TOTAL QTY', 'NET WEIGHT\n(kg)', 'GROSS WEIGHT\n(kg)', 'CBM (m³)');

    hdrVals.forEach((val, index) => {
      const cell = hdrRow.getCell(index + 1);
      cell.value = val;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = borderMedium;
      cell.font = { color: { argb: 'FF' + colorsHex.navyFg }, size: 10, bold: true };

      if (index === 0 || index === 1 || index === 2) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.navyBg } };
      } else if (isSkuColShownCombined && index === 3) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.greenBg } };
      } else {
        const sizeStartIdx = isSkuColShownCombined ? 4 : 3;
        const sizeEndIdx = sizeStartIdx + combinedSizes.length - 1;
        if (index >= sizeStartIdx && index <= sizeEndIdx) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.blueBg } };
        } else if (index === ncComb - 3) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.tealBg } };
        } else if (index === ncComb - 2) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.redBg } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.navyBg } };
        }
      }
    });
    hdrRow.height = 32;
    const hdrRiComb = ri;
    ri++;

    let gTot = { c: 0, p: 0, n: 0, g: 0, v: 0 };
    let gSizes: { [size: string]: number } = {};
    combinedSizes.forEach(t => { gSizes[t] = 0; });
    let globalCartonNum = 1;
    let dataRowCount = 0;

    allResults.forEach((res, ci) => {
      const { nom, rows } = res;
      const realIdx = res.colorIndex ?? ci;
      const colorConfig = {
        nom: res.nom,
        mode: res.mode,
        tailles: res.tailles,
        sizes: originalSizesInputs[realIdx]?.D || {}
      } as ColorConfig;
      rows.forEach(r => {
        const isEven = dataRowCount % 2 === 0;
        const combRow = wsComb.getRow(ri);

        const cartonStartValue = globalCartonNum;
        const cartonEndValue = globalCartonNum + r.nbr - 1;
        globalCartonNum += r.nbr;

        const vals = [
          cartonStartValue,
          cartonEndValue,
          nom,
        ];
        if (isSkuColShownCombined) {
          vals.push(r.skus.join('/') || '—');
        }
        vals.push(
          ...combinedSizes.map(t => r.sizes[t] || ''),
          r.pcsPerCarton,
          r.nbr,
          r.totalPcs,
          Number(r.netWeightRow.toFixed(2)),
          Number(r.grossWeightRow.toFixed(2)),
          Number(r.cbmRow.toFixed(4))
        );

        vals.forEach((val, valIdx) => {
          const cell = combRow.getCell(valIdx + 1);
          cell.value = val;
          cell.border = borderThin;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };

          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (isEven ? colorsHex.rowA : colorsHex.rowB) } };
          if (valIdx === 0 || valIdx === 1) {
            cell.font = { color: { argb: 'FF' + colorsHex.navyBg }, size: 10, bold: true };
          } else if (valIdx === 2) {
            cell.font = { color: { argb: '000000' }, size: 10, bold: true };
          } else if (isSkuColShownCombined && valIdx === 3) {
            cell.font = { color: { argb: 'FF' + colorsHex.skuFg }, size: 10 };
          } else if (valIdx === ncComb - 3) {
            cell.font = { color: { argb: 'FF' + colorsHex.netFg }, size: 10, bold: true };
          } else if (valIdx === ncComb - 2) {
            cell.font = { color: { argb: 'FF' + colorsHex.grossFg }, size: 10, bold: true };
          } else {
            cell.font = { color: { argb: '333333' }, size: 10 };
          }
        });

        gTot.c += r.nbr;
        gTot.p += r.totalPcs;
        gTot.n += r.netWeightRow;
        gTot.g += r.grossWeightRow;
        gTot.v += r.cbmRow;
        combinedSizes.forEach(t => {
          gSizes[t] += (r.sizes[t] || 0) * r.nbr;
        });

        combRow.height = 18;
        ri++;
        dataRowCount++;
      });
    });

    // Combined grand total row
    const gtRow = wsComb.getRow(ri);
    const gtVals: (string | number)[] = [
      'GRAND TOTAL',
      '',
      'COULEURS MULTIPLES',
    ];
    if (isSkuColShownCombined) {
      gtVals.push('—');
    }
    gtVals.push(
      ...combinedSizes.map(t => gSizes[t] || 0),
      '',
      gTot.c,
      gTot.p,
      Number(gTot.n.toFixed(2)),
      Number(gTot.g.toFixed(2)),
      Number(gTot.v.toFixed(3))
    );

    gtVals.forEach((val, valIdx) => {
      const cell = gtRow.getCell(valIdx + 1);
      cell.value = val;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.totalBg } };
      cell.font = { color: { argb: 'FF' + colorsHex.totalFg }, size: 12, bold: true };
      cell.border = borderMedium;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    gtRow.height = 26;
    ri += 3;

    // Summary Color/Size breakdown grid
    wsComb.mergeCells(ri, 1, ri, ncComb);
    const sumCombTitle = wsComb.getRow(ri).getCell(1);
    sumCombTitle.value = 'RÉCAPITULATIF GLOBAL COULEURS / TAILLES';
    sumCombTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.yellowBg } };
    sumCombTitle.font = { color: { argb: 'FF' + colorsHex.yellowFg }, size: 11, bold: true };
    sumCombTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    wsComb.getRow(ri).height = 22;
    ri++;

    const bkHdr = wsComb.getRow(ri);
    ['COLOR / COULEUR', ...combinedSizes, 'TOTAL'].forEach((val, idx) => {
      const cell = bkHdr.getCell(idx + 1);
      cell.value = val;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.blueBg } };
      cell.font = { color: { argb: 'FF' + colorsHex.blueFg }, size: 10, bold: true };
      cell.border = borderThin;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    ri++;

    allResults.forEach((res, resIdx) => {
      const bkRow = wsComb.getRow(ri);
      const isEven = resIdx % 2 === 0;
      const bVals = [
        res.nom,
        ...combinedSizes.map(t => res.totals.sizes[t] || 0),
        res.totals.p
      ];
      bVals.forEach((val, valIdx) => {
        const cell = bkRow.getCell(valIdx + 1);
        cell.value = val;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (isEven ? 'FFFDF0' : 'FFFFFF') } };
        cell.border = borderThin;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (valIdx === 0) cell.font = { bold: true, size: 10 };
      });
      ri++;
    });

    const ttlRow = wsComb.getRow(ri);
    ['TOTAL GENERAL', ...combinedSizes.map(t => gSizes[t] || 0), gTot.p].forEach((val, idx) => {
      const cell = ttlRow.getCell(idx + 1);
      cell.value = val;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.totalBg } };
      cell.font = { color: { argb: 'FF' + colorsHex.totalFg }, size: 11, bold: true };
      cell.border = borderMedium;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    wsComb.views = [{ state: 'frozen', xSplit: isSkuColShownCombined ? 4 : 3, ySplit: hdrRiComb, activeCell: wsComb.getRow(hdrRiComb + 1).getCell(isSkuColShownCombined ? 5 : 4).address }];
  }

  // 3. SEPARATE BREAKDOWN SHEET FOR ALL COLORS
  const wsBreakdown = wb.addWorksheet('RECAP QUANTITÉS', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 }
  });

  // Calculate union of all sizes across results
  const breakdownSizes: string[] = [];
  allResults.forEach(r => {
    r.tailles.forEach(t => {
      const q = r.totals.sizes[t] || 0;
      if (isStandardSizeAlwaysShown(t) || q > 0) {
        if (!breakdownSizes.includes(t)) {
          breakdownSizes.push(t);
        }
      }
    });
  });

  // Configure column widths
  wsBreakdown.columns = [
    { width: 25 }, // Color
    ...breakdownSizes.map(() => ({ width: 12 })), // Sizes
    { width: 16 } // Total
  ];

  let bRowIdx = 1;

  // Title
  wsBreakdown.mergeCells(bRowIdx, 1, bRowIdx, breakdownSizes.length + 2);
  const bTitleCell = wsBreakdown.getRow(bRowIdx).getCell(1);
  bTitleCell.value = `GRILLE RÉCAPITULATIVE DES QUANTITÉS PAR COULEUR`;
  bTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.navyBg } };
  bTitleCell.font = { color: { argb: 'FF' + colorsHex.navyFg }, size: 14, bold: true };
  bTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  wsBreakdown.getRow(bRowIdx).height = 36;
  bRowIdx++;

  // Metadata block
  wsBreakdown.mergeCells(bRowIdx, 1, bRowIdx, breakdownSizes.length + 2);
  const bMetaCell = wsBreakdown.getRow(bRowIdx).getCell(1);
  bMetaCell.value = `Client: ${meta.customer || '—'} · Commande/Order: ${meta.order || '—'} · Style: ${meta.style || '—'} · Date: ${new Date().toLocaleDateString('fr-FR')}`;
  bMetaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.infoBg } };
  bMetaCell.font = { color: { argb: 'FF' + colorsHex.infoFg }, size: 10, bold: true };
  bMetaCell.border = borderThin;
  bMetaCell.alignment = { horizontal: 'left', vertical: 'middle' };
  wsBreakdown.getRow(bRowIdx).height = 20;
  bRowIdx += 2; // Spacing row

  // Table Headers
  const bHdrRow = wsBreakdown.getRow(bRowIdx);
  const bHdrVals = ['COULEUR / COLOR', ...breakdownSizes, 'TOTAL'];
  bHdrVals.forEach((val, idx) => {
    const cell = bHdrRow.getCell(idx + 1);
    cell.value = val;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.blueBg } };
    cell.font = { color: { argb: 'FF' + colorsHex.blueFg }, size: 10, bold: true };
    cell.border = borderThin;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  wsBreakdown.getRow(bRowIdx).height = 24;
  bRowIdx++;

  // Values rows
  const sizeGrandTotals: { [size: string]: number } = {};
  breakdownSizes.forEach(t => { sizeGrandTotals[t] = 0; });
  let grandTotalPcs = 0;

  allResults.forEach((res, resIdx) => {
    const row = wsBreakdown.getRow(bRowIdx);
    const isEven = resIdx % 2 === 0;
    
    row.getCell(1).value = res.nom;
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(1).border = borderThin;
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (isEven ? colorsHex.rowA : colorsHex.rowB) } };

    breakdownSizes.forEach((size, sIdx) => {
      const q = res.totals.sizes[size] || 0;
      sizeGrandTotals[size] += q;
      
      const cell = row.getCell(sIdx + 2);
      cell.value = q || '';
      cell.border = borderThin;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (isEven ? colorsHex.rowA : colorsHex.rowB) } };
    });

    const totCell = row.getCell(breakdownSizes.length + 2);
    totCell.value = res.totals.p;
    totCell.font = { bold: true };
    totCell.border = borderThin;
    totCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (isEven ? colorsHex.rowA : colorsHex.rowB) } };
    
    grandTotalPcs += res.totals.p;
    wsBreakdown.getRow(bRowIdx).height = 20;
    bRowIdx++;
  });

  // Grand Total row
  const bTtlRow = wsBreakdown.getRow(bRowIdx);
  bTtlRow.getCell(1).value = 'TOTAL GENERAL';
  bTtlRow.getCell(1).font = { bold: true, size: 11 };
  bTtlRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  bTtlRow.getCell(1).border = borderMedium;
  bTtlRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.totalBg } };

  breakdownSizes.forEach((size, sIdx) => {
    const cell = bTtlRow.getCell(sIdx + 2);
    cell.value = sizeGrandTotals[size];
    cell.font = { bold: true, size: 11 };
    cell.border = borderMedium;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.totalBg } };
  });

  const bGtCell = bTtlRow.getCell(breakdownSizes.length + 2);
  bGtCell.value = grandTotalPcs;
  bGtCell.font = { bold: true, size: 11 };
  bGtCell.border = borderMedium;
  bGtCell.alignment = { horizontal: 'center', vertical: 'middle' };
  bGtCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colorsHex.totalBg } };

  wsBreakdown.getRow(bRowIdx).height = 24;

  // 4. FILE EMISSION
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, userFilename);
}

/**
 * Converts a number from 0 to 150 into its exact French words representation.
 * Supporting numbers nicely for professional logistics and letters printing.
 */
export function numberToFrenchWords(n: number): string {
  if (n === 0) return 'zéro';
  
  const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];
  
  if (n < 20) return ones[n];
  if (n < 70) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    if (o === 1) return `${tens[t]}-et-un`;
    return o > 0 ? `${tens[t]}-${ones[o]}` : tens[t];
  }
  if (n < 80) {
    const o = n % 10;
    if (o === 0) return 'soixante-dix';
    if (o === 1) return `soixante-et-onze`;
    return `soixante-${ones[10 + o]}`;
  }
  if (n < 90) {
    const o = n % 10;
    return o > 0 ? `quatre-vingt-${ones[o]}` : `quatre-vingts`;
  }
  if (n < 100) {
    const o = n % 10;
    if (o === 0) return 'quatre-vingt-dix';
    return `quatre-vingt-${ones[10 + o]}`;
  }
  if (n === 100) return 'cent';
  if (n < 200) {
    return `cent ${numberToFrenchWords(n - 100)}`;
  }
  return n.toString();
}

/**
 * Checks if custom remainders for a specific color perfectly cover all required leftovers.
 */
export function validateColorCustomRemainders(
  colorConfig: ColorConfig,
  globalMode: 'strict_solide' | 'mixte_autorise',
  maxSizesPerBox: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const activeMode = colorConfig.mode === 'inherit' ? globalMode : colorConfig.mode;

  if (activeMode !== 'mixte_autorise' || !colorConfig.customRemaindersEnabled) {
    return { valid: true, errors };
  }

  // 1. Check max different sizes limit per mixed carton, and check maximum pieces in carton
  colorConfig.customRemainders?.forEach((cc, idx) => {
    const activeSizes = Object.keys(cc.sizes).filter(s => (Number(cc.sizes[s]) || 0) > 0);
    if (activeSizes.length > maxSizesPerBox) {
      errors.push(
        `Carton de reste n°${idx + 1} : Il contient ${activeSizes.length} tailles différentes (${activeSizes.join(', ')}), ce qui dépasse la limite autorisée par carton mixte (${maxSizesPerBox} tailles max selon vos paramètres logistiques).`
      );
    }

    if (activeSizes.length > 0) {
      // Get the capacity limit for each active size in the carton
      const caps = activeSizes.map(s => colorConfig.sizes[s]?.cap || 25);
      const limit = Math.min(...caps);
      
      const totalPcs = Object.values(cc.sizes).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);
      if (totalPcs > limit) {
        errors.push(
          `Carton de reste n°${idx + 1} : Le nombre total de pièces dans ce carton mixte (${totalPcs} pcs) dépasse le nombre maximum de pièces par carton autorisé pour les tailles incluses (${limit} pcs max).`
        );
      }
    }
  });

  // 2. Check allocated vs required remainders
  const { tailles, sizes } = colorConfig;
  tailles.forEach(sz => {
    const qTot = sizes[sz]?.qtyTot || 0;
    const cap = sizes[sz]?.cap || 25;
    const r = qTot % cap;

    let allocated = 0;
    colorConfig.customRemainders?.forEach((cc, idx) => {
      const val = Number(cc.sizes[sz]) || 0;
      allocated += val;

      if (val > 0) {
        // A. Check that remainder is not divided/separated
        if (val !== r) {
          errors.push(
            `Taille ${sz} dans Carton de reste n°${idx + 1} : Les restes ne peuvent pas être divisés. Vous devez allouer la totalité des ${r} pièces de reste ensemble (vous avez saisi ${val} pcs).`
          );
        }

        // B. Check that spelling matches the French letters
        const expectedSpelling = numberToFrenchWords(r).toLowerCase().trim();
        const userSpelling = (cc.writtenWords?.[sz] || '').toLowerCase().trim();
        if (userSpelling !== expectedSpelling) {
          errors.push(
            `Taille ${sz} dans Carton de reste n°${idx + 1} : Pour confirmer l'emballage de ces ${r} pièces de reste, vous devez écrire la quantité en toutes lettres : "${expectedSpelling}" dans le champ de vérification.`
          );
        }
      }
    });

    if (allocated !== r) {
      if (r > 0 || allocated > 0) {
        const lettersRequired = numberToFrenchWords(r).toUpperCase();
        const lettersAllocated = numberToFrenchWords(allocated).toUpperCase();
        errors.push(
          `Taille ${sz} : Vous avez alloué ${allocated} (${lettersAllocated}) pièces, mais le reste exact requis est de ${r} (${lettersRequired}) pièces.`
        );
      }
    }
  });

  return { valid: errors.length === 0, errors };
}
