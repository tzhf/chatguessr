const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const server = express();
const port = process.env.SERVER_PORT;
const cors = require("cors");

const { app, BrowserWindow, globalShortcut } = require("electron");

const MainWindow = require("./Windows/MainWindow");
const SettingsWindow = require("./Windows/Settings/SettingsWindow");
const GameHandler = require("./GameHandler");

const startServer = () => {
	server.use(cors());

	server.use("/", express.static(__dirname + "/public"));
	server.get("/", (req, res) => res.send("🌵"));
	server
		.listen(port, () => {
			// console.log(`Server running at http://localhost:${port}`);
			initWindow();
		})
		.on("error", console.log);
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
