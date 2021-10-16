const { contextBridge, ipcRenderer } = require("electron");

/** @typedef {import('./types').LatLng} LatLng */
/** @typedef {import('./types').Guess} Guess */

/** @type {import("./types").ChatguessrApi} */
const chatguessrApi = {
	init,
	startNextRound() {
		ipcRenderer.send('next-round-click');
	},
};

contextBridge.exposeInMainWorld('chatguessrApi', chatguessrApi);

/**
 * @param {import('./types').RendererApi} rendererApi 
 */
function init(rendererApi) {
	const Scoreboard = require("./Classes/Scoreboard");
	const Settings = require("./utils/Settings");
	const { noCar } = Settings.read();
	rendererApi.drParseNoCar(noCar);

	const markerRemover = document.createElement("style");
	markerRemover.textContent = ".map-pin { display: none; }";

	const settingsIcon = document.createElement("div");
	settingsIcon.setAttribute("title", "Settings (ctrl+p)");
	settingsIcon.id = "settingsIcon";
	settingsIcon.innerHTML = "<span>⚙️</span>";
	settingsIcon.addEventListener("click", () => {
		ipcRenderer.send("openSettings");
	});
	document.body.append(settingsIcon);

	const scoreboardContainer = document.createElement("div");
	scoreboardContainer.setAttribute("id", "scoreboardContainer");
	document.body.append(scoreboardContainer);

	const showScoreboard = document.createElement("div");
	showScoreboard.setAttribute("title", "Show scoreboard");
	showScoreboard.id = "showScoreboard";
	showScoreboard.innerHTML = "<span>👁️‍🗨️</span>";
	showScoreboard.addEventListener("click", () => {
		scoreboard.setVisibility();
	});

	const scoreboard = new Scoreboard(scoreboardContainer, {
		onToggleGuesses(open) {
			if (open) {
				ipcRenderer.send('open-guesses');
			} else {
				ipcRenderer.send('close-guesses');
			}
		}
	});

	ipcRenderer.on("game-started", (e, isMultiGuess, restoredGuesses) => {
		document.body.append(showScoreboard);
		scoreboard.checkVisibility();
		scoreboard.reset(isMultiGuess);

		if (restoredGuesses.length > 0) {
			if (isMultiGuess) {
				scoreboard.renderMultiGuess(restoredGuesses);
			} else {
				// Not very fast KEKW
				for (const guess of restoredGuesses) {
					scoreboard.renderGuess(guess);
				}
			}
		}
	});

	ipcRenderer.on("refreshed-in-game", (e, noCompass) => {
		document.body.append(showScoreboard);
		scoreboard.checkVisibility();
		rendererApi.drParseNoCompass(noCompass);
	});

	ipcRenderer.on("game-quitted", () => {
		markerRemover.remove();
		scoreboard.hide();
		rendererApi.clearMarkers();
	});

	ipcRenderer.on("game-quitted", () => {
		scoreboard.hide();
		if ($("#showScoreboard")) $("#showScoreboard").remove();
		markerRemover.remove();
		clearMarkers();
	});

	ipcRenderer.on("render-guess", (e, guess) => {
		scoreboard.renderGuess(guess);
	});

	ipcRenderer.on("render-multiguess", (e, guesses) => {
		scoreboard.renderMultiGuess(guesses);
	});

	ipcRenderer.on("pre-round-results", () => document.body.appendChild(markerRemover));

	ipcRenderer.on("show-round-results", (e, round, location, scores) => {
		scoreboard.setTitle(`ROUND ${round} RESULTS`);
		scoreboard.displayScores(scores);
		scoreboard.showSwitch(false);
		rendererApi.populateMap(location, scores);
	});

	ipcRenderer.on("show-final-results", (e, totalScores) => {
		document.body.append(markerRemover);
		scoreboard.setTitle("HIGHSCORES");
		scoreboard.showSwitch(false);
		scoreboard.displayScores(totalScores, true);
		rendererApi.clearMarkers();
	});

	ipcRenderer.on("next-round", (e, isMultiGuess) => {
		scoreboard.checkVisibility();
		scoreboard.reset(isMultiGuess);
		scoreboard.showSwitch(true);
		setTimeout(() => {
			markerRemover.remove();
			rendererApi.clearMarkers();
		}, 1000);
	});

	ipcRenderer.on("switch-on", () => {
		scoreboard.switchOn(true);
	});
	ipcRenderer.on("switch-off", () => {
		scoreboard.switchOn(false);
	});

	ipcRenderer.on("game-settings-change", (e, noCompass) => {
		rendererApi.drParseNoCompass(noCompass);
	});
}
