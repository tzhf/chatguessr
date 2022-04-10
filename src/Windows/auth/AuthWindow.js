"use strict";

const path = require("path");
const fs = require("fs");
const { BrowserWindow, shell } = require("electron");

/**
 * @param {string} url
 */
function createAuthWindow(url) {
	let win = new BrowserWindow({
		show: true,
		modal: true,
		webPreferences: {
			preload: path.join(__dirname, "../auth-preload/preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			webSecurity: false,
			devTools: process.env.NODE_ENV === "development",
		},
	});
	win.setMenuBarVisibility(false);

	win.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: "deny" };
	});

	win.loadURL(url);
	if (process.env.NODE_ENV === "development") {
		win.webContents.openDevTools();
	}

	return win;
}

module.exports = createAuthWindow;
