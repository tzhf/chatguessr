const path = require("path");
const fs = require('fs/promises');
const { app, ipcMain, globalShortcut, protocol } = require("electron");
const { initRenderer } = require('electron-store');
const { autoUpdater } = require("electron-updater");
const GameHandler = require("./GameHandler");

/** @type {import('electron').BrowserWindow} */
let mainWindow;

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

function serveAssets() {
	protocol.interceptFileProtocol('asset', (request, callback) => {
		const assetDir = path.join(__dirname, '../../assets');
		const assetFile = path.join(assetDir, new URL(request.url).pathname);
		if (!assetFile.startsWith(assetDir)) {
			callback({ statusCode: 404, data: 'Not Found' });
		} else {
			callback({ path: assetFile });
		}
	});
}

function serveFlags() {
	const appDataDir = app.getPath("appData");
	const customFlagsDir = path.join(appDataDir, "flags");
	protocol.interceptFileProtocol('flag', async (request, callback) => {
		const name = request.url.replace(/^flag:/, '');
		try {
			const buffer = await fs.readFile(path.join(customFlagsDir, name.toLowerCase() + '.png'));
			callback({ data: buffer });
		} catch {
			callback({ path: path.join(__dirname, `../../assets/flags/${name.toUpperCase()}.svg`) });
		}
	});
}

function initWindow() {
	mainWindow = require("./Windows/MainWindow");
	mainWindow.once("ready-to-show", () => {
		mainWindow.maximize();
		setTimeout(() => {
			autoUpdater.checkForUpdatesAndNotify();
		}, 2000);
	});

	const settingsWindow = require("./Windows/settings/SettingsWindow");
	settingsWindow.setParentWindow(mainWindow);

	const gameHandler = new GameHandler(mainWindow, settingsWindow);

	globalShortcut.register("CommandOrControl+R", () => false);
	globalShortcut.register("CommandOrControl+Shift+R", () => false);
	globalShortcut.register("CommandOrControl+P", () => {
		gameHandler.openSettingsWindow();
	});
	globalShortcut.register("Escape", () => {
		settingsWindow.hide();
	});
}

async function init() {
	initRenderer();
	await app.whenReady();

	serveFlags();
	serveAssets();

	initWindow();
}

// Auto Updater
let updateWindow;
autoUpdater.on("update-available", () => {
	updateWindow = require("./Windows/update/UpdateWindow");
	updateWindow.setParentWindow(mainWindow);
	// updateWindow.webContents.send("update_available");
});

autoUpdater.on("download-progress", () => {
	updateWindow.webContents.send("download_progress");
});

autoUpdater.on("update-downloaded", () => {
	updateWindow.webContents.send("update_downloaded");
});

autoUpdater.on("error", (e, err) => {
	updateWindow.webContents.send("update_error", err);
});

ipcMain.on("restart_app", () => {
	autoUpdater.quitAndInstall();
});

ipcMain.on("close_update_window", () => {
	updateWindow.hide();
});

init();
