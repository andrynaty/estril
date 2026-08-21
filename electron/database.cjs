const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

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
      updated_at TEXT NOT NULL
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

  return db;
}

function now() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function parsePayload(value) { try { return JSON.parse(value || '{}'); } catch { return {}; } }

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
  const parseDeliveryCsv = (content) => {
    const lines = String(content || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
    if (!lines.length) return [];
    const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
    const keys = parseCsvLine(lines[0], delimiter).map(header => csvAliases[normalizeCsvHeader(header)] || '');
    return lines.slice(1).map(line => parseCsvLine(line, delimiter)).filter(values => values.some(Boolean)).map(values => {
      const row = {};
      keys.forEach((key, index) => { if (key) row[key] = values[index] ?? ''; });
      const numeric = ['poQty', 'pcsPerCtn', 'numberOfCarton', 'l', 'h', 'w', 'cbm', 'grossWeight'];
      numeric.forEach(key => { if (row[key] !== undefined && row[key] !== '') row[key] = Number(String(row[key]).replace(',', '.')) || 0; });
      row.id = row.id || id('delivery_csv');
      row.cbm = Number(((Number(row.l) || 0) * (Number(row.h) || 0) * (Number(row.w) || 0)) / 1000000).toFixed(6);
      return row;
    });
  };
  const csvCandidates = () => {
    let executableDirectory = ''; let resourcesDirectory = '';
    try { executableDirectory = pathModule.dirname(app.getPath('exe')); } catch {}
    try { resourcesDirectory = process.resourcesPath || ''; } catch {}
    return Array.from(new Set([pathModule.join(executableDirectory, 'Delivery plan.csv'), pathModule.join(resourcesDirectory, 'Delivery plan.csv'), pathModule.join(app.getPath('userData'), 'Delivery plan.csv'), pathModule.join(storageRoot(), 'Delivery plan.csv')].filter(Boolean)));
  };
  let csvSyncPromise = null;
  const syncDeliveryCsv = () => {
    if (csvSyncPromise) return csvSyncPromise;
    csvSyncPromise = (async () => {
      const source = csvCandidates().find(candidate => fs.existsSync(candidate));
      if (!source) return { found: false, candidates: csvCandidates() };
      const [content, stat] = await Promise.all([fsPromises.readFile(source, 'utf8'), fsPromises.stat(source)]);
      const rows = parseDeliveryCsv(content);
      const timestamp = now();
      db.prepare(`INSERT INTO projects(id, name, customer, status, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json, updated_at=excluded.updated_at`).run(csvProjectId, 'Delivery plan.csv', '', 'system', JSON.stringify({ source, rows }), timestamp, timestamp);
      db.prepare(`INSERT INTO delivery_plans(id, project_id, plan_name, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id, plan_name=excluded.plan_name, payload_json=excluded.payload_json, updated_at=excluded.updated_at`).run(csvPlanId, csvProjectId, 'Delivery plan.csv', JSON.stringify({ source, rows }), timestamp, timestamp);
      db.prepare(`INSERT INTO app_settings(key, value, updated_at) VALUES ('deliveryCsvLastImported', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).run(JSON.stringify({ source, modifiedAt: stat.mtime.toISOString(), rows: rows.length }), timestamp);
      return { found: true, source, modifiedAt: stat.mtime.toISOString(), rows: rows.length };
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
  ipcMain.handle('ruba:delivery-csv-sync', async () => syncDeliveryCsv());
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
    const like = `%${String(query).trim()}%`;
    return db.prepare(`SELECT * FROM projects WHERE id <> ? AND (name LIKE ? OR customer LIKE ? OR order_number LIKE ?) ORDER BY updated_at DESC`).all(csvProjectId, like, like, like).map(row => ({ ...row, payload: parsePayload(row.payload_json) }));
  });
  ipcMain.handle('ruba:project-get', (_event, projectId) => {
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(String(projectId));
    return row ? { ...row, payload: parsePayload(row.payload_json) } : null;
  });
  ipcMain.handle('ruba:project-save', (_event, project = {}) => {
    const timestamp = now();
    const projectId = project.id || id('project');
    db.prepare(`INSERT INTO projects(id, name, customer, order_number, po_number, status, payload_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM projects WHERE id = ?), ?), ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, customer=excluded.customer, order_number=excluded.order_number,
      po_number=excluded.po_number, status=excluded.status, payload_json=excluded.payload_json, updated_at=excluded.updated_at`)
      .run(projectId, project.name || 'Travail sans nom', project.customer || '', project.orderNumber || '', project.poNumber || '', project.status || 'draft', JSON.stringify(project.payload || {}), projectId, timestamp, timestamp);
    log.run('project', projectId, project.id ? 'update' : 'create', JSON.stringify(project), timestamp);
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
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

  ipcMain.handle('ruba:delivery-plans-list', (_event, projectId) => db.prepare('SELECT * FROM delivery_plans WHERE project_id = ? ORDER BY updated_at DESC').all(String(projectId)));
  ipcMain.handle('ruba:delivery-reference-options', (_event, orderNumber = '') => {
    const target = String(orderNumber || '').trim().toLowerCase();
    const plans = db.prepare('SELECT payload_json FROM delivery_plans ORDER BY updated_at DESC').all();
    const rows = plans.flatMap((plan) => {
      const payload = parsePayload(plan.payload_json);
      return Array.isArray(payload.rows) ? payload.rows : [];
    }).filter((row) => {
      const order = String(row.customerCode ?? row.orderNumber ?? row.order ?? '').trim().toLowerCase();
      return !target || order === target || order.includes(target);
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
      cbm: Number(row.cbm) || 0
    })).filter((item) => item.po || item.length || item.width || item.height);
    return { rows, customers: unique('customerName'), pos: unique('customerPo'), colors: unique('color'), destinations: unique('dest'), dimensions };
  });
  ipcMain.handle('ruba:delivery-plan-save', (_event, plan = {}) => {
    const timestamp = now(); const planId = plan.id || id('plan');
    const rows = Array.isArray(plan.payload?.rows) ? plan.payload.rows : [];
    const save = db.transaction(() => {
      db.prepare(`INSERT INTO delivery_plans(id, project_id, plan_name, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id, plan_name=excluded.plan_name, payload_json=excluded.payload_json, updated_at=excluded.updated_at`).run(planId, plan.projectId, plan.planName || 'Delivery Plan', JSON.stringify(plan.payload || {}), timestamp, timestamp);
      db.prepare('DELETE FROM breakdown_rows WHERE delivery_plan_id = ?').run(planId);
      const insert = db.prepare(`INSERT INTO breakdown_rows(id, delivery_plan_id, row_order, size, color, quantity, destination, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      rows.forEach((row, index) => insert.run(id('breakdown'), planId, index, row.size || '', row.color || '', Number(row.quantity || row.poQty || 0), row.destination || row.dest || '', JSON.stringify(row)));
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
