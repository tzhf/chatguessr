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
			devTools: process.env.NODE_ENV === 'development',
		},
	});
	win.setMenuBarVisibility(false);
	win.loadURL(path.join(__dirname, "../../dist/settings/settings.html"));

	win.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url);
		return { action: 'deny' };
	});

	return win;
}

module.exports = settingsWindow();
