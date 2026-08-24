const Database = require('better-sqlite3');
const XLSX = require('xlsx');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function createDatabase(userDataPath) {
  const db = new Database(path.join(userDataPath, 'ruba.sqlite'));
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      customer TEXT,
      order_number TEXT,
      po_number TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS project_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      customer TEXT,
      order_number TEXT,
      po_number TEXT,
      status TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(project_id, version_number)
    );

    CREATE TABLE IF NOT EXISTS packing_lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      project_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS work_files (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      mime_type TEXT,
      file_kind TEXT NOT NULL DEFAULT 'other',
      size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS delivery_plans (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS delivery_plan_rows (
      id TEXT PRIMARY KEY,
      delivery_plan_id TEXT NOT NULL,
      sheet_name TEXT NOT NULL DEFAULT '',
      row_order INTEGER NOT NULL DEFAULT 0,
      row_hash TEXT NOT NULL,
      order_number TEXT,
      customer_po TEXT,
      customer_name TEXT,
      color TEXT,
      destination TEXT,
      po_qty REAL NOT NULL DEFAULT 0,
      row_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(delivery_plan_id) REFERENCES delivery_plans(id) ON DELETE CASCADE,
      UNIQUE(delivery_plan_id, sheet_name, row_hash)
    );

    CREATE INDEX IF NOT EXISTS idx_delivery_rows_lookup ON delivery_plan_rows(order_number, customer_po, color);
    CREATE INDEX IF NOT EXISTS idx_delivery_rows_plan_sheet_order ON delivery_plan_rows(delivery_plan_id, sheet_name, row_order);
    CREATE INDEX IF NOT EXISTS idx_delivery_rows_hash ON delivery_plan_rows(delivery_plan_id, row_hash);

    CREATE TABLE IF NOT EXISTS breakdown_rows (
      id TEXT PRIMARY KEY,
      delivery_plan_id TEXT NOT NULL,
      row_order INTEGER NOT NULL DEFAULT 0,
      size TEXT,
      color TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      destination TEXT,
      payload_json TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY(delivery_plan_id) REFERENCES delivery_plans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      action TEXT NOT NULL,
      details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_delivery_plans_project_updated ON delivery_plans(project_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_breakdown_plan_order ON breakdown_rows(delivery_plan_id, row_order);
    CREATE INDEX IF NOT EXISTS idx_files_project_created ON work_files(project_id, created_at DESC);
  `);

  // Migrations for databases created by versions before v1.5.
  try { db.exec('ALTER TABLE projects ADD COLUMN archived_at TEXT'); } catch {}
  db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_archived_updated ON projects(archived_at, updated_at DESC);`);

  return db;
}

function now() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function parsePayload(value) { try { return JSON.parse(value || '{}'); } catch { return {}; } }
function rowHash(row) {
  const normalizeValue = (value) => {
    if (typeof value === 'string') return value.replace(/^\uFEFF/, '').replace(/\s+/g, ' ').trim();
    if (Array.isArray(value)) return value.map(normalizeValue);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'id').sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalizeValue(item)]));
    return value;
  };
  const normalized = normalizeValue(row || {});
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

function registerDatabaseIpc({ ipcMain, app, dialog, fsPromises, pathModule }) {
  const db = createDatabase(app.getPath('userData'));
  const defaultRoot = pathModule.join(app.getPath('userData'), 'files');
  fs.mkdirSync(defaultRoot, { recursive: true });
  if (!db.prepare('SELECT 1 FROM app_settings WHERE key = ?').get('storageRoot')) {
    db.prepare('INSERT INTO app_settings(key, value) VALUES (?, ?)').run('storageRoot', defaultRoot);
  }

  const log = db.prepare('INSERT INTO audit_events(entity_type, entity_id, action, details_json, created_at) VALUES (?, ?, ?, ?, ?)');
  const setting = db.prepare('SELECT value FROM app_settings WHERE key = ?');
  const storageRoot = () => setting.get('storageRoot')?.value || defaultRoot;
  const ensureRoot = () => fs.mkdirSync(storageRoot(), { recursive: true });
  const csvPlanId = 'delivery_csv_plan';
  const csvProjectId = 'delivery_csv_source';
  const replaceDeliveryRows = (planId, sheets, fallbackRows, timestamp = now()) => {
    const allSheets = Array.isArray(sheets) && sheets.length ? sheets : [{ name: '', rows: fallbackRows || [] }];
    const replace = db.transaction(() => {
      db.prepare('DELETE FROM delivery_plan_rows WHERE delivery_plan_id = ?').run(planId);
      const insert = db.prepare(`INSERT OR IGNORE INTO delivery_plan_rows(id, delivery_plan_id, sheet_name, row_order, row_hash, order_number, customer_po, customer_name, color, destination, po_qty, row_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      const seenHashes = new Set();
      let keptOrder = 0;
      allSheets.forEach(sheet => (sheet.rows || []).forEach((row) => {
        const normalized = { ...row };
        const hash = rowHash(Object.fromEntries(Object.entries(normalized).filter(([key]) => key !== 'id')));
        if (seenHashes.has(hash)) return;
        seenHashes.add(hash);
        insert.run(id('delivery_row'), planId, String(sheet.name || ''), keptOrder, hash, String(row.customerCode ?? row.orderNumber ?? row.order ?? '').trim(), String(row.customerPo ?? '').trim(), String(row.customerName ?? '').trim(), String(row.color ?? '').trim(), String(row.dest ?? row.destination ?? '').trim(), Number(row.poQty || 0), JSON.stringify(normalized), timestamp, timestamp);
        keptOrder += 1;
      }));
    });
    replace();
    return db.prepare('SELECT COUNT(*) AS count FROM delivery_plan_rows WHERE delivery_plan_id = ?').get(planId).count;
  };
  const normalizeCsvHeader = (value) => String(value || '').toLowerCase().replace(/[()]/g, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  const csvAliases = {
    date: 'date', season: 'season', 'customer code': 'customerCode', 'customer name': 'customerName', 'customer po': 'customerPo', color: 'color', dest: 'dest', destination: 'dest', 'po qty': 'poQty', 'target booking': 'targetBooking', 'target date for booking': 'targetBooking', 'actual booking': 'actualBooking', 'actual date for booking': 'actualBooking', 'target approval': 'targetApproval', 'target approval date': 'targetApproval', 'approval received': 'approvalReceived', 'date received approval': 'approvalReceived', 'pcs / ctn': 'pcsPerCtn', 'pcs per ctn': 'pcsPerCtn', 'packing type': 'packingType', 'number of carton': 'numberOfCarton', l: 'l', h: 'h', w: 'w', cbm: 'cbm', 'gross kg / ctn': 'grossWeight', 'gross weight per carton': 'grossWeight', 'initial ship mode': 'initialShipMode', 'target pl': 'targetPl'
  };
  const parseCsvLine = (line, delimiter) => {
    const values = []; let value = ''; let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"' && line[index + 1] === '"') { value += '"'; index += 1; continue; }
      if (char === '"') { quoted = !quoted; continue; }
      if (char === delimiter && !quoted) { values.push(value.trim()); value = ''; continue; }
      value += char;
    }
    values.push(value.trim()); return values;
  };
  const normalizeDeliveryMatrix = (matrix) => {
    if (!Array.isArray(matrix) || !matrix.length) return [];
    const headers = matrix[0].map(header => normalizeCsvHeader(header));
    const keys = headers.map(header => csvAliases[header] || '');
    return matrix.slice(1).filter(values => values.some(value => String(value ?? '').trim())).map(values => {
      const row = {};
      keys.forEach((key, index) => { if (key) row[key] = values[index] ?? ''; });
      const numeric = ['poQty', 'pcsPerCtn', 'numberOfCarton', 'l', 'h', 'w', 'cbm', 'grossWeight'];
      numeric.forEach(key => { if (row[key] !== undefined && row[key] !== '') row[key] = Number(String(row[key]).replace(',', '.')) || 0; });
      row.id = row.id || id('delivery_import');
      row.cbm = Number(((Number(row.l) || 0) * (Number(row.h) || 0) * (Number(row.w) || 0)) / 1000000).toFixed(6);
      return row;
    });
  };
  const parseDeliveryCsv = (content) => {
    const text = String(content || '').replace(/^\uFEFF/, '');
    const lines = [];
    let current = ''; let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === '"' && text[index + 1] === '"') { current += '""'; index += 1; continue; }
      if (char === '"') { quoted = !quoted; current += char; continue; }
      if ((char === '\n' || char === '\r') && !quoted) { if (current.trim()) lines.push(current); current = ''; if (char === '\r' && text[index + 1] === '\n') index += 1; continue; }
      current += char;
    }
    if (current.trim()) lines.push(current);
    if (!lines.length) return [];
    const delimiters = [';', ',', '\t'];
    const delimiter = delimiters.map(candidate => ({ candidate, count: parseCsvLine(lines[0], candidate).length })).sort((a, b) => b.count - a.count)[0].candidate;
    const matrix = lines.map(line => parseCsvLine(line, delimiter));
    const recognizedHeaders = matrix[0].map(header => csvAliases[normalizeCsvHeader(header)] || '').filter(Boolean).length;
    if (recognizedHeaders === 0) throw new Error('En-têtes CSV non reconnues. Utilisez les en-têtes du Delivery Plan.');
    return normalizeDeliveryMatrix(matrix);
  };
  const parseDeliveryWorkbook = (source) => {
    const workbook = XLSX.readFile(source, { raw: false, cellDates: false });
    const sheets = workbook.SheetNames.map((sheetName) => ({
      name: sheetName,
      rows: normalizeDeliveryMatrix(XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: false }))
    }));
    return { rows: sheets[0]?.rows || [], sheets };
  };
  const csvCandidates = () => {
    let executableDirectory = ''; let resourcesDirectory = '';
    try { executableDirectory = pathModule.dirname(app.getPath('exe')); } catch {}
    try { resourcesDirectory = process.resourcesPath || ''; } catch {}
    const directories = [executableDirectory, resourcesDirectory, app.getPath('userData'), storageRoot()].filter(Boolean);
    const fileNames = ['Delivery plan.csv', 'Delivery Plan.csv'];
    return Array.from(new Set(directories.flatMap(directory => fileNames.map(fileName => pathModule.join(directory, fileName)))));
  };
  let csvSyncPromise = null;
  const syncDeliveryCsv = () => {
    if (csvSyncPromise) return csvSyncPromise;
    csvSyncPromise = (async () => {
      const source = csvCandidates().find(candidate => fs.existsSync(candidate));
      if (!source) return { found: false, candidates: csvCandidates() };
      let stat; let csvText = ''; let stable = false;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const before = await fsPromises.stat(source);
        csvText = await fsPromises.readFile(source, 'utf8');
        const after = await fsPromises.stat(source);
        if (before.size === after.size && before.mtimeMs === after.mtimeMs) { stat = after; stable = true; break; }
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      if (!stable || !stat) throw new Error('Le fichier Delivery plan.csv est encore en cours d’écriture.');
      const csvRows = parseDeliveryCsv(csvText);
      const parsed = { rows: csvRows, sheets: [{ name: 'CSV', rows: csvRows }] };
      const rows = parsed.rows;
      const timestamp = now();
      const sheetMeta = (parsed.sheets || []).map(sheet => ({ name: sheet.name, rows: sheet.rows.length }));
      // Respect SQLite foreign keys: create the project and plan parents first.
      db.prepare(`INSERT INTO projects(id, name, customer, status, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json, updated_at=excluded.updated_at`).run(csvProjectId, pathModule.basename(source), '', 'system', JSON.stringify({ source, sheetMeta, activeSheet: parsed.sheets[0]?.name || '' }), timestamp, timestamp);
      db.prepare(`INSERT INTO delivery_plans(id, project_id, plan_name, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id, plan_name=excluded.plan_name, payload_json=excluded.payload_json, updated_at=excluded.updated_at`).run(csvPlanId, csvProjectId, pathModule.basename(source), JSON.stringify({ source, sheetMeta, activeSheet: parsed.sheets[0]?.name || '' }), timestamp, timestamp);
      replaceDeliveryRows(csvPlanId, parsed.sheets, rows, timestamp);
      db.prepare(`INSERT INTO app_settings(key, value, updated_at) VALUES ('deliveryCsvLastImported', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).run(JSON.stringify({ source, modifiedAt: stat.mtime.toISOString(), rows: rows.length }), timestamp);
      return { found: true, source, modifiedAt: stat.mtime.toISOString(), rows: rows.length, sheets: sheetMeta };
    })().finally(() => { csvSyncPromise = null; });
    return csvSyncPromise;
  };
  const csvWatchers = csvCandidates();
  csvWatchers.forEach(candidate => fs.watchFile(candidate, { interval: 2000 }, async (current, previous) => {
    if (current.mtimeMs !== previous.mtimeMs && current.mtimeMs > 0) { try { await syncDeliveryCsv(); } catch {} }
  }));
  void syncDeliveryCsv().catch(() => {});

  ipcMain.handle('ruba:db-summary', () => ({
    projects: db.prepare('SELECT COUNT(*) AS count FROM projects WHERE id <> ?').get(csvProjectId).count,
    packingLists: db.prepare('SELECT COUNT(*) AS count FROM packing_lists').get().count,
    files: db.prepare('SELECT COUNT(*) AS count FROM work_files').get().count,
    deliveryPlans: db.prepare('SELECT COUNT(*) AS count FROM delivery_plans WHERE id <> ?').get(csvPlanId).count,
    breakdownRows: db.prepare('SELECT COUNT(*) AS count FROM breakdown_rows WHERE delivery_plan_id <> ?').get(csvPlanId).count,
  }));

  ipcMain.handle('ruba:settings-get', (_event, key) => setting.get(String(key))?.value ?? null);
  ipcMain.handle('ruba:settings-set', (_event, key, value) => {
    db.prepare(`INSERT INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).run(String(key), String(value), now());
    log.run('setting', String(key), 'update', JSON.stringify({ value }), now());
    return true;
  });

  ipcMain.handle('ruba:storage-root', () => storageRoot());
  ipcMain.handle('ruba:delivery-csv-sync', async () => {
    try { return await syncDeliveryCsv(); }
    catch (error) { return { found: false, error: error instanceof Error ? error.message : String(error), candidates: csvCandidates() }; }
  });
  ipcMain.handle('ruba:delivery-csv-status', () => setting.get('deliveryCsvLastImported')?.value ? parsePayload(setting.get('deliveryCsvLastImported').value) : { found: false, candidates: csvCandidates() });

  ipcMain.handle('ruba:storage-root-choose', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || !result.filePaths[0]) return null;
    const selected = result.filePaths[0];
    fs.mkdirSync(selected, { recursive: true });
    db.prepare(`INSERT INTO app_settings(key, value, updated_at) VALUES ('storageRoot', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).run(selected, now());
    log.run('setting', 'storageRoot', 'update', JSON.stringify({ value: selected }), now());
    return selected;
  });

  ipcMain.handle('ruba:projects-list', (_event, query = '') => {
    const filters = typeof query === 'string' ? { search: query } : (query || {});
    const like = `%${String(filters.search || '').trim()}%`;
    const customerLike = `%${String(filters.customer || '').trim()}%`;
    const status = String(filters.status || '').trim();
    const archived = filters.archived === true ? 1 : filters.archived === false ? 0 : null;
    const fromDate = String(filters.fromDate || '').trim();
    const toDate = String(filters.toDate || '').trim();
    const rows = db.prepare(`SELECT * FROM projects
      WHERE id <> ?
        AND (name LIKE ? OR customer LIKE ? OR order_number LIKE ? OR po_number LIKE ? OR payload_json LIKE ?)
        AND (? = '' OR customer LIKE ?)
        AND (? = '' OR status = ?)
        AND (? IS NULL OR (? = 1 AND archived_at IS NOT NULL) OR (? = 0 AND archived_at IS NULL))
        AND (? = '' OR updated_at >= ?)
        AND (? = '' OR updated_at <= ?)
      ORDER BY updated_at DESC`).all(csvProjectId, like, like, like, like, like, customerLike, customerLike, status, status, archived, archived, archived, fromDate, fromDate, toDate, toDate);
    return rows.map(row => ({ ...row, archived: Boolean(row.archived_at), payload: parsePayload(row.payload_json) }));
  });
  ipcMain.handle('ruba:project-get', (_event, projectId) => {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(String(projectId));
    return row ? { ...row, payload: parsePayload(row.payload_json) } : null;
  });
  ipcMain.handle('ruba:project-save', (_event, project = {}) => {
    const timestamp = now();
    const projectId = project.id || id('project');
    const previous = project.id ? db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) : null;
    if (previous) {
      const nextVersion = (db.prepare('SELECT COALESCE(MAX(version_number), 0) AS value FROM project_versions WHERE project_id = ?').get(projectId).value || 0) + 1;
      db.prepare(`INSERT INTO project_versions(id, project_id, version_number, name, customer, order_number, po_number, status, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id('project_version'), projectId, nextVersion, previous.name, previous.customer || '', previous.order_number || '', previous.po_number || '', previous.status || 'draft', previous.payload_json || '{}', timestamp);
    }
    db.prepare(`INSERT INTO projects(id, name, customer, order_number, po_number, status, payload_json, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM projects WHERE id = ?), ?), ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, customer=excluded.customer, order_number=excluded.order_number,
      po_number=excluded.po_number, status=excluded.status, payload_json=excluded.payload_json, archived_at=COALESCE(excluded.archived_at, projects.archived_at), updated_at=excluded.updated_at`)
      .run(projectId, project.name || 'Travail sans nom', project.customer || '', project.orderNumber || '', project.poNumber || '', project.status || 'draft', JSON.stringify(project.payload || {}), projectId, timestamp, timestamp, project.archivedAt || null);
    log.run('project', projectId, project.id ? 'update' : 'create', JSON.stringify(project), timestamp);
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  });
  ipcMain.handle('ruba:project-archive', (_event, projectId) => {
    const timestamp = now();
    db.prepare('UPDATE projects SET archived_at = ?, status = ?, updated_at = ? WHERE id = ?').run(timestamp, 'archived', timestamp, String(projectId));
    log.run('project', String(projectId), 'archive', '{}', timestamp);
    return true;
  });
  ipcMain.handle('ruba:project-restore', (_event, projectId) => {
    const timestamp = now();
    db.prepare('UPDATE projects SET archived_at = NULL, status = ?, updated_at = ? WHERE id = ?').run('draft', timestamp, String(projectId));
    log.run('project', String(projectId), 'restore', '{}', timestamp);
    return true;
  });
  ipcMain.handle('ruba:project-versions-list', (_event, projectId) => db.prepare('SELECT * FROM project_versions WHERE project_id = ? ORDER BY version_number DESC').all(String(projectId)).map(row => ({ ...row, payload: parsePayload(row.payload_json) })));
  ipcMain.handle('ruba:project-version-restore', (_event, versionId) => {
    const version = db.prepare('SELECT * FROM project_versions WHERE id = ?').get(String(versionId));
    if (!version) return null;
    const timestamp = now();
    db.prepare('UPDATE projects SET name = ?, customer = ?, order_number = ?, po_number = ?, status = ?, payload_json = ?, archived_at = NULL, updated_at = ? WHERE id = ?').run(version.name, version.customer || '', version.order_number || '', version.po_number || '', version.status || 'draft', version.payload_json || '{}', timestamp, version.project_id);
    log.run('project', version.project_id, 'version_restore', JSON.stringify({ versionId, versionNumber: version.version_number }), timestamp);
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(version.project_id);
  });
  ipcMain.handle('ruba:project-delete', (_event, projectId) => {
    db.prepare('DELETE FROM projects WHERE id = ?').run(String(projectId));
    log.run('project', String(projectId), 'delete', '{}', now());
    return true;
  });

  ipcMain.handle('ruba:packing-lists-list', (_event, query = '') => {
    const like = `%${String(query).trim()}%`;
    return db.prepare(`SELECT packing_lists.*, projects.name AS project_name
      FROM packing_lists LEFT JOIN projects ON projects.id = packing_lists.project_id
      WHERE packing_lists.name LIKE ? OR COALESCE(projects.name, '') LIKE ?
      ORDER BY packing_lists.updated_at DESC`).all(like, like);
  });
  ipcMain.handle('ruba:packing-list-get', (_event, packingListId) => {
    const row = db.prepare('SELECT * FROM packing_lists WHERE id = ?').get(String(packingListId));
    return row ? { ...row, payload: JSON.parse(row.payload_json || '{}') } : null;
  });
  ipcMain.handle('ruba:packing-list-save', (_event, packingList = {}) => {
    const timestamp = now();
    const packingListId = packingList.id || id('packing');
    db.prepare(`INSERT INTO packing_lists(id, name, project_id, status, payload_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM packing_lists WHERE id = ?), ?), ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, project_id=excluded.project_id,
      status=excluded.status, payload_json=excluded.payload_json, updated_at=excluded.updated_at`)
      .run(packingListId, packingList.name || 'Packing List sans nom', packingList.projectId || null,
        packingList.status || 'draft', JSON.stringify(packingList.payload || {}), packingListId, timestamp, timestamp);
    log.run('packing_list', packingListId, packingList.id ? 'update' : 'create', JSON.stringify({ name: packingList.name }), timestamp);
    const row = db.prepare('SELECT * FROM packing_lists WHERE id = ?').get(packingListId);
    return { ...row, payload: JSON.parse(row.payload_json || '{}') };
  });
  ipcMain.handle('ruba:packing-list-delete', (_event, packingListId) => {
    db.prepare('DELETE FROM packing_lists WHERE id = ?').run(String(packingListId));
    log.run('packing_list', String(packingListId), 'delete', '{}', now());
    return true;
  });
  ipcMain.handle('ruba:packing-lists-delete-all', () => {
    const result = db.prepare('DELETE FROM packing_lists').run();
    log.run('packing_list', null, 'delete_all', JSON.stringify({ count: result.changes }), now());
    return result.changes;
  });

  ipcMain.handle('ruba:file-import', async (_event, options = {}) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: options.filters || [{ name: 'Fichiers Excel', extensions: ['xlsx', 'xls', 'csv'] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    ensureRoot();
    const source = result.filePaths[0];
    const fileName = pathModule.basename(source);
    const target = pathModule.join(storageRoot(), `${Date.now()}-${fileName}`);
    await fsPromises.copyFile(source, target);
    const stat = await fsPromises.stat(target);
    const fileId = id('file'); const timestamp = now();
    db.prepare(`INSERT INTO work_files(id, project_id, name, stored_path, mime_type, file_kind, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(fileId, options.projectId || null, fileName, target, options.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', options.fileKind || 'excel', stat.size, timestamp);
    log.run('file', fileId, 'import', JSON.stringify({ source, target }), timestamp);
    return db.prepare('SELECT * FROM work_files WHERE id = ?').get(fileId);
  });

  ipcMain.handle('ruba:files-list', (_event, filters = {}) => {
    const search = `%${String(filters.search || '').trim()}%`;
    return db.prepare(`SELECT work_files.*, projects.name AS project_name FROM work_files LEFT JOIN projects ON projects.id = work_files.project_id
      WHERE work_files.name LIKE ? OR COALESCE(projects.name, '') LIKE ? ORDER BY work_files.created_at DESC`).all(search, search);
  });
  ipcMain.handle('ruba:file-register', (_event, file = {}) => {
    const fileId = file.id || id('file');
    const timestamp = now();
    db.prepare(`INSERT INTO work_files(id, project_id, name, stored_path, mime_type, file_kind, size_bytes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, stored_path=excluded.stored_path,
      mime_type=excluded.mime_type, file_kind=excluded.file_kind, size_bytes=excluded.size_bytes`).run(fileId, file.projectId || null, file.name || pathModule.basename(file.path || ''), file.path || '', file.mimeType || '', file.fileKind || 'other', Number(file.sizeBytes || 0), timestamp);
    log.run('file', fileId, file.id ? 'update' : 'create', JSON.stringify(file), timestamp);
    return db.prepare('SELECT * FROM work_files WHERE id = ?').get(fileId);
  });
  ipcMain.handle('ruba:file-delete', async (_event, fileId) => {
    const row = db.prepare('SELECT stored_path FROM work_files WHERE id = ?').get(String(fileId));
    if (row?.stored_path && row.stored_path.startsWith(storageRoot())) await fsPromises.rm(row.stored_path, { force: true });
    db.prepare('DELETE FROM work_files WHERE id = ?').run(String(fileId));
    log.run('file', String(fileId), 'delete', '{}', now());
    return true;
  });

  ipcMain.handle('ruba:delivery-plans-list', (_event, projectId) => {
    const plans = db.prepare('SELECT * FROM delivery_plans WHERE project_id = ? ORDER BY updated_at DESC').all(String(projectId));
    plans.forEach(plan => {
      const count = db.prepare('SELECT COUNT(*) AS count FROM delivery_plan_rows WHERE delivery_plan_id = ?').get(plan.id).count;
      if (!count) {
        const payload = parsePayload(plan.payload_json);
        if (Array.isArray(payload.rows) && payload.rows.length) replaceDeliveryRows(plan.id, payload.sheets, payload.rows, plan.updated_at || now());
      }
    });
    return plans;
  });
  ipcMain.handle('ruba:delivery-rows-list', (_event, options = {}) => {
    const planId = String(options.planId || csvPlanId);
    const sheet = String(options.sheetName || '');
    const page = Math.max(0, Number(options.page || 0));
    const pageSize = Math.max(100, Math.min(500, Number(options.pageSize || 250)));
    const search = `%${String(options.search || '').trim()}%`;
    const params = [planId, search, search, search, search, search, search, search, search];
    const where = `delivery_plan_id = ? AND (? = '%%' OR order_number LIKE ? OR customer_po LIKE ? OR customer_name LIKE ? OR color LIKE ? OR destination LIKE ? OR row_json LIKE ?) AND (? = '' OR sheet_name = ?)`;
    const count = db.prepare(`SELECT COUNT(*) AS count FROM delivery_plan_rows WHERE ${where}`).get(planId, search, search, search, search, search, search, search, sheet, sheet).count;
    const rows = db.prepare(`SELECT id, sheet_name, row_order, row_json FROM delivery_plan_rows WHERE ${where} ORDER BY sheet_name, row_order LIMIT ? OFFSET ?`).all(planId, search, search, search, search, search, search, search, sheet, sheet, pageSize, page * pageSize).map(row => ({ ...parsePayload(row.row_json), id: row.id, sheetName: row.sheet_name }));
    return { rows, total: count, page, pageSize };
  });
  ipcMain.handle('ruba:delivery-rows-delete', (_event, options = {}) => {
    const ids = Array.isArray(options.ids) ? options.ids.map(String).filter(Boolean) : [];
    if (!ids.length) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const result = db.prepare(`DELETE FROM delivery_plan_rows WHERE id IN (${placeholders})`).run(...ids);
    return result.changes;
  });
  ipcMain.handle('ruba:delivery-rows-clear', (_event, planId = csvPlanId) => db.prepare('DELETE FROM delivery_plan_rows WHERE delivery_plan_id = ?').run(String(planId)).changes);
  ipcMain.handle('ruba:delivery-rows-export-csv', async (_event, options = {}) => {
    ensureRoot();
    const planId = String(options.planId || csvPlanId);
    const rows = db.prepare('SELECT row_json FROM delivery_plan_rows WHERE delivery_plan_id = ? ORDER BY sheet_name, row_order').all(planId).map(row => parsePayload(row.row_json));
    const keys = Object.keys(rows[0] || {});
    const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [keys.join(','), ...rows.map(row => keys.map(key => escape(row[key])).join(','))].join('\n');
    const target = pathModule.join(storageRoot(), `Delivery-plan-export-${Date.now()}.csv`);
    await fsPromises.writeFile(target, csv, 'utf8');
    return { path: target, rows: rows.length };
  });
  ipcMain.handle('ruba:delivery-reference-options', (_event, request = '') => {
    const input = typeof request === 'string' ? { orderNumber: request } : (request || {});
    const target = String(input.orderNumber || '').trim();
    const customer = String(input.customer || '').trim();
    const po = String(input.po || '').trim();
    if (!target) return { rows: [], customers: [], pos: [], colors: [], destinations: [], dimensions: [] };
    const storedRows = db.prepare(`SELECT row_json FROM delivery_plan_rows WHERE lower(trim(order_number)) = lower(?) ORDER BY updated_at DESC, id`).all(target);
    const rows = storedRows.map(row => parsePayload(row.row_json)).filter(row => {
      const order = String(row.customerCode ?? row.orderNumber ?? row.order ?? '').trim();
      const rowCustomer = String(row.customerName ?? '').trim();
      const rowPo = String(row.customerPo ?? '').trim();
      return order.toLowerCase() === target.toLowerCase()
        && (!customer || rowCustomer.toLowerCase() === customer.toLowerCase())
        && (!po || rowPo.toLowerCase() === po.toLowerCase());
    });
    const unique = (key) => Array.from(new Set(rows.map((row) => String(row[key] ?? '').trim()).filter(Boolean)));
    const dimensions = rows.map((row) => ({
      orderNumber: String(row.customerCode ?? row.orderNumber ?? row.order ?? '').trim(),
      po: String(row.customerPo ?? '').trim(),
      customer: String(row.customerName ?? '').trim(),
      color: String(row.color ?? '').trim(),
      destination: String(row.dest ?? '').trim(),
      length: Number(row.l) || 0,
      width: Number(row.w) || 0,
      height: Number(row.h) || 0,
      cbm: Number(row.cbm) || 0,
      poQty: Number(row.poQty) || 0
    })).filter((item) => item.po || item.length || item.width || item.height);
    return { rows, customers: unique('customerName'), pos: unique('customerPo'), colors: unique('color'), destinations: unique('dest'), dimensions };
  });
  ipcMain.handle('ruba:delivery-order-matches', (_event, request = '') => {
    const prefix = String(typeof request === 'string' ? request : request?.prefix || '').trim();
    if (!prefix) return [];
    return db.prepare(`SELECT order_number AS orderNumber, MAX(customer_name) AS customer, COUNT(*) AS rowCount
      FROM delivery_plan_rows
      WHERE lower(trim(order_number)) LIKE lower(?) || '%' AND trim(order_number) <> ''
      GROUP BY lower(trim(order_number))
      ORDER BY order_number`).all(prefix);
  });
  ipcMain.handle('ruba:delivery-compatible-orders', (_event, request = {}) => {
    const orderNumber = String(request.orderNumber || '').trim();
    const customer = String(request.customer || '').trim();
    const po = String(request.po || '').trim();
    if (!customer || !po) return [];
    const rows = db.prepare(`SELECT candidate.order_number AS orderNumber, candidate.customer_name AS customer, candidate.customer_po AS po, candidate.color, candidate.destination, SUM(candidate.po_qty) AS poQty
      FROM delivery_plan_rows AS candidate
      WHERE lower(trim(candidate.customer_name)) = lower(?)
        AND lower(trim(candidate.customer_po)) = lower(?)
        AND trim(candidate.order_number) <> ''
        AND lower(trim(candidate.order_number)) <> lower(?)
        AND trim(candidate.color) <> ''
        AND EXISTS (
          SELECT 1 FROM delivery_plan_rows AS active
          WHERE lower(trim(active.order_number)) = lower(?)
            AND lower(trim(active.customer_name)) = lower(?)
            AND lower(trim(active.customer_po)) = lower(?)
            AND lower(trim(active.color)) = lower(trim(candidate.color))
        )
      GROUP BY lower(trim(candidate.order_number)), lower(trim(candidate.color)), candidate.color, candidate.destination
      ORDER BY candidate.order_number, candidate.color`).all(customer, po, orderNumber, orderNumber, customer, po);
    const grouped = new Map();
    for (const row of rows) {
      const key = String(row.orderNumber || '').trim().toLowerCase();
      const current = grouped.get(key) || { order: String(row.orderNumber || '').trim(), customer: String(row.customer || '').trim(), po: String(row.po || '').trim(), colors: [] };
      current.colors.push({ color: String(row.color || '').trim(), poQty: Number(row.poQty || 0), destination: String(row.destination || '').trim() });
      grouped.set(key, current);
    }
    return Array.from(grouped.values());
  });
  ipcMain.handle('ruba:delivery-breakdown', (_event, request = {}) => {
    const orderNumber = String(request.orderNumber || '').trim();
    const customer = String(request.customer || '').trim();
    const po = String(request.po || '').trim();
    if (!orderNumber) return [];
    const rows = db.prepare(`SELECT color, SUM(po_qty) AS poQty FROM delivery_plan_rows WHERE lower(trim(order_number)) = lower(?) AND (? = '' OR lower(trim(customer_name)) = lower(?)) AND (? = '' OR lower(trim(customer_po)) = lower(?)) AND trim(color) <> '' GROUP BY lower(trim(color)), color ORDER BY color`).all(orderNumber, customer, customer, po, po);
    return rows.map(row => ({ color: String(row.color || '').trim(), poQty: Number(row.poQty || 0) }));
  });
  ipcMain.handle('ruba:delivery-plan-save', (_event, plan = {}) => {
    const timestamp = now(); const planId = plan.id || id('plan');
    const rows = Array.isArray(plan.payload?.rows) ? plan.payload.rows : [];
    const save = db.transaction(() => {
      db.prepare(`INSERT INTO delivery_plans(id, project_id, plan_name, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`).run(planId, plan.projectId || null, plan.planName || 'Delivery Plan', JSON.stringify({ paged: Boolean(plan.payload?.paged) }), timestamp, timestamp);
      if (plan.payload?.paged) {
        const updateRow = db.prepare(`UPDATE delivery_plan_rows SET row_json = ?, row_hash = ?, order_number = ?, customer_po = ?, customer_name = ?, color = ?, destination = ?, po_qty = ?, updated_at = ? WHERE id = ? AND delivery_plan_id = ?`);
        const insertRow = db.prepare(`INSERT OR IGNORE INTO delivery_plan_rows(id, delivery_plan_id, sheet_name, row_order, row_hash, order_number, customer_po, customer_name, color, destination, po_qty, row_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        rows.forEach((row, index) => { const hash = rowHash(row); const result = updateRow.run(JSON.stringify(row), hash, String(row.customerCode ?? row.orderNumber ?? row.order ?? '').trim(), String(row.customerPo ?? '').trim(), String(row.customerName ?? '').trim(), String(row.color ?? '').trim(), String(row.dest ?? row.destination ?? '').trim(), Number(row.poQty || 0), timestamp, String(row.id), planId); if (!result.changes) insertRow.run(String(row.id || id('delivery_row')), planId, String(row.sheetName || ''), index, hash, String(row.customerCode ?? row.orderNumber ?? row.order ?? '').trim(), String(row.customerPo ?? '').trim(), String(row.customerName ?? '').trim(), String(row.color ?? '').trim(), String(row.dest ?? row.destination ?? '').trim(), Number(row.poQty || 0), JSON.stringify(row), timestamp, timestamp); });
      } else {
        replaceDeliveryRows(planId, plan.payload?.sheets, rows, timestamp);
      }
      const sheetMeta = (plan.payload?.sheets || []).map((sheet) => ({ name: sheet.name, rows: Array.isArray(sheet.rows) ? sheet.rows.length : 0 }));
      db.prepare(`INSERT INTO delivery_plans(id, project_id, plan_name, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id, plan_name=excluded.plan_name, payload_json=excluded.payload_json, updated_at=excluded.updated_at`).run(planId, plan.projectId, plan.planName || 'Delivery Plan', JSON.stringify({ ...(plan.payload || {}), rows: undefined, sheetMeta }), timestamp, timestamp);
      if (!plan.payload?.paged) db.prepare('DELETE FROM breakdown_rows WHERE delivery_plan_id = ?').run(planId);
      const insert = db.prepare(`INSERT INTO breakdown_rows(id, delivery_plan_id, row_order, size, color, quantity, destination, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      if (!plan.payload?.paged) rows.forEach((row, index) => insert.run(id('breakdown'), planId, index, row.size || '', row.color || '', Number(row.quantity || row.poQty || 0), row.destination || row.dest || '', JSON.stringify(row)));
    });
    save();
    log.run('delivery_plan', planId, plan.id ? 'update' : 'create', JSON.stringify({ projectId: plan.projectId, rows: rows.length }), timestamp);
    return db.prepare('SELECT * FROM delivery_plans WHERE id = ?').get(planId);
  });
  ipcMain.handle('ruba:breakdown-replace', (_event, payload = {}) => {
    const replace = db.transaction(() => {
      db.prepare('DELETE FROM breakdown_rows WHERE delivery_plan_id = ?').run(payload.deliveryPlanId);
      const insert = db.prepare(`INSERT INTO breakdown_rows(id, delivery_plan_id, row_order, size, color, quantity, destination, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      (payload.rows || []).forEach((row, index) => insert.run(id('breakdown'), payload.deliveryPlanId, index, row.size || '', row.color || '', Number(row.quantity || 0), row.destination || '', JSON.stringify(row)));
    });
    replace();
    return db.prepare('SELECT * FROM breakdown_rows WHERE delivery_plan_id = ? ORDER BY row_order').all(payload.deliveryPlanId);
  });

  ipcMain.handle('ruba:audit-list', (_event, limit = 100) => db.prepare('SELECT * FROM audit_events ORDER BY id DESC LIMIT ?').all(Number(limit)));
  return db;
}

module.exports = { registerDatabaseIpc, createDatabase };
