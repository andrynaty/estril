const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { registerDatabaseIpc } = require('../electron/database.cjs');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ruba-ipc-'));
const csvPath = path.join(root, 'Delivery plan.csv');
fs.writeFileSync(csvPath, '\ufeffCUSTOMER CODE;CUSTOMER NAME;CUSTOMER PO;COLOR;PO QTY;DEST\n2654356AA;ABC Fashion;PO-7788;BLACK;50;France\n2654356AA;ABC Fashion;PO-7788;BLACK;50;France\n2654356A1;ABC Fashion;PO-7788;BLACK;35;France\n', 'utf8');

const handlers = new Map();
const ipcMain = { handle: (name, handler) => handlers.set(name, handler) };
const app = { getPath: (name) => name === 'userData' ? root : root };
const dialog = { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) };
const db = registerDatabaseIpc({ ipcMain, app, dialog, fsPromises: fs.promises, pathModule: path });

(async () => {
  const result = await handlers.get('ruba:delivery-csv-sync')();
  const plan = db.prepare('SELECT id, project_id FROM delivery_plans WHERE id = ?').get('delivery_csv_plan');
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get('delivery_csv_source');
  const rows = db.prepare('SELECT COUNT(*) AS count FROM delivery_plan_rows WHERE delivery_plan_id = ?').get('delivery_csv_plan').count;
  if (!result.found || result.error || !plan || !project || plan.project_id !== project.id || rows !== 2) {
    throw new Error(JSON.stringify({ result, plan, project, rows }));
  }
  console.log(JSON.stringify({ ok: true, found: result.found, storedRows: rows, parentPlan: Boolean(plan), parentProject: Boolean(project) }));
  db.close();
  fs.rmSync(root, { recursive: true, force: true });
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
