import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizedChange: (callback: (maximized: boolean) => void) => {
    ipcRenderer.on('window:maximized-changed', (_event, maximized) => callback(maximized));
  },
  openDevTools: () => ipcRenderer.send('window:devtools'),
  getVersion: () => ipcRenderer.invoke('app:version'),
  checkForUpdate: () => ipcRenderer.invoke('app:check-update'),
  openRelease: (url: string) => ipcRenderer.send('app:open-release', url),
  onUpdateAvailable: (callback: (update: any) => void) => {
    ipcRenderer.on('app:update-available', (_event, update) => callback(update));
  },
  platform: process.platform,
});
