const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rubaDesktop', {
  getPaths: () => ipcRenderer.invoke('ruba:get-paths'),
  chooseDirectory: () => ipcRenderer.invoke('ruba:choose-directory'),
  chooseFile: (options) => ipcRenderer.invoke('ruba:choose-file', options),
  saveFile: (payload) => ipcRenderer.invoke('ruba:save-file', payload),
  readFile: (filePath) => ipcRenderer.invoke('ruba:read-file', filePath),
});
