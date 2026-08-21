const { app, BrowserWindow, dialog, ipcMain, shell, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

// Les données applicatives doivent rester hors du dossier temporaire du mode portable
// et hors du dossier d’installation, qui peut être protégé par Windows.
const persistentUserDataPath = path.join(app.getPath('appData'), 'Ruba Packing List');
app.setPath('userData', persistentUserDataPath);
let registerDatabaseIpc;
let registerTemplatesDatabaseIpc;
let dbForStorage = null;
let templatesDb = null;

const isDev = !app.isPackaged;

function safeFileName(name) {
  return String(name || 'ruba-export').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 980,
    minHeight: 700,
    show: false,
    backgroundColor: '#f3faf5',
    title: 'Ruba — Packing List Pro',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev,
    },
  });

  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL(process.env.RUBA_DEV_URL || 'http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

ipcMain.handle('ruba:get-paths', () => ({
  userData: app.getPath('userData'),
  documents: app.getPath('documents'),
  downloads: app.getPath('downloads'),
  desktop: app.getPath('desktop'),
}));

ipcMain.handle('ruba:choose-directory', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('ruba:choose-file', async (_event, options = {}) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: Array.isArray(options.filters) ? options.filters : undefined,
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('ruba:save-file', async (_event, payload = {}) => {
  const buffer = Buffer.from(payload.data || '', payload.encoding || 'base64');
  const defaultPath = path.join(app.getPath('downloads'), safeFileName(payload.fileName || 'ruba-export'));
  const result = await dialog.showSaveDialog({
    defaultPath,
    filters: Array.isArray(payload.filters) ? payload.filters : undefined,
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.writeFile(result.filePath, buffer);
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('ruba:read-file', async (_event, filePath) => {
  if (!filePath || typeof filePath !== 'string') throw new Error('Chemin de fichier invalide.');
  const data = await fs.readFile(filePath);
  return { filePath, data: data.toString('base64') };
});

const getExportFolders = () => {
  const root = path.join(app.getPath('userData'), 'exports');
  return { root, pdf: path.join(root, 'PDF_Exports'), xlsx: path.join(root, 'XLSX_Exports') };
};

ipcMain.handle('ruba:export-folders', async () => {
  const folders = getExportFolders();
  await Promise.all([fs.mkdir(folders.pdf, { recursive: true }), fs.mkdir(folders.xlsx, { recursive: true })]);
  return folders;
});

ipcMain.handle('ruba:export-files-list', async (_event, type = 'all') => {
  const folders = getExportFolders();
  await Promise.all([fs.mkdir(folders.pdf, { recursive: true }), fs.mkdir(folders.xlsx, { recursive: true })]);
  const sources = type === 'pdf' ? [['pdf', folders.pdf]] : type === 'xlsx' ? [['xlsx', folders.xlsx]] : [['pdf', folders.pdf], ['xlsx', folders.xlsx]];
  const result = [];
  for (const [fileType, folder] of sources) {
    const names = await fs.readdir(folder);
    for (const name of names) {
      const filePath = path.join(folder, name);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) result.push({ name, type: fileType, filePath, sizeBytes: stat.size, updatedAt: stat.mtime.toISOString() });
    }
  }
  return result.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
});
ipcMain.handle('ruba:export-folder-open', async () => {
  const folders = getExportFolders();
  await Promise.all([fs.mkdir(folders.pdf, { recursive: true }), fs.mkdir(folders.xlsx, { recursive: true })]);
  return shell.openPath(folders.root);
});
ipcMain.handle('ruba:stored-file-open', async (_event, filePath) => {
  const resolved = path.resolve(String(filePath || ''));
  try { await fs.access(resolved); } catch { throw new Error('Fichier introuvable.'); }
  return shell.openPath(resolved);
});
ipcMain.handle('ruba:export-file-open', async (_event, filePath) => {
  const folders = getExportFolders();
  const resolved = path.resolve(String(filePath || ''));
  if (![folders.pdf, folders.xlsx].some(folder => resolved.startsWith(path.resolve(folder) + path.sep))) throw new Error('Chemin d’export non autorisé.');
  return shell.openPath(resolved);
});
ipcMain.handle('ruba:export-file-delete', async (_event, filePath) => {
  const folders = getExportFolders();
  const resolved = path.resolve(String(filePath || ''));
  if (![folders.pdf, folders.xlsx].some(folder => resolved.startsWith(path.resolve(folder) + path.sep))) throw new Error('Chemin d’export non autorisé.');
  await fs.rm(resolved, { force: true });
  return true;
});

ipcMain.handle('ruba:save-file-to-storage', async (_event, payload = {}) => {
  const folders = getExportFolders();
  await Promise.all([fs.mkdir(folders.pdf, { recursive: true }), fs.mkdir(folders.xlsx, { recursive: true })]);
  const targetFolder = String(payload.exportType || '').toLowerCase() === 'pdf' ? folders.pdf : folders.xlsx;
  const safeName = String(payload.fileName || 'export.xlsx').replace(/[^a-zA-Z0-9._-]+/g, '_');
  const filePath = path.join(targetFolder, safeName);
  const bytes = payload.encoding === 'base64' ? Buffer.from(String(payload.data || ''), 'base64') : Buffer.from(String(payload.data || ''), 'utf8');
  await fs.writeFile(filePath, bytes);
  return { canceled: false, filePath };
});

ipcMain.handle('ruba:save-window-pdf', async (event, payload = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) throw new Error('Fenêtre Ruba introuvable.');
  const folders = getExportFolders();
  await fs.mkdir(folders.pdf, { recursive: true });
  const safeName = String(payload.fileName || 'packing-list.pdf').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/\.pdf$/i, '') + '.pdf';
  const filePath = path.join(folders.pdf, safeName);
  const pdf = await win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, landscape: true, marginsType: 0 });
  await fs.writeFile(filePath, pdf);
  return { canceled: false, filePath };
});

ipcMain.handle('ruba:capture-window-data', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { canceled: true };
  const image = await win.webContents.capturePage();
  return { canceled: false, data: image.toDataURL() };
});

ipcMain.handle('ruba:capture-window', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { canceled: true };
  const image = await win.webContents.capturePage();
  const result = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath('pictures'), `ruba-capture-${new Date().toISOString().replace(/[:.]/g, '-')}.png`),
    filters: [{ name: 'Image PNG', extensions: ['png'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.writeFile(result.filePath, image.toPNG());
  return { canceled: false, filePath: result.filePath };
});

app.whenReady().then(() => {
  try {
    registerDatabaseIpc = require('./database.cjs').registerDatabaseIpc;
    dbForStorage = registerDatabaseIpc({ ipcMain, app, dialog, fsPromises: fs, pathModule: path });
    registerTemplatesDatabaseIpc = require('./templates-database.cjs').registerTemplatesDatabaseIpc;
    templatesDb = registerTemplatesDatabaseIpc({ ipcMain, app, fsPromises: fs });
  } catch (error) {
    console.error('SQLite initialization failed; continuing without database:', error);
    try {
      registerTemplatesDatabaseIpc = require('./templates-database.cjs').registerTemplatesDatabaseIpc;
      templatesDb = registerTemplatesDatabaseIpc({ ipcMain, app, fsPromises: fs });
    } catch (templateError) {
      console.error('Template SQLite initialization failed:', templateError);
    }
  }
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'clipboard-read' || permission === 'clipboard-sanitized-write');
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
