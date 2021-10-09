const ipcRenderer = require("electron").ipcRenderer;

const message = document.getElementById("message");
const restartButton = document.getElementById("restart-button");

ipcRenderer.on("update_available", () => {
	ipcRenderer.removeAllListeners("update_available");
	message.innerHTML = `
		A new update is available.<br>
		Download will start in few seconds<span class="one">.</span><span class="two">.</span><span class="three">.</span>
	`;
});

ipcRenderer.on("download_progress", () => {
	ipcRenderer.removeAllListeners("download_progress");
	message.innerHTML = `Download in progress<span class="one">.</span><span class="two">.</span><span class="three">.</span>`;
});

ipcRenderer.on("update_downloaded", () => {
	ipcRenderer.removeAllListeners("update_downloaded");
	message.innerHTML = `
		Update downloaded successfully. It will be installed on restart.<br>
		Restart now ?
	`;
	restartButton.classList.remove("hidden");
});

ipcRenderer.on("update_error", (err) => {
	console.log("🚀 ~ autoUpdater.on ~ update_error", err);
	ipcRenderer.removeAllListeners("update_error");
	message.innerHTML = "An error occured.";
});

function closeWindow() {
	ipcRenderer.send("close_update_window");
}
function restartApp() {
	ipcRenderer.send("restart_app");
}
