"use strict";

const path = require("path");
const fs = require("fs");
const { BrowserWindow, shell } = require("electron");

/**
 * @param {string} oauthUrl
 * @param {BrowserWindow} parentWindow
 */
function createAuthWindow(oauthUrl, parentWindow) {
	let win = new BrowserWindow({
		height: 800,
		parent: parentWindow,
		show: false,
		modal: true,
		webPreferences: {
			preload: path.join(__dirname, "../auth-preload/preload.js"),
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

	win.loadURL(oauthUrl);
	if (process.env.NODE_ENV === "development") {
		win.webContents.openDevTools();
	}

	return win;
}

module.exports = createAuthWindow;
