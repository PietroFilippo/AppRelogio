import { app, BrowserWindow, ipcMain, Tray, Menu, powerSaveBlocker, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Padroniza nome do app para caminho de dados do usuario
app.setName('Clock App');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userDataPath = app.getPath('userData');
const soundsDir = path.join(userDataPath, 'sounds');
const settingsPath = path.join(userDataPath, 'settings.json');

// Garante que o diretório de sons exista
if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, { recursive: true });
}

// Carrega Configurações
let appSettings = {
    preventSuspend: false,
    autoLaunch: true,
    notificationType: 'app', // 'system', 'app', 'both'
    notificationPosition: 'bottom-right',
    minimizeToTray: true,
    showTimerInTray: false,
    notificationDuration: 30 // segundos, 0 para nunca
};

try {
    if (fs.existsSync(settingsPath)) {
        appSettings = JSON.parse(fs.readFileSync(settingsPath));
    }
} catch (e) {
    console.error('Error loading settings', e);
}

let win = null;
let tray = null;
let isQuitting = false;
let powerBlockerId = null;
let notificationWindow = null;

function getIconPath() {
    if (process.env.VITE_DEV_SERVER_URL) {
        return path.join(__dirname, '../public/icon.png');
    } else {
        // Em prod, vite copia assets publicos pra dist
        return path.join(__dirname, '../dist/icon.png');
    }
}

function createWindow() {
    const iconPath = getIconPath();
    win = new BrowserWindow({
        width: 900,
        height: 700,
        frame: false, // Barra de título customizada
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true,
        icon: iconPath,
        show: false // Mostra manualmente depois de maximizar
    });

    win.maximize();
    win.show();

    // Carrega dev/prod
    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
        // win.webContents.openDevTools(); 
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    win.on('close', (event) => {
        // Minimiza pra tray se a setting é valida e habilitada
        if (!isQuitting && appSettings.minimizeToTray) {
            // Verifica se tray existe antes de esconder
            if (tray && !tray.isDestroyed()) {
                event.preventDefault();
                win.hide();
                return false;
            }
        }
    });

    // Limpa quando a janela é fechada (se não minimizada)
    win.on('closed', () => {
        win = null;
    });
}

function createTray() {
    try {
        const iconPath = getIconPath();
        tray = new Tray(iconPath);
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Show App',
                click: () => win.show()
            },
            {
                label: 'Quit',
                click: () => {
                    isQuitting = true;
                    app.quit();
                }
            }
        ]);
        tray.setToolTip('Clock App');
        tray.setContextMenu(contextMenu);

        tray.on('double-click', () => {
            if (win) win.show();
        });
    } catch (error) {
        console.error("Failed to create tray icon:", error);
        // Desabilita minimize to tray se não conseguir criar a UI pra ele
        appSettings.minimizeToTray = false;
        if (win) {
        }
    }
}

// IPC Handlers: Settings
ipcMain.handle('get-settings', () => {
    return appSettings;
});

ipcMain.handle('save-setting', (event, key, value) => {
    appSettings[key] = value;
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(appSettings, null, 2));
    } catch (e) {
        console.error('Error saving settings:', e);
    }

    // Aplica efeitos imediatos
    if (key === 'autoLaunch') {
        // Apenas modifica auto-launch se empacotado pra evitar "zombie" dev processes
        if (app.isPackaged) {
            app.setLoginItemSettings({ openAtLogin: value });
        }
    }
});

// IPC: Power
ipcMain.handle('set-power-blocker', (event, enabled) => {
    if (enabled) {
        if (powerBlockerId === null) {
            powerBlockerId = powerSaveBlocker.start('prevent-display-sleep');
            console.log('Power Blocker Started (ID ' + powerBlockerId + ')');
        }
    } else {
        if (powerBlockerId !== null && powerSaveBlocker.isStarted(powerBlockerId)) {
            powerSaveBlocker.stop(powerBlockerId);
            console.log('Power Blocker Stopped (ID ' + powerBlockerId + ')');
            powerBlockerId = null;
        }
    }
});

// IPC: Custom Notification
ipcMain.handle('show-custom-notification', (event, data) => {
    // Se app está focado, não mostra notificação customizada
    if (win && win.isVisible() && win.isFocused()) {
        return;
    }

    // Fecha existente se houver
    if (notificationWindow && !notificationWindow.isDestroyed()) {
        notificationWindow.close();
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    const notifWidth = 350;
    const notifHeight = 160;

    let x, y;
    const position = appSettings.notificationPosition || 'bottom-right';
    const padding = 20;

    switch (position) {
        case 'top-right':
            x = width - notifWidth - padding;
            y = padding;
            break;
        case 'top-left':
            x = padding;
            y = padding;
            break;
        case 'bottom-left':
            x = padding;
            y = height - notifHeight - padding;
            break;
        case 'bottom-right':
        default:
            x = width - notifWidth - padding;
            y = height - notifHeight - padding;
            break;
    }

    notificationWindow = new BrowserWindow({
        width: notifWidth,
        height: notifHeight,
        x: x,
        y: y,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        focusable: false, // Evita roubar o foco
        webPreferences: {
            nodeIntegration: true, // Necessário para simples script em HTML sem preload
            contextIsolation: false // Simplicidade para esta janela popup interna
        }
    });

    // Monta query string
    const params = new URLSearchParams({
        title: data.title,
        message: data.body,
        snooze: data.snoozeEnabled ? 'true' : 'false',
        id: data.id || ''
    });

    notificationWindow.loadURL(`file://${path.join(__dirname, 'notification.html')}?${params.toString()}`);

    // Fecha automaticamente baseado na setting
    const duration = appSettings.notificationDuration || 30;
    if (duration > 0) {
        setTimeout(() => {
            if (notificationWindow && !notificationWindow.isDestroyed()) {
                notificationWindow.close();
            }
        }, duration * 1000);
    }

    notificationWindow.on('closed', () => {
        notificationWindow = null;
    });
});

// Fecha a notificação remotamente
ipcMain.handle('close-custom-notification', () => {
    if (notificationWindow && !notificationWindow.isDestroyed()) {
        notificationWindow.close();
    }
});

// Transmite ação de notificação de janela -> janela principal -> renderizador
ipcMain.on('notification-action', (event, data) => {
    if (win && !win.isDestroyed()) {
        win.webContents.send('notification-action', data);
    }
});

// IPC Handlers: Files
ipcMain.handle('save-file', async (event, name, buffer) => {
    const safeName = path.basename(name);
    const targetPath = path.join(soundsDir, safeName);

    fs.writeFileSync(targetPath, Buffer.from(buffer));
    return `file://${targetPath.replace(/\\/g, '/')}`;
});

ipcMain.handle('copy-sound-file', async (event, sourcePath, filename) => {
    const safeName = path.basename(filename);
    const targetPath = path.join(soundsDir, safeName);
    fs.copyFileSync(sourcePath, targetPath);
    return `file://${targetPath.replace(/\\/g, '/')}`;
});

ipcMain.handle('delete-file', async (event, filename) => {
    const safeName = path.basename(filename);
    const targetPath = path.join(soundsDir, safeName);
    try {
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
        }
    } catch (e) {
        console.error('Failed to unlink file:', e);
        return false;
    }
    return true;
});

ipcMain.handle('get-store-path', () => {
    return `file://${soundsDir.replace(/\\/g, '/')}`;
});


const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (win) {
            if (win.isMinimized()) win.restore();
            if (!win.isVisible()) win.show();
            win.focus();
        }
    });

    app.whenReady().then(() => {
        createWindow();
        createTray();

        // Auto-launch (Apenas em prod)
        if (app.isPackaged) {
            app.setLoginItemSettings({
                openAtLogin: appSettings.autoLaunch
            });
        }

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            } else {
                if (win) win.show();
            }
        });
    });
}

// IPC: Exit App
ipcMain.handle('exit-app', () => {
    isQuitting = true;
    app.quit();
});

// Controles da janela
ipcMain.on('window-minimize', () => {
    if (win) win.minimize();
});

ipcMain.on('window-maximize', () => {
    if (win) {
        if (win.isFullScreen()) {
            win.setFullScreen(false);
            win.maximize();
        } else if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    }
});

ipcMain.on('window-close', () => {
    if (win) win.close();
});

// Manipulador de saída
app.on('before-quit', () => {
    isQuitting = true;

    // Fecha a janela de notificação se estiver aberta
    if (notificationWindow && !notificationWindow.isDestroyed()) {
        notificationWindow.close();
    }

    // Para o bloqueador de energia se estiver rodando
    if (powerBlockerId !== null && powerSaveBlocker.isStarted(powerBlockerId)) {
        powerSaveBlocker.stop(powerBlockerId);
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
