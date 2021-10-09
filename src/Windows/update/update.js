const ipcRenderer = require("electron").ipcRenderer;

const message = document.getElementById("message");
const restartButton = document.getElementById("restart-button");

ipcRenderer.on("update_available", () => {
	ipcRenderer.removeAllListeners("update_available");
	message.innerText = "A new update is available. Downloading now...";
});

ipcRenderer.on("update_downloaded", () => {
	ipcRenderer.removeAllListeners("update_downloaded");
	message.innerText = "Update Downloaded. It will be installed on restart. Restart now?";
	restartButton.classList.remove("hidden");
});

function closeWindow() {
	ipcRenderer.send("close_update_window");
}
function restartApp() {
	ipcRenderer.send("restart_app");
}
