"use strict";

// Parcel prevents us from `require`ing things in a "standard" script
// and ONLY wants to output ES modules in a module. We must use `require`
// for electron reasons. This hack prevents Parcel from seeing what we're
// doing.
/** @type {typeof require} */
// @ts-ignore
const secretRequire = (0, eval("require"));
const { ipcRenderer } = secretRequire("electron");
const { version } = secretRequire("../../package.json"); // path relative to dist/settings

/** @type {HTMLInputElement} */
const channelName = qs("#channelName");
/** @type {HTMLInputElement} */
const botUsernameEl = qs("#botUsername");
/** @type {HTMLInputElement} */
const twitchReauthEl = qs("#twitchReauth");
/** @type {HTMLInputElement} */
const cgCmd = qs("#cgCmd");
/** @type {HTMLInputElement} */
const cgMsg = qs("#cgMsg");
/** @type {HTMLInputElement} */
const userGetStatsCmd = qs("#userGetStatsCmd");
/** @type {HTMLInputElement} */
const userClearStatsCmd = qs("#userClearStatsCmd");
/** @type {HTMLInputElement} */
const showHasGuessed = qs("#showHasGuessed");
/** @type {HTMLInputElement} */
const isMultiGuess = qs("#isMultiGuess");
/** @type {HTMLInputElement} */
const cgLink = qs("#cgLink");
/** @type {HTMLElement} */
const cgLinkContainer = qs("#cgLinkContainer");
/** @type {HTMLButtonElement} */
const copyLinkBtn = qs("#copyLinkBtn");
/** @type {HTMLElement} */
const twitchStatusElement = qs("#twitchStatus");
/** @type {HTMLElement} */
const socketStatusElement = qs("#socketStatus");
/** @type {HTMLButtonElement} */
const clearStatsBtn = qs("#clearStatsBtn");
/** @type {HTMLInputElement} */
const banUserInput = qs("#banUserInput");
/** @type {HTMLDivElement} */
const bannedUsersList = qs("#bannedUsersList");
/** @type {HTMLElement} */
const versionText = qs("#version");

let bannedUsersArr = [];

ipcRenderer.on("render-settings", (_event, settings, bannedUsers, connectionState, socketStatus) => {
	channelName.value = settings.channelName;
	cgCmd.value = settings.cgCmd;
	cgMsg.value = settings.cgMsg;
	userGetStatsCmd.value = settings.userGetStatsCmd;
	userClearStatsCmd.value = settings.userClearStatsCmd;
	showHasGuessed.checked = settings.showHasGuessed;
	isMultiGuess.checked = settings.isMultiGuess;

	bannedUsersArr = [...bannedUsers];
	let newChilds = [];
	bannedUsersArr.map((user) => {
		const userBadge = createBadge(user.username);
		newChilds.push(userBadge);
	});
	bannedUsersList.replaceChildren(...newChilds);

	handleConnectionState(connectionState);

	if (socketStatus) {
		socketConnected();
	} else {
		socketDisconnected();
	}
});

ipcRenderer.on("connection-state", (_event, connectionState) => {
	handleConnectionState(connectionState);
});

ipcRenderer.on("twitch-error", (_event, error) => {
	twitchStatusElement.textContent = error;
	twitchStatusElement.style.color = "#ed2453";
});

ipcRenderer.on("socket-connected", () => {
	socketConnected();
});

ipcRenderer.on("socket-disconnected", () => {
	socketDisconnected();
});

const handleConnectionState = (connectionState) => {
	if (connectionState.state == "connected") {
		twitchConnected(connectionState.botUsername);
	} else {
		twitchDisconnected();
	}
};

/**
 * @param {string} botUsername
 */
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

	const connected = document.createElement("span");
	connected.textContent = "Connected";
	connected.style.color = "#3fe077";

	twitchReauthEl.textContent = "Change account";
	twitchReauthEl.classList.remove("success");
	twitchReauthEl.classList.add("danger");
	
	twitchStatusElement.replaceChildren(
		connected,
		document.createTextNode(` as ${botUsername}`),
	);
};

const twitchDisconnected = () => {
	cgLinkContainer.style.display = "none";

	const disconnected = document.createElement("span");
	disconnected.textContent = "Disconnected";
	disconnected.style.color = "#ed2453";

	twitchReauthEl.textContent = "Log in";
	twitchReauthEl.classList.add("success");
	twitchReauthEl.classList.remove("danger");

	twitchStatusElement.replaceChildren(disconnected);
};

function gameSettingsForm() {
	ipcRenderer.send("game-form", isMultiGuess.checked);
}

function twitchCommandsForm() {
	ipcRenderer.send("twitch-commands-form", {
		cgCmdd: cgCmd.value,
		cgMsgg: cgMsg.value,
		userGetStats: userGetStatsCmd.value,
		userClearStats: userClearStatsCmd.value,
		showHasGuessed: showHasGuessed.checked,
	});
}

function twitchSettingsForm(e) {
	e.preventDefault();
	ipcRenderer.send("twitch-settings-form", channelName.value);
}

const socketConnected = () => {
	socketStatusElement.textContent = "Connected";
	socketStatusElement.style.color = "#3fe077";
};

const socketDisconnected = () => {
	socketStatusElement.textContent = "Disconnected";
	socketStatusElement.style.color = "#ed2453";
};

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

function addUser(e) {
	e.preventDefault();
	const input = banUserInput.value.toLowerCase();
	if (input.trim() != "") {
		bannedUsersArr.push({ username: input });
		const userBadge = createBadge(input);
		bannedUsersList.appendChild(userBadge);
		banUserInput.value = "";
		ipcRenderer.send("add-banned-user", input);
	}
}

function removeUser(e) {
	const clickedUser = e.target;
	const itemId = clickedUser.id;
	const index = bannedUsersArr.findIndex((o) => o.username === itemId);
	if (index !== -1) {
		bannedUsersArr.splice(index, 1);
		clickedUser.parentNode.removeChild(clickedUser);
		ipcRenderer.send("delete-banned-user", itemId);
	}
}

function createBadge(username) {
	const userBadge = document.createElement("div");
	userBadge.className = "badge";
	userBadge.textContent = username;
	userBadge.id = username;
	userBadge.title = "Unban";
	userBadge.addEventListener("click", removeUser);
	return userBadge;
}

function openTab(_event, tab) {
	for (const el of document.querySelectorAll(".tabcontent")) {
		// @ts-ignore TS2339
		el.style.display = "none";
	}
	for (const el of document.querySelectorAll(".tablinks")) {
		el.classList.remove("active");
	}
	document.getElementById(tab).style.display = "block";
	e.currentTarget.classList.add("active");
}

// @ts-ignore TS2339
qs("#defaultOpen").click();
versionText.append(document.createTextNode(`ChatGuessr version ${version}`));

twitchReauthEl.addEventListener("click", () => {
	ipcRenderer.invoke("replace-session");
});

function qs(selector, parent = document) {
	return parent.querySelector(selector);
}
