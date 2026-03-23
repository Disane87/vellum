import { app, BrowserWindow, shell, ipcMain, dialog, Notification } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as net from 'net';
import * as https from 'https';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

const BACKEND_PORT = 3000;
const isDev = !app.isPackaged;
const isMac = process.platform === 'darwin';

function findOpenPort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      server.close(() => resolve(startPort));
    });
    server.on('error', () => resolve(findOpenPort(startPort + 1)));
  });
}

async function startBackend(): Promise<void> {
  if (isDev) return; // In dev, backend runs separately

  const port = await findOpenPort(BACKEND_PORT);
  const backendPath = path.join(process.resourcesPath, 'backend', 'dist', 'main.js');

  backendProcess = spawn(process.execPath.replace('electron', 'node'), [backendPath], {
    env: { ...process.env, PORT: String(port) },
    stdio: 'pipe',
  });

  await new Promise<void>((resolve) => {
    const check = () => {
      const client = net.createConnection({ port }, () => {
        client.end();
        resolve();
      });
      client.on('error', () => setTimeout(check, 200));
    };
    check();
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Vellum',
    icon: path.join(__dirname, '..', 'icon.png'),
    frame: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 12, y: 12 } : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: isDev
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:4200');
  } else {
    mainWindow.loadFile(path.join(process.resourcesPath, 'frontend', 'browser', 'index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window control IPC handlers
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.on('window:devtools', () => mainWindow?.webContents.toggleDevTools());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);

// --- Update Check ---

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  releaseNotes: string;
}

function checkForUpdates(): Promise<UpdateInfo> {
  const currentVersion = app.getVersion();

  return new Promise((resolve, reject) => {
    const req = https.get(
      'https://api.github.com/repos/Disane87/vellum/releases/latest',
      { headers: { 'User-Agent': `Vellum/${currentVersion}` } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            if (res.statusCode === 404) {
              resolve({ hasUpdate: false, currentVersion, latestVersion: currentVersion, releaseUrl: '', releaseNotes: '' });
              return;
            }
            const release = JSON.parse(data);
            const latestVersion = (release.tag_name || '').replace(/^v/, '');
            const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
            resolve({
              hasUpdate,
              currentVersion,
              latestVersion,
              releaseUrl: release.html_url || '',
              releaseNotes: release.body || '',
            });
          } catch {
            reject(new Error('Failed to parse release info'));
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

ipcMain.handle('app:check-update', async () => {
  try {
    return await checkForUpdates();
  } catch {
    return { hasUpdate: false, currentVersion: app.getVersion(), latestVersion: app.getVersion(), releaseUrl: '', releaseNotes: '' };
  }
});

ipcMain.handle('app:version', () => app.getVersion());

ipcMain.on('app:open-release', (_event, url: string) => {
  if (url) shell.openExternal(url);
});

app.on('ready', async () => {
  await startBackend();
  createWindow();

  // Notify renderer about maximize state changes
  mainWindow?.on('maximize', () => mainWindow?.webContents.send('window:maximized-changed', true));
  mainWindow?.on('unmaximize', () => mainWindow?.webContents.send('window:maximized-changed', false));

  // Auto-check for updates after startup (non-blocking, 5s delay)
  if (!isDev) {
    setTimeout(async () => {
      try {
        const update = await checkForUpdates();
        if (update.hasUpdate) {
          mainWindow?.webContents.send('app:update-available', update);
        }
      } catch {
        // Silent fail — update check is non-critical
      }
    }, 5000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
});
