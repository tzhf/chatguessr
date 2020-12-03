const path = require("path");
const { BrowserWindow, shell } = require("electron");

const defaultProps = {
	show: false,
	frame: false,
	width: 550,
	height: 450,
	resizable: false,
	maximizable: false,
	transparent: true,
	webPreferences: {
		devTools: false,
		nodeIntegration: true,
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
