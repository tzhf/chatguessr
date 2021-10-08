const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const port = process.env.SERVER_PORT;

const express = require("express");
const cors = require("cors");
const server = express();
server.use(cors());

const { app, BrowserWindow, globalShortcut } = require("electron");

const MainWindow = require("./Windows/MainWindow");
const SettingsWindow = require("./Windows/settings/SettingsWindow");
const GameHandler = require("./GameHandler");

const startServer = () => {
	server.use("/", express.static(__dirname + "/public"));
	server
		.listen(port, () => {
			initWindow();
		})
		.on("error", console.log("Cannot connect to server"));
};

const initWindow = () => {
	const win = new MainWindow();
	const settingsWindow = new SettingsWindow();
	settingsWindow.setParentWindow(win);

	const gameHandler = new GameHandler(win, settingsWindow);

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
