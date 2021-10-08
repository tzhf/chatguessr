const path = require("path");
const { BrowserWindow, shell } = require("electron");

const defaultProps = {
	width: 600,
	height: 520,
	show: false,
	frame: false,
	resizable: false,
	maximizable: false,
	transparent: true,
	webPreferences: {
		devTools: false,
		nodeIntegration: true,
		contextIsolation: false,
	},
};

class SettingsWindow extends BrowserWindow {
	constructor() {
		super({ ...defaultProps });
		this.setMenuBarVisibility(false);
		this.loadURL(path.join(__dirname, "settings.html"));

		this.webContents.on("new-window", (e, link) => {
			e.preventDefault();
			shell.openExternal(link);
		});
	}
}

module.exports = SettingsWindow;
