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

const REMOVE_ALL_MARKERS_CSS =
	'[data-qa="result-view-top"] [data-qa="guess-marker"], [data-qa="result-view-top"] [data-qa="correct-location-marker"], .result-map__line { display: none; }';

/**
 * @param {import('./types').RendererApi} rendererApi
 */
function init(rendererApi) {
	const Scoreboard = require("./Classes/Scoreboard");
	const { createApp, h } = require("vue");
	const InGameUI = require("./InGameUI.vue").default;

	const markerRemover = document.createElement("style");
	markerRemover.textContent = REMOVE_ALL_MARKERS_CSS;

	// Settings UI
	const iconsContainer = createEl("div", { id: "iconsContainer" });
	document.body.append(iconsContainer);
	
	const ingameUi = createApp(InGameUI, {
		rendererApi,
		toggleScoreboard,
	});
	ingameUi.mount(iconsContainer);

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

	function toggleScoreboard() {
		scoreboard.toogleVisibility();
	}

	// IPC RENDERERS
	ipcRenderer.on("game-started", (e, isMultiGuess, restoredGuesses, location) => {
		markerRemover.textContent = REMOVE_ALL_MARKERS_CSS;
		document.head.append(markerRemover);

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

	ipcRenderer.on("refreshed-in-game", () => {
		document.head.append(markerRemover);
		scoreboard.checkVisibility();
	});

	ipcRenderer.on("game-quitted", () => {
		markerRemover.remove();
		scoreboard.hide();
		rendererApi.clearMarkers();
	});

	ipcRenderer.on("render-guess", (e, guess) => {
		scoreboard.renderGuess(guess);
	});

	ipcRenderer.on("render-multiguess", (e, guesses) => {
		scoreboard.renderMultiGuess(guesses);
	});

	ipcRenderer.on("show-round-results", (e, round, location, scores) => {
		scoreboard.setTitle(`ROUND ${round} RESULTS (${scores.length})`);
		scoreboard.displayScores(scores);
		scoreboard.showSwitch(false);
		rendererApi.populateMap(location, scores);
	});

	ipcRenderer.on("show-final-results", (e, totalScores) => {
		scoreboard.setTitle(`HIGHSCORES (${totalScores.length})`);
		scoreboard.showSwitch(false);
		scoreboard.displayScores(totalScores, true);
		rendererApi.clearMarkers();

		// refreshed-in-game is triggered here so we wait a bit to remove the style
		setTimeout(() => {
			markerRemover.remove();
		}, 1000);
	});

	ipcRenderer.on("next-round", (e, isMultiGuess, location) => {
		scoreboard.checkVisibility();
		scoreboard.reset(isMultiGuess);
		scoreboard.showSwitch(true);

		setTimeout(() => {
			rendererApi.clearMarkers();
		}, 1000);
	});

	ipcRenderer.on("switch-on", () => {
		scoreboard.switchOn(true);
	});
	ipcRenderer.on("switch-off", () => {
		scoreboard.switchOn(false);
	});

	/**
	 * @param {String} type
	 * @param {Object} attributes
	 * @param {String[]|HTMLElement[]} children
	 */
	function createEl(type, attributes, ...children) {
		const el = document.createElement(type);
		for (const key in attributes) {
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
