'use strict';

require('./errorReporting');

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
	const sharedStore = require('./utils/sharedStore');
	const { noCar } = Settings.read();
	rendererApi.drParseNoCar(noCar);

	const markerRemover = document.createElement("style");
	markerRemover.textContent = ".map-pin { display: none; }";

	const iconsColumn = document.createElement("div");
	iconsColumn.classList.add("iconsColumn");
	document.body.append(iconsColumn);

	const settingsIcon = document.createElement("div");
	settingsIcon.setAttribute("title", "Settings (ctrl+p)");
	settingsIcon.id = "settingsIcon";
	settingsIcon.innerHTML = "<span>⚙️</span>";
	settingsIcon.addEventListener("click", () => {
		ipcRenderer.send("openSettings");
	});
	iconsColumn.append(settingsIcon);

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

	/** @type {LatLng|undefined} */
	let currentLocation;
	const satelliteSwitchIcon = document.createElement("div");
	satelliteSwitchIcon.setAttribute("title", "Switch to Satellite View");
	satelliteSwitchIcon.id = "satelliteSwitchIcon";
	satelliteSwitchIcon.innerHTML = "<span>🏡</span>";
	satelliteSwitchIcon.addEventListener("click", () => {
		const isSatellite = !sharedStore.get('isSatellite');
		sharedStore.set('isSatellite', isSatellite);

		if (isSatellite) {
			rendererApi.showSatelliteMap(currentLocation);
			satelliteSwitchIcon.innerHTML = "<span>🛰️</span>";
			satelliteSwitchIcon.setAttribute("title", "Switch to StreetView");
			centerSatelliteViewBtn.style.display = "flex";
		} else {
			rendererApi.hideSatelliteMap();
			satelliteSwitchIcon.innerHTML = "<span>🏡</span>";
			satelliteSwitchIcon.setAttribute("title", "Switch to Satellite View");
			centerSatelliteViewBtn.style.display = "none";
		}
	});

	const centerSatelliteViewBtn = document.createElement("div");
	centerSatelliteViewBtn.setAttribute("title", "Center map to location");
	centerSatelliteViewBtn.id = "centerSatelliteViewBtn";
	centerSatelliteViewBtn.innerHTML = "<span>🏁</span>";
	centerSatelliteViewBtn.addEventListener("click", () => {
		rendererApi.centerSatelliteView();
	});

	ipcRenderer.on("game-started", (e, isMultiGuess, restoredGuesses, location) => {
		currentLocation = location;
		if (sharedStore.get('isSatellite')) {
			centerSatelliteViewBtn.style.display = "flex";
			rendererApi.showSatelliteMap(location)
		}

		iconsColumn.append(showScoreboard, satelliteSwitchIcon, centerSatelliteViewBtn);
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
		iconsColumn.append(showScoreboard, satelliteSwitchIcon, centerSatelliteViewBtn);
		scoreboard.checkVisibility();
		rendererApi.drParseNoCompass(noCompass);
	});

	ipcRenderer.on("game-quitted", () => {
		markerRemover.remove();
		scoreboard.hide();
		rendererApi.clearMarkers();

		// Hide in-game-only buttons
		document.querySelector("#showScoreboard")?.remove();
		document.querySelector("#satelliteSwitchIcon")?.remove();
		document.querySelector("#centerSatelliteViewBtn")?.remove();
	});

	ipcRenderer.on("render-guess", (e, guess) => {
		scoreboard.renderGuess(guess);
	});

	ipcRenderer.on("render-multiguess", (e, guesses) => {
		scoreboard.renderMultiGuess(guesses);
	});

	ipcRenderer.on("pre-round-results", () => {
		document.body.append(markerRemover);
	});

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

	ipcRenderer.on("next-round", (e, isMultiGuess, location) => {
		currentLocation = location;
		scoreboard.checkVisibility();
		scoreboard.reset(isMultiGuess);
		scoreboard.showSwitch(true);
		setTimeout(() => {
			markerRemover.remove();
			rendererApi.clearMarkers();
		}, 1000);

		if (sharedStore.get('isSatellite')) {
			rendererApi.showSatelliteMap(location);
		}
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
