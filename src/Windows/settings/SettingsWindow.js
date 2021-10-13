const path = require("path");
const { BrowserWindow, shell } = require("electron");

function settingsWindow() {
	const win = new BrowserWindow({
		width: 600,
		minWidth: 600,
		height: 500,
		minHeight: 500,
		show: false,
		frame: false,
		maximizable: false,
		transparent: true,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			devTools: false,
		},
	});
	win.setMenuBarVisibility(false);
	win.loadURL(path.join(__dirname, "./settings.html"));

	win.webContents.on("new-window", (e, link) => {
		e.preventDefault();
		shell.openExternal(link);
	});

	return win;
}

module.exports = settingsWindow();
