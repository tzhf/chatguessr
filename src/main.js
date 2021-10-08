const { app, BrowserWindow, globalShortcut, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");

const GameHandler = require("./GameHandler");

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const port = process.env.SERVER_PORT;

const express = require("express");
const cors = require("cors");
const server = express();
server.use(cors());

// const MainWindow = require("./Windows/MainWindow");
// const SettingsWindow = require("./Windows/settings/SettingsWindow");

const startServer = () => {
	server.use("/", express.static(__dirname + "/public"));
	server
		.listen(port, () => {
			createWindows();
		})
		.on("error", (e) => console.log(e));
};

let mainWindow;
let settingsWindow;

const createWindows = () => {
	// Main Window
	mainWindow = new BrowserWindow({
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "./preload.js"),
			enableRemoteModule: true,
			contextIsolation: false,
			// devTools: false,
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
		autoUpdater.checkForUpdatesAndNotify();
	});

	mainWindow.on("closed", () => {
		mainWindow = null;
	});

	mainWindow.webContents.openDevTools();

	// Settings window
	settingsWindow = new BrowserWindow({
		width: 600,
		height: 520,
		show: false,
		frame: false,
		resizable: false,
		maximizable: false,
		transparent: true,
		webPreferences: {
			devTools: false,
			nodeIntegration: true,
			contextIsolation: false,
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

autoUpdater.on("update-available", () => {
	const updateWindow = new BrowserWindow({ width: 600, height: 520 });
	updateWindow.setParentWindow(mainWindow);

	// mainWindow.webContents.send("update_available");
});
autoUpdater.on("update-downloaded", () => {
	mainWindow.webContents.send("update_downloaded");
});

ipcMain.on("app_version", (event) => {
	event.sender.send("app_version", { version: app.getVersion() });
});

ipcMain.on("restart_app", () => {
	autoUpdater.quitAndInstall();
});
