<template>
	<div class="iconsColumn">
		<div title="Settings (ctrl+p)" @click="openSettings">
			<span class="icon gearIcon"></span>
		</div>
		<div v-if="isInGame" id="showScoreboardBtn" title="Show/Hide scoreboard" @click="toggleScoreboard">
			<span class="icon eyeIcon"></span>
		</div>
		<div title="Show/Hide compass" @click="toggleNoCompass">
			<span :class="['icon', isNoCompass ? 'compassHiddenIcon' : 'compassIcon']"></span>
		</div>
		<div title="Show/Hide car" @click="toggleNoCar">
			<span :class="['icon', isNoCar ? 'noCarIcon' : 'carIcon']"></span>
		</div>
		<div v-if="isInGame" :title="isSatellite ? 'Switch to Street View' : 'Switch to Satellite View'" @click="toggleSatellite">
			<span :class="['icon', isSatellite ? 'satelliteIcon' : 'streetIcon']"></span>
		</div>
		<div v-if="isInGame && isSatellite" id="centerSatelliteViewBtn" title="Center view" @click="centerSatelliteView">
			<span class="icon startFlagIcon"></span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { defineProps } from "vue";
import { contextBridge, ipcRenderer } from "electron";
import sharedStore from "./utils/sharedStore";
import type { LatLng, Guess, RendererApi } from "./types";

const REMOVE_GAME_CONTROLS_CSS = ".styles_columnTwo___2qFL, .styles_controlGroup___ArrW, .compass, .game-layout__compass { display: none !important; }";
const REMOVE_COMPASS_CSS = ".compass, .game-layout__compass { display: none; }";

const compassRemover = document.createElement("style");
compassRemover.textContent = REMOVE_COMPASS_CSS;

const gameControlsRemover = document.createElement("style");
gameControlsRemover.textContent = REMOVE_GAME_CONTROLS_CSS;

const props = defineProps<{
	rendererApi: RendererApi,
	toggleScoreboard: () => void,
}>();
const { rendererApi } = props;

// Template properties
let isInGame: boolean = false
let isNoCar: boolean = sharedStore.get("isNoCar", false);
let isNoCompass: boolean = sharedStore.get("isNoCompass", false);
let isSatellite: boolean = sharedStore.get("isSatellite", false);
let currentLocation: LatLng|null = null;

function openSettings () {
	ipcRenderer.send("openSettings");
}

function toggleScoreboard () {
	props.toggleScoreboard();
}

function toggleNoCompass () {
	isNoCompass = !isNoCompass;
	sharedStore.set("isNoCompass", isNoCompass);
	if (isNoCompass) {
		document.head.append(compassRemover);
	} else {
		compassRemover.remove();
	}
}

function toggleNoCar () {
	isNoCar = !isNoCar;
	sharedStore.set("isNoCar", isNoCar);
	location.reload();
}

function toggleSatellite () {
	isSatellite = !isSatellite;
	sharedStore.set("isSatellite", isSatellite);
	if (isSatellite) {
		if (isInGame) rendererApi.showSatelliteMap(currentLocation);
	} else {
		if (isInGame) rendererApi.hideSatelliteMap();
	}
}

function centerSatelliteView () {
	rendererApi.centerSatelliteView(currentLocation);
}

// Events
ipcRenderer.on("game-started", (e, isMultiGuess: boolean, restoredGuesses: Guess[], location: LatLng) => {
	currentLocation = location;
	isInGame = true;
	if (isSatellite) {
		rendererApi.showSatelliteMap(location);
	}
});

ipcRenderer.on("game-quitted", () => {
	isInGame = false;
	currentLocation = null;
});

ipcRenderer.on("show-round-results", (e, round, location, scores) => {
	isInGame = false;
});

ipcRenderer.on("show-final-results", (e, totalScores) => {
	isInGame = false;
	currentLocation = null;
});

ipcRenderer.on("next-round", (e, isMultiGuess, location) => {
	currentLocation = location;
	if (isSatellite) {
		rendererApi.showSatelliteMap(location);
	}
});

// Setup
rendererApi.drParseNoCar(isNoCar);
</script>
