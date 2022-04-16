"use strict";

const path = require("path");
const { BrowserWindow, shell } = require("electron");

/**
 * @param {string} initialUrl
 * @param {BrowserWindow} parentWindow
 * @param {{ clearStorageData: boolean }} options
 */
async function createAuthWindow(initialUrl, parentWindow, options) {
	let win = new BrowserWindow({
		height: 800,
		parent: parentWindow,
		show: false,
		modal: true,
		webPreferences: {
			preload: path.join(__dirname, "../auth-preload/preload.js"),
			// Use a separate browser session so we can force log people out of
			// Twitch without logging them out of GeoGuessr.
			partition: "persist:backendAuth",
			contextIsolation: true,
			nodeIntegration: false,
			devTools: process.env.NODE_ENV === "development",
		},
	});
	win.setMenuBarVisibility(false);

	win.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: "deny" };
	});

	win.webContents.on("did-navigate", (_event, url) => {
		// If we can go through the auth process without user interaction, we would end up at /streamer/redirect.
		// We don't need to show the window at all then.
		const isTwitchHeadlessUrl = url.startsWith("https://id.twitch.tv/oauth2/authorize?client_id");
		const isSuccessfulRedirectUrl = url.includes("streamer/redirect#access_token");
		if (!isTwitchHeadlessUrl && !isSuccessfulRedirectUrl) {
			win.show();
		}
	});

	if (options.clearStorageData) {
		await win.webContents.session.clearStorageData();
	}

	win.loadURL(initialUrl);
	if (process.env.NODE_ENV === "development") {
		win.webContents.openDevTools();
	}

	return win;
}

createAuthWindow.MIGRATE_URL = `file://${path.join(__dirname, "../../dist/auth/migrate.html")}`;
createAuthWindow.NEW_URL = `file://${path.join(__dirname, "../../dist/auth/new.html")}`;

module.exports = createAuthWindow;
