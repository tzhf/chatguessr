const path = require("path");
const { BrowserWindow, shell } = require("electron");

function mainWindow() {
	let win = new BrowserWindow({
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "../preload.js"),
			// TODO make it work without this. currently required for the MAP hooking.
			contextIsolation: false,
			webSecurity: false,
			// devTools: false,
		},
	});
	win.setMenuBarVisibility(false);
	win.loadURL("https://www.geoguessr.com/classic");

	win.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: 'allow' };
	});

	win.on("closed", () => {
		win = null;
	});

	return win;
}

module.exports = mainWindow();
