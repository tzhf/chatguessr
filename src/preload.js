"use strict";

require("./errorReporting");

const { contextBridge, ipcRenderer } = require("electron");

import { qs, createEl } from "./utils/domUtils";

const Settings = require("./utils/Settings");

/** @typedef {import('./types').LatLng} LatLng */

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
const REMOVE_GAME_CONTROLS_CSS =
    ".styles_columnTwo___2qFL, .styles_controlGroup___ArrW, .compass, .game-layout__compass { display: none !important; }";

/**
 * @param {import('./types').RendererApi} rendererApi
 */
function init(rendererApi) {
    const Scoreboard = require("./Classes/Scoreboard");

    rendererApi.drParseNoCar();
    rendererApi.blinkMode();
    rendererApi.satelliteMode();

    /** @type {LatLng|undefined} */
    let currentLocation;

    const markerRemover = document.createElement("style");
    markerRemover.textContent = REMOVE_ALL_MARKERS_CSS;

    const gameControlsRemover = document.createElement("style");
    gameControlsRemover.textContent = REMOVE_GAME_CONTROLS_CSS;

    // SCOREBOARD
    const scoreboardContainer = createEl("div", { id: "scoreboardContainer" });
    document.body.append(scoreboardContainer);

    const scoreboard = new Scoreboard(scoreboardContainer, {
        focusOnGuess(location) {
            rendererApi.focusOnGuess(location);
        },
        drawPlayerResults(locations, result) {
            rendererApi.drawPlayerResults(locations, result);
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

    const showScoreboardBtn = createEl(
        "div",
        { id: "showScoreboardBtn", title: "Show/Hide scoreboard" },
        createEl("span", { class: "icon eyeIcon" })
    );
    showScoreboardBtn.addEventListener("click", () => {
        scoreboard.toogleVisibility();
    });

    // SATELLITE MODE
    const centerSatelliteViewBtn = createEl(
        "div",
        { id: "centerSatelliteViewBtn", title: "Center view" },
        createEl("span", { class: "icon startFlagIcon" })
    );

    centerSatelliteViewBtn.addEventListener("click", () => {
        rendererApi.centerSatelliteView(currentLocation);
    });

    // IPC RENDERERS
    ipcRenderer.on("game-started", (_event, isMultiGuess, restoredGuesses, location) => {
        markerRemover.textContent = REMOVE_ALL_MARKERS_CSS;
        document.head.append(markerRemover);

        iconsColumn.append(showScoreboardBtn);

        currentLocation = location;
        if (localStorage.getItem("satelliteModeEnabled") === "enabled") {
            iconsColumn.append(centerSatelliteViewBtn);
            document.head.append(gameControlsRemover);
            rendererApi.showSatelliteMap(location);
        } else {
            qs("#centerSatelliteViewBtn")?.remove();
            gameControlsRemover.remove();
        }

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

    ipcRenderer.on("refreshed-in-game", (_event, location) => {
        document.head.append(markerRemover);
        iconsColumn.append(showScoreboardBtn);

        // restores satellite mode after a refresh
        if (localStorage.getItem("satelliteModeEnabled") === "enabled") {
            rendererApi.showSatelliteMap(location);
            centerSatelliteViewBtn.addEventListener("click", () => {
                rendererApi.centerSatelliteView(location);
            });
            iconsColumn.append(centerSatelliteViewBtn);
        }

        scoreboard.checkVisibility();
    });

    ipcRenderer.on("game-quitted", () => {
        markerRemover.remove();
        scoreboard.hide();
        rendererApi.clearMarkers();

        // Hide in-game-only buttons
        qs("#centerSatelliteViewBtn")?.remove();
        qs("#showScoreboardBtn")?.remove();
    });

    ipcRenderer.on("render-guess", (_event, guess) => {
        scoreboard.renderGuess(guess);
    });

    ipcRenderer.on("render-multiguess", (_event, guesses) => {
        scoreboard.renderMultiGuess(guesses);
    });

    ipcRenderer.on("show-round-results", (_event, round, location, roundResults) => {
        const limit = Settings.read().guessMarkersLimit;
        rendererApi.drawRoundResults(location, roundResults, limit);
        scoreboard.displayRoundResults(roundResults, limit);
        scoreboard.setTitle(`ROUND ${round} RESULTS (${roundResults.length})`);
        scoreboard.showSwitch(false);
    });

    ipcRenderer.on("show-game-results", (_event, locations, gameResults) => {
        rendererApi.drawGameLocations(locations);
        rendererApi.drawPlayerResults(locations, gameResults[0]);
        scoreboard.displayGameResults(locations, gameResults);
        scoreboard.setTitle(`HIGHSCORES (${gameResults.length})`);
        scoreboard.showSwitch(false);
    });

    ipcRenderer.on("next-round", (_event, isMultiGuess, location) => {
        currentLocation = location;
        scoreboard.checkVisibility();
        scoreboard.reset(isMultiGuess);
        scoreboard.showSwitch(true);

        setTimeout(() => {
            rendererApi.clearMarkers();
        }, 1000);

        if (localStorage.getItem("satelliteModeEnabled") === "enabled") {
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
