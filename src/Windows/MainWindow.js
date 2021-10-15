const path = require("path");
const { BrowserWindow, shell } = require("electron");
/** @type {string} */
// @ts-ignore
const styles = require('bundle-text:../../assets/styles.css');

function mainWindow() {
	let win = new BrowserWindow({
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "../cg-preload/preload.js"),
			// TODO make it work without this. currently required for the MAP hooking.
			// nodeIntegration and contextIsolation should both be off for remote URLs like geoguessr.com.
			contextIsolation: false,
			webSecurity: false,
			// devTools: false,
		},
	});
	win.setMenuBarVisibility(false);
	win.loadURL("https://www.geoguessr.com/classic");

	win.webContents.on('dom-ready', async () => {
		await this.webContents.insertCSS(styles);
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
