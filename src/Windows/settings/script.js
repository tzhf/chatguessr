const ipcRenderer = require("electron").ipcRenderer;

const elements = {
	channelName,
	botUsername,
	token,
	twitchStatus,
	cgLink,
	guessCmd,
	userGetStatsCmd,
	userClearStatsCmd,
	setStreakCmd,
	showHasGuessed,
	isMultiGuess,
	noCar,
	noCompass,
	clearStatsBtn,
};
for (element in elements) {
	element = document.getElementById(element);
}

ipcRenderer.on("render-settings", (e, settings) => {
	channelName.value = settings.channelName;
	botUsername.value = settings.botUsername;
	token.value = settings.token;
	guessCmd.value = settings.guessCmd;
	userGetStatsCmd.value = settings.userGetStatsCmd;
	userClearStatsCmd.value = settings.userClearStatsCmd;
	setStreakCmd.value = settings.setStreakCmd;
	showHasGuessed.checked = settings.showHasGuessed;
	isMultiGuess.checked = settings.isMultiGuess;
	noCar.checked = settings.noCar;
	noCompass.checked = settings.noCompass;
});

ipcRenderer.on("twitch-connected", (e, botUsername) => {
	const linkStr = `https://chatguessr.com/map/?bot=${botUsername}`;
	const link = document.createElement("a");
	link.href = linkStr;
	link.innerText = linkStr;
	link.setAttribute("target", "_blank");

	cgLink.textContent = "Your cg link: ";
	cgLink.appendChild(link);
	cgLink.style.display = "block";

	twitchStatus.textContent = "Connected";
	twitchStatus.style.color = "#3fe077";
});

ipcRenderer.on("twitch-disconnected", () => {
	cgLink.style.display = "none";
	twitchStatus.textContent = "Disconnected";
	twitchStatus.style.color = "#ed2453";
});

ipcRenderer.on("twitch-error", (e, error) => {
	twitchStatus.textContent = error;
	twitchStatus.style.color = "#ed2453";
});

const gameSettingsForm = () => {
	ipcRenderer.send("game-form", isMultiGuess.checked, noCar.checked, noCompass.checked);
};

const twitchCommandsForm = () => {
	ipcRenderer.send("twitch-commands-form", {
		guess: guessCmd.value,
		userGetStats: userGetStatsCmd.value,
		userClearStats: userClearStatsCmd.value,
		setStreak: setStreakCmd.value,
		showHasGuessed: showHasGuessed.checked,
	});
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

const closeWindow = () => {
	ipcRenderer.send("closeSettings");
};

const openTab = (e, tab) => {
	const tabcontent = document.getElementsByClassName("tabcontent");
	for (let i = 0; i < tabcontent.length; i++) {
		tabcontent[i].style.display = "none";
	}
	const tablinks = document.getElementsByClassName("tablinks");
	for (let i = 0; i < tablinks.length; i++) {
		tablinks[i].className = tablinks[i].className.replace(" active", "");
	}
	document.getElementById(tab).style.display = "block";
	e.currentTarget.className += " active";
};
document.getElementById("defaultOpen").click();
