import { app, BrowserWindow, shell, ipcMain, Notification, Tray, Menu, nativeImage } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as net from 'net';
import * as https from 'https';
import * as fs from 'fs';

// --- Logging ---
const logFile = path.join(process.env.APPDATA || process.env.HOME || '.', 'vellum-debug.log');
function log(msg: string): void {
  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch { /* ignore */ }
}

// --- Settings persistence ---
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

interface AppSettings {
  minimizeToTray: boolean;
  launchOnStartup: boolean;
  notificationsEnabled: boolean;
  startMinimized: boolean;
}

const defaultSettings: AppSettings = {
  minimizeToTray: true,
  launchOnStartup: false,
  notificationsEnabled: true,
  startMinimized: false,
};

function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(settingsPath)) {
      return { ...defaultSettings, ...JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) };
    }
  } catch { /* ignore corrupt file */ }
  return { ...defaultSettings };
}

function saveSettings(settings: AppSettings): void {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch { /* ignore */ }
}

let settings = loadSettings();

// --- App state ---
let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let tray: Tray | null = null;
let backendPort = 3000;
let isQuitting = false;
let unreadCount = 0;

const BACKEND_PORT = 3000;
const isDev = !app.isPackaged;
const isMac = process.platform === 'darwin';

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// --- Port finder ---
function findOpenPort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      server.close(() => resolve(startPort));
    });
    server.on('error', () => resolve(findOpenPort(startPort + 1)));
  });
}

// --- Backend process ---
async function startBackend(): Promise<void> {
  if (isDev) return;

  backendPort = await findOpenPort(BACKEND_PORT);
  const port = backendPort;
  const backendPath = path.join(process.resourcesPath, 'backend', 'dist', 'bundle.js');

  log(`Starting backend: ${backendPath} (exists: ${fs.existsSync(backendPath)})`);

  // Store data in %APPDATA%/Vellum so it persists across updates/reinstalls
  const dataDir = path.join(app.getPath('userData'), 'data');

  backendProcess = spawn(process.execPath, [backendPath], {
    env: { ...process.env, PORT: String(port), ELECTRON_RUN_AS_NODE: '1', DATA_DIR: dataDir },
    stdio: 'pipe',
  });

  backendProcess.stderr?.on('data', (data) => log(`Backend stderr: ${data.toString()}`));
  backendProcess.on('exit', (code) => log(`Backend exited with code ${code}`));

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      log('Backend failed to start within 15s, continuing without it');
      resolve();
    }, 15000);

    const check = () => {
      const client = net.createConnection({ port }, () => {
        client.end();
        clearTimeout(timeout);
        resolve();
      });
      client.on('error', () => setTimeout(check, 200));
    };
    check();
  });
}

// --- Tray ---
function getIconPath(): string {
  return path.join(__dirname, '..', 'icon.png');
}

function createTray(): void {
  const icon = nativeImage.createFromPath(getIconPath()).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Vellum');
  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });

  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function updateTrayMenu(): void {
  if (!tray) return;

  const badge = unreadCount > 0 ? ` (${unreadCount})` : '';
  tray.setToolTip(`Vellum${badge}`);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Vellum öffnen${badge}`,
      click: () => { mainWindow?.show(); mainWindow?.focus(); },
    },
    { type: 'separator' },
    {
      label: 'Neue E-Mail',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.webContents.send('app:compose-new');
      },
    },
    { type: 'separator' },
    {
      label: 'Beenden',
      click: () => { isQuitting = true; app.quit(); },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// --- Window ---
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Vellum',
    icon: getIconPath(),
    frame: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 12, y: 12 } : undefined,
    show: !(settings.startMinimized && settings.minimizeToTray),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
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

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting && settings.minimizeToTray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- Autostart ---
function updateAutostart(): void {
  app.setLoginItemSettings({
    openAtLogin: settings.launchOnStartup,
    args: settings.startMinimized ? ['--start-minimized'] : [],
  });
}

// --- IPC Handlers ---

// Window controls
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

// Settings
ipcMain.handle('app:get-settings', () => settings);
ipcMain.handle('app:save-settings', (_event, newSettings: Partial<AppSettings>) => {
  settings = { ...settings, ...newSettings };
  saveSettings(settings);
  updateAutostart();
  updateTrayMenu();
  return settings;
});

// Notifications
ipcMain.on('app:notify', (_event, data: { title: string; body: string; accountId?: string; mailbox?: string }) => {
  if (!settings.notificationsEnabled) return;

  const notification = new Notification({
    title: data.title,
    body: data.body,
    icon: getIconPath(),
  });

  notification.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
    if (data.accountId && data.mailbox) {
      mainWindow?.webContents.send('app:navigate-to-mailbox', { accountId: data.accountId, mailbox: data.mailbox });
    }
  });

  notification.show();
});

// Unread badge
ipcMain.on('app:set-unread-count', (_event, count: number) => {
  unreadCount = count;
  updateTrayMenu();
  // Windows: flash taskbar when new mail arrives
  if (count > 0 && mainWindow && !mainWindow.isFocused()) {
    mainWindow.flashFrame(true);
  }
});

// Update check
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
ipcMain.on('app:backend-port', (event) => { event.returnValue = backendPort; });

ipcMain.on('app:open-release', (_event, url: string) => {
  if (url) shell.openExternal(url);
});

// --- App lifecycle ---

app.on('second-instance', () => {
  if (mainWindow) {
    mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('ready', async () => {
  // Handle --start-minimized flag
  if (process.argv.includes('--start-minimized')) {
    settings.startMinimized = true;
  }

  await startBackend();
  createTray();
  createWindow();

  // Notify renderer about maximize state changes
  mainWindow?.on('maximize', () => mainWindow?.webContents.send('window:maximized-changed', true));
  mainWindow?.on('unmaximize', () => mainWindow?.webContents.send('window:maximized-changed', false));

  // Stop taskbar flash when window gets focus
  mainWindow?.on('focus', () => mainWindow?.flashFrame(false));

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
  // Don't quit when all windows close if minimize to tray is enabled
  if (!settings.minimizeToTray) {
    if (!isMac) app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  tray?.destroy();
});
