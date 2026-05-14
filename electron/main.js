const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const net = require('net');

let mainWindow;
let serverProcess;

const isDev = process.env.NODE_ENV !== 'production';
const SERVER_PORT = 3001;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e1e2e',
    frame: process.platform === 'darwin' ? true : true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：前端从 dist 加载，API 走本地 server
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 等待端口可用
function waitForPort(port, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const socket = new net.Socket();
      socket.setTimeout(500);
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error(`Server failed to start within ${timeout}ms`));
        } else {
          setTimeout(check, 200);
        }
      });
      socket.once('timeout', () => {
        socket.destroy();
        setTimeout(check, 200);
      });
      socket.connect(port, '127.0.0.1');
    };
    check();
  });
}

function startServer() {
  if (isDev) {
    // 开发模式：server 由 npm script 单独启动
    return Promise.resolve();
  }

  // 生产模式：Electron 主进程启动 server 子进程
  // 查找 tsx 可执行文件
  const serverPath = path.join(__dirname, '../server/index.ts');
  const npxPath = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  // 加载 .env 文件中的环境变量
  const envFile = path.join(__dirname, '../.env');
  const envVars = { ...process.env, PORT: String(SERVER_PORT) };
  
  try {
    const fs = require('fs');
    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, 'utf-8');
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
    }
  } catch (e) {
    console.warn('[Electron] Failed to load .env:', e.message);
  }

  console.log(`[Electron] Starting server on port ${SERVER_PORT}...`);

  serverProcess = spawn(npxPath, ['tsx', serverPath], {
    env: envVars,
    stdio: 'pipe',
    cwd: path.join(__dirname, '..'),
    shell: true,
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server] ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server] ${data.toString().trim()}`);
  });

  serverProcess.on('exit', (code) => {
    console.log(`[Server] Process exited with code ${code}`);
    if (code !== 0 && mainWindow) {
      // 如果 server 意外退出，通知用户
      mainWindow.webContents.executeJavaScript(
        `alert('Server process exited unexpectedly (code: ${code}). Please restart the app.')`
      );
    }
  });

  return waitForPort(SERVER_PORT);
}

function killServer() {
  if (serverProcess) {
    console.log('[Electron] Stopping server...');
    if (process.platform === 'win32') {
      // Windows 需要 taskkill 来终止整个进程树
      try {
        execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
      } catch (e) {
        serverProcess.kill();
      }
    } else {
      serverProcess.kill('SIGTERM');
    }
    serverProcess = null;
  }
}

// === App lifecycle ===

app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
  } catch (err) {
    console.error('[Electron] Failed to start:', err);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  killServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  killServer();
});

// === IPC handlers ===

// 允许前端获取 server 状态
ipcMain.handle('get-server-info', () => ({
  port: SERVER_PORT,
  pid: serverProcess?.pid,
  running: !!serverProcess,
}));
