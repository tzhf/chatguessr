"use strict";

require("./errorReporting");

const { contextBridge, ipcRenderer } = require("electron");

/** @typedef {import('./types').LatLng} LatLng */
/** @typedef {import('./types').Guess} Guess */

/** @type {import("./types").ChatguessrApi} */
const chatguessrApi = {
	init,
	startNextRound() {
		ipcRenderer.send("next-round-click");
	},
};

contextBridge.exposeInMainWorld("chatguessrApi", chatguessrApi);

const REMOVE_ALL_MARKERS_CSS = '[data-qa="result-view-top"] [data-qa="guess-marker"], [data-qa="result-view-top"] [data-qa="correct-location-marker"] { display: none; }';
const REMOVE_GUESS_MARKERS_CSS = '[data-qa="result-view-top"] [data-qa="guess-marker"] { display: none; }';
const REMOVE_GAME_CONTROLS_CSS = ".styles_columnTwo___2qFL, .styles_controlGroup___ArrW, .compass { display: none !important; }";

/**
 * @param {import('./types').RendererApi} rendererApi
 */
function init(rendererApi) {
	const Scoreboard = require("./Classes/Scoreboard");
	const Settings = require("./utils/Settings");
	const sharedStore = require("./utils/sharedStore");

	const { noCar } = Settings.read();
	rendererApi.drParseNoCar(noCar);

	const markerRemover = document.createElement("style");
	markerRemover.textContent = REMOVE_ALL_MARKERS_CSS;

	const gameControlsRemover = document.createElement("style");
	gameControlsRemover.textContent = REMOVE_GAME_CONTROLS_CSS;

	// SCOREBOARD
	const scoreboardContainer = createEl("div", { id: "scoreboardContainer" });
	document.body.append(scoreboardContainer);

	const scoreboard = new Scoreboard(scoreboardContainer, {
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

	const showScoreboardBtn = createEl("div", { id: "showScoreboardBtn", title: "Show scoreboard" }, createEl("span", { class: "icon eyeIcon" }));
	showScoreboardBtn.addEventListener("click", () => {
		scoreboard.setVisibility();
	});

	/** @type {LatLng|undefined} */
	let currentLocation;

	const isSatellite = sharedStore.get("isSatellite");
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

		if (isSatellite) {
			rendererApi.showSatelliteMap(currentLocation);
			satelliteIcon.className = "icon satelliteIcon";
			satelliteSwitchBtn.title = "Switch to StreetView";
			centerSatelliteViewBtn.style.display = "flex";
			document.head.append(gameControlsRemover);
		} else {
			rendererApi.hideSatelliteMap();
			satelliteIcon.className = "icon streetIcon";
			satelliteSwitchBtn.title = "Switch to Satellite View";
			centerSatelliteViewBtn.style.display = "none";
			gameControlsRemover.remove();
		}
	});

	const centerSatelliteViewBtn = createEl("div", { id: "centerSatelliteViewBtn", title: "Center view" }, createEl("span", { class: "icon startFlagIcon" }));
	centerSatelliteViewBtn.addEventListener("click", () => {
		rendererApi.centerSatelliteView();
	});

	// IPC RENDERERS
	ipcRenderer.on("game-started", (e, isMultiGuess, restoredGuesses, location) => {
		markerRemover.textContent = REMOVE_ALL_MARKERS_CSS;
		document.head.append(markerRemover);

		currentLocation = location;
		if (sharedStore.get("isSatellite")) {
			centerSatelliteViewBtn.style.display = "flex";
			rendererApi.showSatelliteMap(location);
		}

		iconsColumn.append(showScoreboardBtn, satelliteSwitchBtn, centerSatelliteViewBtn);
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
		iconsColumn.append(showScoreboardBtn, satelliteSwitchBtn, centerSatelliteViewBtn);
		scoreboard.checkVisibility();
		rendererApi.drParseNoCompass(noCompass);
	});

	ipcRenderer.on("game-quitted", () => {
		markerRemover.remove();
		scoreboard.hide();
		rendererApi.clearMarkers();

		// Hide in-game-only buttons
		document.querySelector("#showScoreboardBtn")?.remove();
		document.querySelector("#satelliteSwitchBtn")?.remove();
		document.querySelector("#centerSatelliteViewBtn")?.remove();
	});

	ipcRenderer.on("render-guess", (e, guess) => {
		scoreboard.renderGuess(guess);
	});

	ipcRenderer.on("render-multiguess", (e, guesses) => {
		scoreboard.renderMultiGuess(guesses);
	});

	ipcRenderer.on("show-round-results", (e, round, location, scores) => {
		scoreboard.setTitle(`ROUND ${round} RESULTS`);
		scoreboard.displayScores(scores);
		scoreboard.showSwitch(false);
		rendererApi.populateMap(location, scores);
	});

	ipcRenderer.on("show-final-results", (e, totalScores) => {
		markerRemover.textContent = REMOVE_GUESS_MARKERS_CSS;
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

	ipcRenderer.on("game-settings-change", (e, noCompass) => {
		rendererApi.drParseNoCompass(noCompass);
	});

	/**
	 * @param {String} type
	 * @param {Object} attributes
	 * @param {String[]|HTMLElement[]} children
	 */
	function createEl(type, attributes, ...children) {
		const el = document.createElement(type);
		for (let key in attributes) {
			el.setAttribute(key, attributes[key]);
		}
		children.forEach((child) => {
			if (typeof child === "string") {
				el.appendChild(document.createTextNode(child));
			} else {
				el.appendChild(child);
			}
		});
		return el;
	}
}
