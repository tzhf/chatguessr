"use strict";

const path = require("path");
const { BrowserWindow, shell } = require("electron");

/**
 * @param {BrowserWindow} parentWindow
 */
function createSettingsWindow(parentWindow) {
    const isLinux = process.platform === "linux";

    const win = new BrowserWindow({
        title: "Chatguessr Settings",
        parent: parentWindow,
        width: 660,
        height: 720,
        minWidth: 660,
        minHeight: 720,
        show: false,
        fullscreen: false,
        maximizable: false,
        frame: isLinux ? true : false,
        transparent: isLinux ? false : true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            devTools: process.env.NODE_ENV === "development",
        },
    });
    win.setMenuBarVisibility(false);
    win.loadURL(`file://${path.join(__dirname, "../../../dist/settings/settings.html")}`);

    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: "deny" };
    });

    return win;
}

module.exports = createSettingsWindow;
