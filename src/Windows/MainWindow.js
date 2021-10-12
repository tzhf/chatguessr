const path = require("path");
const { BrowserWindow, shell } = require("electron");

function mainWindow() {
	let win = new BrowserWindow({
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "../preload.js"),
			enableRemoteModule: true,
			contextIsolation: false,
			webSecurity: false,
			devTools: false,
		},
	});
	win.setMenuBarVisibility(false);
	win.loadURL("https://www.geoguessr.com/classic");

	win.webContents.on("new-window", (e, link) => {
		e.preventDefault();
		shell.openExternal(link);
	});

	win.on("closed", () => {
		win = null;
	});

	return win;
}

module.exports = mainWindow();
