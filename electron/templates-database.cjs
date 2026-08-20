const Database = require('better-sqlite3');
const path = require('node:path');

function now() { return new Date().toISOString(); }
function makeId() { return `template_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }

function registerTemplatesDatabaseIpc({ ipcMain, app, fsPromises }) {
  const dbPath = path.join(app.getPath('userData'), 'ruba_gabarits.sqlite');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS template_models (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      length_cm REAL,
      width_cm REAL,
      height_cm REAL,
      weight_kg REAL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_template_models_category ON template_models(category);
  `);

  const legacySchema = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'template_models'").get()?.sql || '';
  if (/CHECK\s*\(\s*category\s+IN/i.test(legacySchema)) {
    const migrate = db.transaction(() => {
      db.exec(`CREATE TABLE template_models_v2 (
        id TEXT PRIMARY KEY, category TEXT NOT NULL, name TEXT NOT NULL,
        length_cm REAL, width_cm REAL, height_cm REAL, weight_kg REAL,
        active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )`);
      db.exec('INSERT INTO template_models_v2 SELECT id, category, name, length_cm, width_cm, height_cm, weight_kg, active, created_at, updated_at FROM template_models');
      db.exec('DROP TABLE template_models');
      db.exec('ALTER TABLE template_models_v2 RENAME TO template_models');
      db.exec('CREATE INDEX IF NOT EXISTS idx_template_models_category ON template_models(category)');
    });
    migrate();
  }

  const normalizeCategory = (value) => {
    const category = String(value || 'dimension').trim().toLowerCase();
    if (!['dimension', 'weight_piece', 'weight_carton', 'customer'].includes(category)) throw new Error('Catégorie de gabarit invalide.');
    return category;
  };
  const normalize = (template = {}) => {
    const category = normalizeCategory(template.category);
    const numberOrNull = (value) => value === '' || value == null || Number.isNaN(Number(value)) ? null : Number(value);
    return {
      id: template.id || makeId(), category,
      name: String(template.name || template.customerName || 'Gabarit sans nom').trim(),
      lengthCm: category === 'dimension' ? numberOrNull(template.lengthCm ?? template.length_cm ?? template.L) : null,
      widthCm: category === 'dimension' ? numberOrNull(template.widthCm ?? template.width_cm ?? template.l) : null,
      heightCm: category === 'dimension' ? numberOrNull(template.heightCm ?? template.height_cm ?? template.h) : null,
      weightKg: category === 'weight_piece' || category === 'weight_carton' ? numberOrNull(template.weightKg ?? template.weight_kg ?? template.weight) : null,
      active: template.active === false || Number(template.active) === 0 ? 0 : 1,
    };
  };
  const present = (row) => row ? { ...row,
    lengthCm: row.length_cm == null ? null : Number(row.length_cm),
    widthCm: row.width_cm == null ? null : Number(row.width_cm),
    heightCm: row.height_cm == null ? null : Number(row.height_cm),
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
  } : null;

  ipcMain.handle('ruba:templates-db-path', () => dbPath);
  ipcMain.handle('ruba:templates-list', (_event, category = '') => {
    if (category && ['dimension', 'weight_piece', 'weight_carton', 'customer'].includes(String(category))) {
      return db.prepare('SELECT * FROM template_models WHERE category = ? ORDER BY active DESC, name COLLATE NOCASE').all(String(category)).map(present);
    }
    return db.prepare('SELECT * FROM template_models ORDER BY category, active DESC, name COLLATE NOCASE').all().map(present);
  });
  ipcMain.handle('ruba:template-save', (_event, input = {}) => {
    const template = normalize(input);
    const timestamp = now();
    db.prepare(`INSERT INTO template_models(id, category, name, length_cm, width_cm, height_cm, weight_kg, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM template_models WHERE id = ?), ?), ?)
      ON CONFLICT(id) DO UPDATE SET category=excluded.category, name=excluded.name, length_cm=excluded.length_cm,
      width_cm=excluded.width_cm, height_cm=excluded.height_cm, weight_kg=excluded.weight_kg,
      active=excluded.active, updated_at=excluded.updated_at`).run(
      template.id, template.category, template.name, template.lengthCm, template.widthCm,
      template.heightCm, template.weightKg, template.active, template.id, timestamp, timestamp
    );
    return present(db.prepare('SELECT * FROM template_models WHERE id = ?').get(template.id));
  });
  ipcMain.handle('ruba:template-delete', (_event, id) => {
    db.prepare('DELETE FROM template_models WHERE id = ?').run(String(id));
    return true;
  });
  ipcMain.handle('ruba:templates-seed', (_event, templates = []) => {
    const insert = db.prepare(`INSERT INTO template_models(id, category, name, length_cm, width_cm, height_cm, weight_kg, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET category=excluded.category, name=excluded.name, length_cm=excluded.length_cm,
      width_cm=excluded.width_cm, height_cm=excluded.height_cm, weight_kg=excluded.weight_kg, active=excluded.active, updated_at=excluded.updated_at`);
    const transaction = db.transaction((items) => items.map((item) => {
      const template = normalize(item); const timestamp = now();
      insert.run(template.id, template.category, template.name, template.lengthCm, template.widthCm, template.heightCm, template.weightKg, template.active, timestamp, timestamp);
      return template.id;
    }));
    transaction(Array.isArray(templates) ? templates : []);
    return db.prepare('SELECT * FROM template_models ORDER BY category, name COLLATE NOCASE').all().map(present);
  });
  ipcMain.handle('ruba:templates-open-folder', async () => {
    const folder = path.dirname(dbPath);
    await fsPromises.mkdir(folder, { recursive: true });
    return folder;
  });
  return db;
}

module.exports = { registerTemplatesDatabaseIpc };
