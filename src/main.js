const { app, BrowserWindow, ipcMain, globalShortcut, shell } = require("electron");
const { autoUpdater } = require("electron-updater");

const GameHandler = require("./GameHandler");

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const port = process.env.SERVER_PORT;

const express = require("express");
const cors = require("cors");
const server = express();
server.use(cors());

const startServer = () => {
	server.use("/", express.static(__dirname + "/public"));
	server.listen(port, () => createWindows()).on("error", (e) => console.log(e));
};

let mainWindow;
let settingsWindow;
let updateWindow;

const createWindows = () => {
	// Main Window
	mainWindow = new BrowserWindow({
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "./preload.js"),
			enableRemoteModule: true,
			contextIsolation: false,
			devTools: false,
		},
	});
	mainWindow.setMenuBarVisibility(false);
	mainWindow.loadURL("https://www.geoguessr.com/classic");
	mainWindow.maximize();

	mainWindow.webContents.on("new-window", (e, link) => {
		e.preventDefault();
		shell.openExternal(link);
	});

	mainWindow.once("ready-to-show", () => {
		mainWindow.show();

		const data = {
			provider: "github",
			owner: "tzhf",
			repo: "chatguessr",
			token: process.env.GITHUB_TOKEN,
			private: true,
		};
		autoUpdater.setFeedURL(data);
		autoUpdater.checkForUpdatesAndNotify();
	});

	mainWindow.on("closed", () => {
		mainWindow = null;
	});

	// Settings window
	settingsWindow = new BrowserWindow({
		width: 600,
		minWidth: 600,
		height: 500,
		minHeight: 500,
		show: false,
		frame: false,
		transparent: true,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			devTools: false,
		},
	});
	settingsWindow.setParentWindow(mainWindow);
	settingsWindow.setMenuBarVisibility(false);
	settingsWindow.loadURL(path.join(__dirname, "./Windows/settings/settings.html"));

	settingsWindow.webContents.on("new-window", (e, link) => {
		e.preventDefault();
		shell.openExternal(link);
	});

	const gameHandler = new GameHandler(mainWindow, settingsWindow);

	globalShortcut.register("CommandOrControl+R", () => false);
	globalShortcut.register("CommandOrControl+Shift+R", () => false);
	globalShortcut.register("CommandOrControl+P", () => gameHandler.openSettingsWindow());
	globalShortcut.register("Escape", () => settingsWindow.hide());
};

app.whenReady().then(startServer);

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		startServer();
	}
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// Auto Updater
autoUpdater.on("update-available", () => {
	updateWindow = new BrowserWindow({
		width: 400,
		minWidth: 400,
		height: 240,
		minHeight: 240,
		show: false,
		frame: false,
		transparent: true,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			devTools: false,
		},
	});
	updateWindow.setParentWindow(mainWindow);
	updateWindow.setMenuBarVisibility(false);
	updateWindow.loadURL(path.join(__dirname, "./Windows/update/update.html"));

	updateWindow.once("ready-to-show", () => {
		updateWindow.webContents.send("update_available");
		updateWindow.show();
		updateWindow.focus();
	});
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
