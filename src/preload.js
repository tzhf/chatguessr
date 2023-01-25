"use strict";

require("./errorReporting");

const { contextBridge, ipcRenderer } = require("electron");

import { qs, createEl } from "./utils/domUtils";

/** @typedef {import('./types').LatLng} LatLng */
/** @typedef {import('./types').Guess} Guess */

/** @type {import("./types").ChatguessrApi} */
const chatguessrApi = {
	init,
	startNextRound() {
		ipcRenderer.send("next-round-click");
	},
	returnToMapPage() {
		ipcRenderer.send("return-to-map-page");
	},
};

contextBridge.exposeInMainWorld("chatguessrApi", chatguessrApi);

const REMOVE_ALL_MARKERS_CSS =
	'[data-qa="result-view-top"] [data-qa="guess-marker"], [data-qa="result-view-top"] [data-qa="correct-location-marker"], .result-map__line { display: none; }';
const REMOVE_GAME_CONTROLS_CSS = ".styles_columnTwo___2qFL, .styles_controlGroup___ArrW, .compass, .game-layout__compass { display: none !important; }";
const REMOVE_COMPASS_CSS = '.compass, .game-layout__compass, [class^="panorama-compass_"] { display: none; }';

/**
 * @param {import('./types').RendererApi} rendererApi
 */
function init(rendererApi) {
	const Scoreboard = require("./Classes/Scoreboard");
	const sharedStore = require("./utils/sharedStore");

	/** @type {Boolean} */
	const isNoCar = sharedStore.get("isNoCar", false);
	rendererApi.drParseNoCar(isNoCar);

	/** @type {Boolean} */
	const isNoCompass = sharedStore.get("isNoCompass", false);

	/** @type {Boolean} */
	const isSatellite = sharedStore.get("isSatellite", false);

	/** @type {LatLng|undefined} */
	let currentLocation;

	const markerRemover = document.createElement("style");
	markerRemover.textContent = REMOVE_ALL_MARKERS_CSS;

	const compassRemover = document.createElement("style");
	compassRemover.textContent = REMOVE_COMPASS_CSS;

	const gameControlsRemover = document.createElement("style");
	gameControlsRemover.textContent = REMOVE_GAME_CONTROLS_CSS;

	// SCOREBOARD
	const scoreboardContainer = createEl("div", { id: "scoreboardContainer" });
	document.body.append(scoreboardContainer);

	const scoreboard = new Scoreboard(scoreboardContainer, {
		focusOnGuess(location) {
			rendererApi.focusOnGuess(location);
		},
		onToggleGuesses(open) {
			if (open) {
				ipcRenderer.send("open-guesses");
			} else {
				ipcRenderer.send("close-guesses");
			}
		},
	});

	// GAME ICONS
	const iconsColumn = createEl("div", { class: "iconsColumn" });
	document.body.append(iconsColumn);

	const settingsBtn = createEl("div", { title: "Settings (ctrl+p)" }, createEl("span", { class: "icon gearIcon" }));
	settingsBtn.addEventListener("click", () => {
		ipcRenderer.send("openSettings");
	});
	iconsColumn.append(settingsBtn);

	const showScoreboardBtn = createEl("div", { id: "showScoreboardBtn", title: "Show/Hide scoreboard" }, createEl("span", { class: "icon eyeIcon" }));
	showScoreboardBtn.addEventListener("click", () => {
		scoreboard.toogleVisibility();
	});

	// NO COMPASS
	if (isNoCompass) document.head.append(compassRemover);
	const compassIcon = createEl("span", { class: `icon ${isNoCompass ? "compassHiddenIcon" : "compassIcon"}` });
	const noCompassBtn = createEl("div", { title: "Show/Hide compass" }, compassIcon);
	noCompassBtn.addEventListener("click", () => {
		const isNoCompass = !sharedStore.get("isNoCompass");
		sharedStore.set("isNoCompass", isNoCompass);
		if (isNoCompass) {
			compassIcon.className = "icon compassHiddenIcon";
			document.head.append(compassRemover);
		} else {
			compassIcon.className = "icon compassIcon";
			compassRemover.remove();
		}
	});
	iconsColumn.append(noCompassBtn);

	// NO CAR
	const carIcon = createEl("span", { class: `icon ${isNoCar ? "noCarIcon" : "carIcon"}` });
	const noCarBtn = createEl("div", { title: "Show/Hide Google Car" }, carIcon);
	noCarBtn.addEventListener("click", () => {
		const isNoCar = !sharedStore.get("isNoCar");
		sharedStore.set("isNoCar", isNoCar);
		if (isNoCar) {
			carIcon.className = "icon noCarIcon";
		} else {
			carIcon.className = "icon carIcon";
		}
		location.reload();
	});
	iconsColumn.append(noCarBtn);

	// SATELLITE MODE
	if (isSatellite) document.head.append(gameControlsRemover);
	const satelliteIcon = createEl("span", { class: `icon ${isSatellite ? "satelliteIcon" : "streetIcon"}` });
	const satelliteSwitchBtn = createEl(
		"div",
		{ id: "satelliteSwitchBtn", title: `${isSatellite ? "Switch to StreetView" : "Switch to Satellite View"}` },
		satelliteIcon
	);
	satelliteSwitchBtn.addEventListener("click", () => {
		const isSatellite = !sharedStore.get("isSatellite");
		sharedStore.set("isSatellite", isSatellite);

		const isInGame = location.pathname.startsWith("/game/");
		if (isSatellite) {
			if (isInGame) rendererApi.showSatelliteMap(currentLocation);
			satelliteIcon.className = "icon satelliteIcon";
			satelliteSwitchBtn.title = "Switch to StreetView";
			centerSatelliteViewBtn.style.display = "flex";
			document.head.append(gameControlsRemover);
		} else {
			if (isInGame) rendererApi.hideSatelliteMap();
			satelliteIcon.className = "icon streetIcon";
			satelliteSwitchBtn.title = "Switch to Satellite View";
			centerSatelliteViewBtn.style.display = "none";
			gameControlsRemover.remove();
		}
	});
	iconsColumn.append(satelliteSwitchBtn);

	const centerSatelliteViewBtn = createEl("div", { id: "centerSatelliteViewBtn", title: "Center view" }, createEl("span", { class: "icon startFlagIcon" }));
	centerSatelliteViewBtn.addEventListener("click", () => {
		rendererApi.centerSatelliteView(currentLocation);
	});

	// IPC RENDERERS
	ipcRenderer.on("game-started", (_event, isMultiGuess, restoredGuesses, location) => {
		markerRemover.textContent = REMOVE_ALL_MARKERS_CSS;
		document.head.append(markerRemover);

		currentLocation = location;
		if (sharedStore.get("isSatellite")) {
			centerSatelliteViewBtn.style.display = "flex";
			rendererApi.showSatelliteMap(location);
		}

		iconsColumn.append(centerSatelliteViewBtn, showScoreboardBtn);
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

		noCarBtn.style.visibility = "visible";
		noCompassBtn.style.visibility = "visible";
	});

	ipcRenderer.on("refreshed-in-game", () => {
		document.head.append(markerRemover);
		iconsColumn.append(centerSatelliteViewBtn, showScoreboardBtn);
		scoreboard.checkVisibility();
	});

	ipcRenderer.on("game-quitted", () => {
		markerRemover.remove();
		scoreboard.hide();
		rendererApi.clearMarkers();

		// Hide in-game-only buttons
		qs("#centerSatelliteViewBtn")?.remove();
		qs("#showScoreboardBtn")?.remove();

		noCarBtn.style.visibility = "visible";
		noCompassBtn.style.visibility = "visible";
	});

	ipcRenderer.on("render-guess", (_event, guess) => {
		scoreboard.renderGuess(guess);
	});

	ipcRenderer.on("render-multiguess", (_event, guesses) => {
		scoreboard.renderMultiGuess(guesses);
	});

	ipcRenderer.on("show-round-results", (_event, round, location, scores) => {
		scoreboard.setTitle(`ROUND ${round} RESULTS (${scores.length})`);
		scoreboard.displayScores(scores);
		scoreboard.showSwitch(false);
		rendererApi.populateMap(location, scores);

		noCarBtn.style.visibility = "hidden";
		noCompassBtn.style.visibility = "hidden";
	});

	ipcRenderer.on("show-final-results", (_event, totalScores) => {
		scoreboard.setTitle(`HIGHSCORES (${totalScores.length})`);
		scoreboard.showSwitch(false);
		scoreboard.displayScores(totalScores, true);
		rendererApi.clearMarkers();

		noCarBtn.style.visibility = "hidden";
		noCompassBtn.style.visibility = "hidden";
		// refreshed-in-game is triggered here so we wait a bit to remove the style
		setTimeout(() => {
			markerRemover.remove();
		}, 1000);
	});

	ipcRenderer.on("next-round", (_event, isMultiGuess, location) => {
		currentLocation = location;
		scoreboard.checkVisibility();
		scoreboard.reset(isMultiGuess);
		scoreboard.showSwitch(true);

		noCarBtn.style.visibility = "visible";
		noCompassBtn.style.visibility = "visible";

		setTimeout(() => {
			rendererApi.clearMarkers();
		}, 1000);

		if (sharedStore.get("isSatellite")) {
			rendererApi.showSatelliteMap(location);
		}
	});

	ipcRenderer.on("switch-on", () => {
		scoreboard.switchOn(true);
	});
	ipcRenderer.on("switch-off", () => {
		scoreboard.switchOn(false);
	});

	ipcRenderer.on("twitch-connected", () => {
		settingsBtn.classList.remove("disconnected");
		settingsBtn.classList.add("connected");
	});

	ipcRenderer.on("twitch-disconnected", () => {
		settingsBtn.classList.add("disconnected");
	});

	ipcRenderer.invoke("get-connection-state").then(({ state }) => {
		settingsBtn.classList.remove("connected", "connecting", "disconnected");
		settingsBtn.classList.add(state);
	});
}
