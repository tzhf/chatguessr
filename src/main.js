"use strict";

require("./errorReporting");

if (process.platform == "win32") require("update-electron-app")();

const path = require("path");
const { app, BrowserWindow, globalShortcut, protocol } = require("electron");
const { initRenderer } = require("electron-store");
const GameHandler = require("./GameHandler").default;
const flags = require("./utils/flags");
const Database = require("./utils/Database");

// /** @type {import('electron').BrowserWindow} */
// let mainWindow;

if (require("electron-squirrel-startup")) {
	app.quit();
}

const dbPath = path.join(app.getPath("userData"), "scores.db");
const db = new Database(dbPath);

function serveAssets() {
	const assetDir = path.join(__dirname, "../../assets");
	protocol.interceptFileProtocol("asset", (request, callback) => {
		const assetFile = path.join(assetDir, new URL(request.url).pathname);
		if (!assetFile.startsWith(assetDir)) {
			callback({ statusCode: 404, data: "Not Found" });
		} else {
			callback({ path: assetFile });
		}
	});
}

async function serveFlags() {
	await flags.load();

	protocol.interceptFileProtocol("flag", async (request, callback) => {
		const name = request.url.replace(/^flag:/, "");
		try {
			callback(await flags.findFlagFile(name));
		} catch (err) {
			callback({ statusCode: 500, data: err.message });
		}
	});
}

function createWindow() {
	/** @type {import('electron').BrowserWindow} */
	const mainWindow = require("./Windows/MainWindow");

	mainWindow.once("ready-to-show", () => {
		mainWindow.maximize();
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

function init() {
	initRenderer();

	app.whenReady().then(async () => {
		serveAssets();
		await serveFlags();

		createWindow();

		app.on("activate", () => {
			// On OS X it's common to re-create a window in the app when the
			// dock icon is clicked and there are no other windows open.
			if (BrowserWindow.getAllWindows().length === 0) {
				createWindow();
			}
		});
	});
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

init();
