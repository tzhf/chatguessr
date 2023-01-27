"use strict";

const path = require("path");
const fs = require("fs");
const { BrowserWindow, shell } = require("electron");
/** @type {string} */
// @ts-ignore
const styles = require("bundle-text:../../assets/styles.css");
const js = fs.readFileSync(path.join(__dirname, "../../dist/cg-renderer/renderer.js"), "utf8");

function mainWindow() {
	let win = new BrowserWindow({
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "../../dist/cg-preload/preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false, // TODO enable
			webSecurity: false,
			devTools: process.env.NODE_ENV === "development",
		},
	});

	if (process.env.NODE_ENV === "development") win.webContents.openDevTools();
	win.setMenuBarVisibility(false);

	win.webContents.on("dom-ready", async () => {
		await win.webContents.insertCSS(styles);
		await win.webContents.executeJavaScript(js);
	});

	win.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: "deny" };
	});

	win.loadURL("https://www.geoguessr.com/maps");

	return win;
}

module.exports = mainWindow();
