<template>
	<div class="iconsColumn">
		<div title="Settings (ctrl+p)" :class="connectionStatus" @click="openSettings">
			<span class="icon gearIcon"></span>
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
		<div v-if="isInGame" id="showScoreboardBtn" title="Show/Hide scoreboard" @click="toggleScoreboard">
			<span class="icon eyeIcon"></span>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { ipcRenderer } from "electron";
import sharedStore from "./utils/sharedStore";
import type { LatLng, Guess, RendererApi } from "./types";

const REMOVE_GAME_CONTROLS_CSS = ".styles_columnTwo___2qFL, .styles_controlGroup___ArrW, .compass, .game-layout__compass { display: none !important; }";
const REMOVE_COMPASS_CSS = '.compass, .game-layout__compass, [class^="panorama-compass_"] { display: none; }';

const compassRemover = document.createElement("style");
compassRemover.textContent = REMOVE_COMPASS_CSS;

const gameControlsRemover = document.createElement("style");
gameControlsRemover.textContent = REMOVE_GAME_CONTROLS_CSS;

export default defineComponent({
	props: {
		rendererApi: { type: Object as PropType<RendererApi>, required: true },
		toggleScoreboard: { type: Function as PropType<() => void>, required: true },
	},
	created() {
		// Events
		ipcRenderer.on("game-started", (e, isMultiGuess: boolean, restoredGuesses: Guess[], location: LatLng) => {
			this.currentLocation = location;
			this.isInGame = true;
			if (this.isSatellite) {
				this.rendererApi.showSatelliteMap(location);
			}
		});

		ipcRenderer.on("game-quitted", () => {
			this.isInGame = false;
			this.currentLocation = null;
		});

		ipcRenderer.on("show-round-results", (e, round, location, scores) => {
			this.isInGame = false;
		});

		ipcRenderer.on("show-final-results", (e, totalScores) => {
			this.isInGame = false;
			this.currentLocation = null;
		});

		ipcRenderer.on("next-round", (e, isMultiGuess, location: LatLng) => {
			this.currentLocation = location;
			if (this.isSatellite) {
				this.rendererApi.showSatelliteMap(location);
			}
		});

		ipcRenderer.on("twitch-connected", () => {
			this.connectionStatus = "connected";
		});

		ipcRenderer.on("twitch-disconnected", () => {
			this.connectionStatus = "disconnected";
		});

		ipcRenderer.invoke("get-connection-state").then(({ state }) => {
			this.connectionStatus = state;
		});
		
		this.rendererApi.drParseNoCar(this.isNoCar);
	},
	data() {
		return {
			isInGame: false,
			isNoCar: sharedStore.get("isNoCar", false),
			isNoCompass: sharedStore.get("isNoCompass", false),
			isSatellite: sharedStore.get("isSatellite", false),
			currentLocation: null as LatLng|null,
			connectionStatus: "connecting",
		};
	},
	methods: {
		/** Get the current location's coordinates as a plain object (not behind a vue Proxy). */
		getLocation() {
			if (this.currentLocation) {
				return { lat: this.currentLocation.lat, lng: this.currentLocation.lng };
			}
		},
		openSettings() {
			ipcRenderer.send("openSettings");
		},
		toggleNoCompass() {
			this.isNoCompass = !this.isNoCompass;
			sharedStore.set("isNoCompass", this.isNoCompass);
			if (this.isNoCompass) {
				document.head.append(compassRemover);
			} else {
				compassRemover.remove();
			}
		},
		toggleNoCar() {
			this.isNoCar = !this.isNoCar;
			sharedStore.set("isNoCar", this.isNoCar);
			location.reload();
		},
		toggleSatellite() {
			this.isSatellite = !this.isSatellite;
			sharedStore.set("isSatellite", this.isSatellite);
			if (!this.isInGame) return;
			if (this.isSatellite) {
				this.rendererApi.showSatelliteMap(this.getLocation());
			} else {
				this.rendererApi.hideSatelliteMap();
			}
		},
		centerSatelliteView() {
			this.rendererApi.centerSatelliteView(this.getLocation());
		},
	},
});
</script>