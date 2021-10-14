const { app, BrowserWindow, ipcMain, globalShortcut, protocol } = require("electron");
const { autoUpdater } = require("electron-updater");
require('electron-store').initRenderer();

const GameHandler = require("./GameHandler");

app.whenReady().then(() => init());

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

let mainWindow;
function init() {
	protocol.interceptFileProtocol('flag', (request, callback) => {
		const name = request.url.replace(/^flag:/, '');
		callback({ path: path.join(__dirname, `../assets/flags/${name.toUpperCase()}.svg`) });
	});

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
