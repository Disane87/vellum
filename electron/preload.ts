import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizedChange: (callback: (maximized: boolean) => void) => {
    ipcRenderer.on('window:maximized-changed', (_event: any, maximized: boolean) => callback(maximized));
  },
  openDevTools: () => ipcRenderer.send('window:devtools'),

  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),
  backendPort: ipcRenderer.sendSync('app:backend-port') as number,
  platform: process.platform,

  // Update
  checkForUpdate: () => ipcRenderer.invoke('app:check-update'),
  openRelease: (url: string) => ipcRenderer.send('app:open-release', url),
  onUpdateAvailable: (callback: (update: any) => void) => {
    ipcRenderer.on('app:update-available', (_event: any, update: any) => callback(update));
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('app:get-settings'),
  saveSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('app:save-settings', settings),

  // Notifications
  notify: (data: { title: string; body: string; accountId?: string; mailbox?: string }) => {
    ipcRenderer.send('app:notify', data);
  },
  setUnreadCount: (count: number) => ipcRenderer.send('app:set-unread-count', count),

  // Events from main process
  onComposeNew: (callback: () => void) => {
    ipcRenderer.on('app:compose-new', () => callback());
  },
  onNavigateToMailbox: (callback: (data: { accountId: string; mailbox: string }) => void) => {
    ipcRenderer.on('app:navigate-to-mailbox', (_event: any, data: any) => callback(data));
  },
});
