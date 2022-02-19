'use strict';

const path = require("path");
const fs = require('fs');
const { BrowserWindow, shell } = require("electron");
/** @type {string} */
// @ts-ignore
const styles = require('bundle-text:../../assets/styles.css');
const js = fs.readFileSync(path.join(__dirname, '../cg-renderer/renderer.js'), 'utf8');

function mainWindow() {
	let win = new BrowserWindow({
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "../cg-preload/preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			webSecurity: false,
			devTools: process.env.NODE_ENV === 'development',
		},
	});
	win.setMenuBarVisibility(false);

	win.loadURL("https://www.geoguessr.com/classic");

	win.webContents.on('dom-ready', async () => {
		await win.webContents.insertCSS(styles);
		await win.webContents.executeJavaScript(js);
	});
	win.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: 'deny' };
	});

	win.on("closed", () => {
		win = null;
	});

	return win;
}

module.exports = mainWindow();
