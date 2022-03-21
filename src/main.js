'use strict';

require('./errorReporting');

const path = require('path');
const { app, ipcMain, globalShortcut, protocol } = require("electron");
const { initRenderer } = require('electron-store');
const { autoUpdater } = require("electron-updater");
const GameHandler = require("./GameHandler").default;
const flags = require('./utils/flags');
const Database = require('./utils/Database');

/** @type {import('electron').BrowserWindow} */
let mainWindow;

if (require('electron-squirrel-startup')) {
	app.quit();
}

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

const dbPath = path.join(app.getPath('userData'), 'scores.db');
const db = new Database(dbPath);

function serveAssets() {
	const assetDir = path.join(__dirname, '../../assets');
	protocol.interceptFileProtocol('asset', (request, callback) => {
		const assetFile = path.join(assetDir, new URL(request.url).pathname);
		if (!assetFile.startsWith(assetDir)) {
			callback({ statusCode: 404, data: 'Not Found' });
		} else {
			callback({ path: assetFile });
		}
	});
}

async function serveFlags() {
	await flags.load();

	protocol.interceptFileProtocol('flag', async (request, callback) => {
		const name = request.url.replace(/^flag:/, '');
		try {
			callback(await flags.findFlagFile(name));
		} catch (err) {
			callback({ statusCode: 500, data: err.message });
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

	const gameHandler = new GameHandler(db, mainWindow);

	globalShortcut.register("CommandOrControl+R", () => false);
	globalShortcut.register("CommandOrControl+Shift+R", () => false);
	globalShortcut.register("CommandOrControl+P", () => {
		gameHandler.openSettingsWindow();
	});
	globalShortcut.register("Escape", () => {
		gameHandler.closeSettingsWindow();
	});
}

async function init() {
	initRenderer();
	await app.whenReady();

	serveAssets();
	await serveFlags();

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
