'use strict';

// Parcel prevents us from `require`ing things in a "standard" script
// and ONLY wants to output ES modules in a module. We must use `require`
// for electron reasons. This hack prevents Parcel from seeing what we're
// doing.
/** @type {typeof require} */
// @ts-ignore
const secretRequire = (0, eval('require'));
const { ipcRenderer } = secretRequire("electron");

/** @type {HTMLInputElement} */
const channelName = document.querySelector('#channelName')
/** @type {HTMLInputElement} */
const botUsername = document.querySelector('#botUsername')
/** @type {HTMLInputElement} */
const twitchToken = document.querySelector('#twitchToken')
/** @type {HTMLInputElement} */
const cgCmd = document.querySelector('#cgCmd')
/** @type {HTMLInputElement} */
const cgMsg = document.querySelector('#cgMsg')
/** @type {HTMLInputElement} */
const userGetStatsCmd = document.querySelector('#userGetStatsCmd')
/** @type {HTMLInputElement} */
const userClearStatsCmd = document.querySelector('#userClearStatsCmd')
/** @type {HTMLInputElement} */
const setStreakCmd = document.querySelector('#setStreakCmd')
/** @type {HTMLInputElement} */
const showHasGuessed = document.querySelector('#showHasGuessed')
/** @type {HTMLInputElement} */
const isMultiGuess = document.querySelector('#isMultiGuess')
/** @type {HTMLInputElement} */
const noCar = document.querySelector('#noCar')
/** @type {HTMLInputElement} */
const noCompass = document.querySelector('#noCompass')
/** @type {HTMLInputElement} */
const cgLink = document.querySelector('#cgLink')
/** @type {HTMLElement} */
const cgLinkContainer = document.querySelector('#cgLinkContainer')
/** @type {HTMLButtonElement} */
const copyLinkBtn = document.querySelector('#copyLinkBtn')
/** @type {HTMLElement} */
const twitchStatusElement = document.querySelector('#twitchStatus')
/** @type {HTMLButtonElement} */
const clearStatsBtn = document.querySelector('#clearStatsBtn')

ipcRenderer.on("render-settings", (e, settings, twitchStatus) => {
	channelName.value = settings.channelName;
	botUsername.value = settings.botUsername;
	twitchToken.value = settings.token;
	cgCmd.value = settings.cgCmd;
	cgMsg.value = settings.cgMsg;
	userGetStatsCmd.value = settings.userGetStatsCmd;
	userClearStatsCmd.value = settings.userClearStatsCmd;
	setStreakCmd.value = settings.setStreakCmd;
	showHasGuessed.checked = settings.showHasGuessed;
	isMultiGuess.checked = settings.isMultiGuess;
	noCar.checked = settings.noCar;
	noCompass.checked = settings.noCompass;

	if (twitchStatus == "OPEN") {
		twitchConnected(settings.botUsername);
	} else {
		twitchDisconnected();
	}
});

ipcRenderer.on("twitch-connected", (e, botUsername) => {
	twitchConnected(botUsername);
});

ipcRenderer.on("twitch-disconnected", () => {
	twitchDisconnected();
});

ipcRenderer.on("twitch-error", (e, error) => {
	twitchStatusElement.textContent = error;
	twitchStatusElement.style.color = "#ed2453";
});

const twitchConnected = (botUsername) => {
	const linkStr = `chatguessr.com/map/${botUsername}`;
	cgLink.value = linkStr;

	copyLinkBtn.addEventListener("click", () => {
		navigator.clipboard.writeText(linkStr);
		copyLinkBtn.textContent = "Copied";
		setTimeout(() => {
			copyLinkBtn.textContent = "Copy";
		}, 1000);
	});

	cgLinkContainer.style.display = "block";
	twitchStatusElement.textContent = "Connected";
	twitchStatusElement.style.color = "#3fe077";
};

const twitchDisconnected = () => {
	cgLinkContainer.style.display = "none";
	twitchStatusElement.textContent = "Disconnected";
	twitchStatusElement.style.color = "#ed2453";
};

function gameSettingsForm() {
	ipcRenderer.send("game-form", isMultiGuess.checked, noCar.checked, noCompass.checked);
}

function twitchCommandsForm() {
	ipcRenderer.send("twitch-commands-form", {
		cgCmdd: cgCmd.value,
		cgMsgg: cgMsg.value,
		userGetStats: userGetStatsCmd.value,
		userClearStats: userClearStatsCmd.value,
		setStreak: setStreakCmd.value,
		showHasGuessed: showHasGuessed.checked,
	});
}

function twitchSettingsForm(e) {
	e.preventDefault();
	ipcRenderer.send("twitch-settings-form", channelName.value, botUsername.value, twitchToken.value);
}

function clearStats() {
	clearStatsBtn.value = "Are you sure ?";
	clearStatsBtn.setAttribute("onclick", "clearStatsConfirm()");
}

function clearStatsConfirm() {
	clearStatsBtn.value = "Clear all stats";
	clearStatsBtn.setAttribute("onclick", "clearStats()");
	ipcRenderer.send("clearStats");
}

function closeWindow() {
	ipcRenderer.send("closeSettings");
}

function openTab(e, tab) {
	for (const el of document.querySelectorAll(".tabcontent")) {
		el.style.display = "none";
	}
	for (const el of document.querySelectorAll(".tablinks")) {
		el.classList.remove('active');
	}
	document.getElementById(tab).style.display = "block";
	e.currentTarget.classList.add('active');
}

document.querySelector("#defaultOpen").click();
