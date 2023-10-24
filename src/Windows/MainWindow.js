"use strict";

const path = require("path");
const fs = require("fs");
const { BrowserWindow, shell } = require("electron");
const styles = `
	${require("bundle-text:../../assets/styles.css")}
	${fs.readFileSync(path.join(__dirname, "../../dist/cg-renderer/renderer.css"), "utf8")}
`;
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
		if (
			url.startsWith('https://www.facebook.com') ||
			url.startsWith('https://accounts.google.com') ||
			url.startsWith('https://appleid.apple.com')
		) {
			return { action: "allow" };
		} else {
			shell.openExternal(url);
			return { action: "deny" };
		}
	})

	win.loadURL("https://www.geoguessr.com/community/maps");

	return win;
}

module.exports = mainWindow();
