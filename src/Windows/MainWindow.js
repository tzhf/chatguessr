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

	console.log('first load');
	win.loadURL("https://www.geoguessr.com/classic").then(() => {
		console.log('second load');
		// to investigate: loading it a second time seems to resolve map dragging lag issue
		win.loadURL("https://www.geoguessr.com/classic");

		win.webContents.on('dom-ready', async () => {
			console.log('dom-ready');
			await win.webContents.insertCSS(styles);
			await win.webContents.executeJavaScript(js);
		});
	});

	win.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: 'deny' };
	});

	return win;
}

module.exports = mainWindow();
