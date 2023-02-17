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
const twitchReauthEl = qs("#twitchReauth");
/** @type {HTMLInputElement} */
const cgCmd = qs("#cgCmd");
/** @type {HTMLInputElement} */
const cgCmdCooldown = qs("#cgCmdCooldown");
/** @type {HTMLInputElement} */
const cgMsg = qs("#cgMsg");
/** @type {HTMLInputElement} */
const flagsCmd = qs("#flagsCmd");
/** @type {HTMLInputElement} */
const flagsCmdMsg = qs("#flagsCmdMsg");
/** @type {HTMLInputElement} */
const getUserStatsCmd = qs("#getUserStatsCmd");
/** @type {HTMLInputElement} */
const getBestStatsCmd = qs("#getBestStatsCmd");
/** @type {HTMLInputElement} */
const clearUserStatsCmd = qs("#clearUserStatsCmd");
/** @type {HTMLInputElement} */
const randomPlonkCmd = qs("#randomPlonkCmd");
/** @type {HTMLInputElement} */
const showHasGuessed = qs("#showHasGuessed");
/** @type {HTMLInputElement} */
const showHasAlreadyGuessed = qs("#showHasAlreadyGuessed");
/** @type {HTMLInputElement} */
const showGuessChanged = qs("#showGuessChanged");
/** @type {HTMLInputElement} */
const showSubmittedPreviousGuess = qs("#showSubmittedPreviousGuess");
/** @type {HTMLInputElement} */
const isMultiGuess = qs("#isMultiGuess");
/** @type {HTMLInputElement} */
const guessMarkersLimit = qs("#guessMarkersLimit");
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
    cgCmdCooldown.value = settings.cgCmdCooldown;
    cgMsg.value = settings.cgMsg;
    flagsCmd.value = settings.flagsCmd;
    flagsCmdMsg.value = settings.flagsCmdMsg;
    getUserStatsCmd.value = settings.getUserStatsCmd;
    getBestStatsCmd.value = settings.getBestStatsCmd;
    clearUserStatsCmd.value = settings.clearUserStatsCmd;
    randomPlonkCmd.value = settings.randomPlonkCmd;
    showHasGuessed.checked = settings.showHasGuessed;
    showHasAlreadyGuessed.checked = settings.showHasAlreadyGuessed;
    showGuessChanged.checked = settings.showGuessChanged;
    showSubmittedPreviousGuess.checked = settings.showSubmittedPreviousGuess;
    isMultiGuess.checked = settings.isMultiGuess;
    guessMarkersLimit.value = settings.guessMarkersLimit;

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

    copyLinkBtn.addEventListener("click", (e) => {
        e.preventDefault();
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

    twitchStatusElement.replaceChildren(connected, document.createTextNode(` as ${botUsername}`));
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

function handleGuessMarkersLimit(e) {
    let newValue = parseInt(e.value);
    if (!isNaN(newValue)) {
        if (newValue < 10) newValue = 10;
        if (newValue > 1000) newValue = 1000;
        guessMarkersLimit.value = newValue.toString();
    } else {
        guessMarkersLimit.value = "100";
    }
}

function saveGlobalSettings() {
    ipcRenderer.send("save-global-settings", {
        isMultiGuess: isMultiGuess.checked,
        guessMarkersLimit: guessMarkersLimit.valueAsNumber,
        cgCmd: cgCmd.value,
        cgCmdCooldown: cgCmdCooldown.value,
        cgMsg: cgMsg.value,
        flagsCmd: flagsCmd.value,
        flagsCmdMsg: flagsCmdMsg.value,
        getUserStatsCmd: getUserStatsCmd.value,
        getBestStatsCmd: getBestStatsCmd.value,
        clearUserStatsCmd: clearUserStatsCmd.value,
        randomPlonkCmd: randomPlonkCmd.value,
        showHasGuessed: showHasGuessed.checked,
        showHasAlreadyGuessed: showHasAlreadyGuessed.checked,
        showGuessChanged: showGuessChanged.checked,
        showSubmittedPreviousGuess: showSubmittedPreviousGuess.checked,
    });
}

function saveTwitchSettings(e) {
    e.preventDefault();
    ipcRenderer.send("save-twitch-settings", channelName.value);
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
    userBadge.className = "badge danger";
    userBadge.textContent = username;
    userBadge.id = username;
    userBadge.title = "Unban";
    userBadge.addEventListener("click", removeUser);
    return userBadge;
}

function openTab(event, tab) {
    for (const el of document.querySelectorAll(".tabcontent")) {
        // @ts-ignore TS2339
        el.style.display = "none";
    }
    for (const el of document.querySelectorAll(".tablinks")) {
        el.classList.remove("active");
    }
    document.getElementById(tab).style.display = "block";
    event.currentTarget.classList.add("active");
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
