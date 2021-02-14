const { BrowserWindow, shell } = require("electron");
const path = require("path");

const defaultProps = {
	show: false,
	webPreferences: {
		preload: path.join(__dirname, "../preload.js"),
		enableRemoteModule: true,
		devTools: false,
	},
};

class MainWindow extends BrowserWindow {
	constructor() {
		super({ ...defaultProps });

		this.setMenuBarVisibility(false);
		this.loadURL("https://www.geoguessr.com");
		this.maximize();
		this.once("ready-to-show", () => this.show());

		this.webContents.on("new-window", (e, link) => {
			e.preventDefault();
			shell.openExternal(link);
		});
	}
}

module.exports = MainWindow;
