import { app, BrowserWindow, shell } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as net from 'net';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

const BACKEND_PORT = 3000;
const isDev = !app.isPackaged;

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
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
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

app.on('ready', async () => {
  await startBackend();
  createWindow();
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
