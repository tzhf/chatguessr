const path = require("path");
const { BrowserWindow } = require("electron");

function updateWindow() {
	const win = new BrowserWindow({
		width: 400,
		minWidth: 400,
		height: 240,
		minHeight: 240,
		frame: false,
		transparent: true,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			devTools: false,
		},
	});
	win.setMenuBarVisibility(false);
	win.loadURL(`file://${path.join(__dirname, "./update.html")}`);

	return win;
}

module.exports = updateWindow();
