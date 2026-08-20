const { app, BrowserWindow, dialog, ipcMain, shell, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { registerDatabaseIpc } = require('./database.cjs');

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
  registerDatabaseIpc({ ipcMain, app, dialog, fsPromises: fs, pathModule: path });
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'clipboard-read' || permission === 'clipboard-sanitized-write');
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
