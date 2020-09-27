const ipcRenderer = require("electron").ipcRenderer;

const elements = [
	channelName,
	botUsername,
	token,
	twitchStatus,
	guessCmd,
	userGetStatsCmd,
	userClearStatsCmd,
	clearAllStatsCmd,
	setStreakCmd,
	showHasGuessed,
	isMultiGuess,
	noCar,
	noCompass,
	clearStatsBtn,
];
elements.forEach((element) => {
	element = document.getElementById(element);
});

ipcRenderer.on("render-settings", (e, settings) => {
	channelName.value = settings.channelName;
	botUsername.value = settings.botUsername;
	token.value = settings.token;
	guessCmd.value = settings.guessCmd;
	userGetStatsCmd.value = settings.userGetStatsCmd;
	userClearStatsCmd.value = settings.userClearStatsCmd;
	clearAllStatsCmd.value = settings.clearAllStatsCmd;
	setStreakCmd.value = settings.setStreakCmd;
	showHasGuessed.checked = settings.showHasGuessed;
	isMultiGuess.checked = settings.isMultiGuess;
	noCar.checked = settings.noCar;
	noCompass.checked = settings.noCompass;
});

ipcRenderer.on("twitch-connected", () => {
	console.log("llo");
	twitchStatus.textContent = "Connected";
	twitchStatus.style.color = "#3fe077";
});

ipcRenderer.on("twitch-disconnected", () => {
	twitchStatus.textContent = "Disconnected";
	twitchStatus.style.color = "#ed2453";
});

ipcRenderer.on("twitch-error", (e, error) => {
	twitchStatus.textContent = error;
});

const gameSettingsForm = () => {
	ipcRenderer.send("game-form", isMultiGuess.checked, noCar.checked, noCompass.checked);
};

const twitchCommandsForm = () => {
	ipcRenderer.send(
		"twitch-commands-form",
		guessCmd.value,
		userGetStatsCmd.value,
		userClearStatsCmd.value,
		clearAllStatsCmd.value,
		setStreakCmd.value,
		showHasGuessed.checked
	);
};

const twitchSettingsForm = (e) => {
	e.preventDefault();
	ipcRenderer.send("twitch-settings-form", channelName.value, botUsername.value, token.value);
};

const clearStats = () => {
	clearStatsBtn.value = "Are you sure ?";
	clearStatsBtn.setAttribute("onclick", "clearStatsConfirm()");
};

const clearStatsConfirm = () => {
	clearStatsBtn.value = "Clear all stats";
	clearStatsBtn.setAttribute("onclick", "clearStats()");
	ipcRenderer.send("clearStats");
};

const openTab = (evt, tab) => {
	let tabcontent = document.getElementsByClassName("tabcontent");
	for (let i = 0; i < tabcontent.length; i++) {
		tabcontent[i].style.display = "none";
	}
	let tablinks = document.getElementsByClassName("tablinks");
	for (let i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "");
	}
	document.getElementById(tab).style.display = "block";
	evt.currentTarget.className += " active";
};
document.getElementById("defaultOpen").click();
