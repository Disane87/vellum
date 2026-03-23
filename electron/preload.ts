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
  platform: process.platform,
});
