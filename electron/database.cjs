const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

function createDatabase(userDataPath) {
  const db = new Database(path.join(userDataPath, 'ruba.sqlite'));
  db.pragma('journal_mode = WAL');
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
  `);

  return db;
}

function now() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }

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

  ipcMain.handle('ruba:db-summary', () => ({
    projects: db.prepare('SELECT COUNT(*) AS count FROM projects').get().count,
    files: db.prepare('SELECT COUNT(*) AS count FROM work_files').get().count,
    deliveryPlans: db.prepare('SELECT COUNT(*) AS count FROM delivery_plans').get().count,
    breakdownRows: db.prepare('SELECT COUNT(*) AS count FROM breakdown_rows').get().count,
  }));

  ipcMain.handle('ruba:settings-get', (_event, key) => setting.get(String(key))?.value ?? null);
  ipcMain.handle('ruba:settings-set', (_event, key, value) => {
    db.prepare(`INSERT INTO app_settings(key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).run(String(key), String(value), now());
    log.run('setting', String(key), 'update', JSON.stringify({ value }), now());
    return true;
  });

  ipcMain.handle('ruba:storage-root', () => storageRoot());
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
    return db.prepare(`SELECT * FROM projects WHERE name LIKE ? OR customer LIKE ? OR order_number LIKE ? ORDER BY updated_at DESC`).all(like, like, like);
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
  ipcMain.handle('ruba:delivery-plan-save', (_event, plan = {}) => {
    const timestamp = now(); const planId = plan.id || id('plan');
    db.prepare(`INSERT INTO delivery_plans(id, project_id, plan_name, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET plan_name=excluded.plan_name, payload_json=excluded.payload_json, updated_at=excluded.updated_at`).run(planId, plan.projectId, plan.planName || 'Delivery Plan', JSON.stringify(plan.payload || {}), timestamp, timestamp);
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

module.exports = { registerDatabaseIpc };
