<template>
    <div id="CGFrameContainer" ref="CGFrameContainer"
        :style="isCGFrameContainerVisible ? 'visibility: visible' : 'visibility: hidden'">
        <Timer :style="timerVisible && gameState === 'in-round' ? 'visibility: visible' : 'visibility: hidden'"
            :importAudioFile="chatguessrApi.importAudioFile" :appDataPathExists="chatguessrApi.appDataPathExists"
            :setGuessesOpen="chatguessrApi.setGuessesOpen" ref="timer" />
    </div>

    <div class="cg-menu">
        <button :class="['cg-button', twitchConnectionState]" title="settings" @click="openSettings">
            <span class="cg-icon cg-icon--gear"></span>
        </button>
        <button class="cg-button" title="Show/Hide timer" @click="toggleTimer" :hidden="gameState === 'none'">
            <span :class="['cg-icon', timerVisible ? 'cg-icon--timerVisible' : 'cg-icon--timerHidden']"></span>
        </button>
        <button class="cg-button" title="Show/Hide scoreboard" @click="toggleScoreboard" :hidden="gameState === 'none'">
            <span
                :class="['cg-icon', scoreboardVisible ? 'cg-icon--scoreboardVisible' : 'cg-icon--scoreboardHidden']"></span>
        </button>
        <button class="cg-button" title="Center view" @click="centerSatelliteView"
            :hidden="satelliteModeEnabled.value !== 'enabled' || gameState !== 'in-round'">
            <span class="cg-icon cg-icon--flag"></span>
        </button>
    </div>
</template>

<script lang="ts" setup>
import { ref, shallowRef, onMounted, onBeforeUnmount, watch, computed } from "vue";
import { useStyleTag } from "@vueuse/core";
import type { LatLng, Location, GameResult, Guess } from "../types";
// Only import the type here, we have to import Scoreboard on mount so jQuery has access to all the elements it needs.
import Scoreboard from "../Classes/Scoreboard";
import Timer from "./Timer.vue";
import type { ChatguessrApi } from "../preload";

const {
    chatguessrApi,
    ...rendererApi
} = defineProps<{
    chatguessrApi: ChatguessrApi,
    drawRoundResults: (location: Location, roundResults: Guess[], limit?: number) => void,
    drawGameLocations: (locations: Location[]) => void,
    drawPlayerResults: (locations: Location[], result: GameResult) => void,
    clearMarkers: () => void,
    focusOnGuess: (location: LatLng) => void,
    showSatelliteMap: (location: LatLng) => void,
    hideSatelliteMap: () => void,
    centerSatelliteView: (location: LatLng) => void,
}>();

const gameState = ref<"in-round" | "round-results" | "game-results" | "none">("none");
const currentLocation = shallowRef<LatLng | null>(null);
const twitchConnectionState = useTwitchConnectionState();

const CGFrameContainer = ref<HTMLDivElement | null>(null);
const isCGFrameContainerVisible = computed(() => gameState.value !== "none");

const satelliteModeEnabled = {
    // Manual implementation of `ref()` API
    // As `useLocalStorage` does not receive storage events from the non-vue UI script
    // TODO(@ReAnnannanna): Replace this with `useLocalStorage` when the pregame UI script is using Vue
    get value(): "enabled" | "disabled" {
        return localStorage.getItem("satelliteModeEnabled") === "enabled" ? "enabled" : "disabled";
    },
    set value(value: "enabled" | "disabled") {
        localStorage.setItem("satelliteModeEnabled", value);
    },
};

const timer = ref<typeof Timer | null>(null);
const timerVisible = ref(true);

let scoreboard: Scoreboard | null = null;
const scoreboardVisible = ref(true);

onMounted(async () => {
    timerVisible.value = timer.value!.settings.visible;

    scoreboard = new Scoreboard(CGFrameContainer.value!, {
        focusOnGuess(location) {
            rendererApi.focusOnGuess(location);
        },
        drawPlayerResults(locations, result) {
            rendererApi.drawPlayerResults(locations, result);
        },
        onToggleGuesses(open) {
            chatguessrApi.setGuessesOpen(open);
        },
    });
});

// Remove the game's own markers while on a results screen (where we draw our own)
const markerRemover = useStyleTag('[data-qa="result-view-top"] [data-qa="guess-marker"], [data-qa="result-view-top"] [data-qa="correct-location-marker"], [class^="coordinate-result-map_line__"] { display: none; }', {
    id: 'cg-marker-remover',
    manual: true,
});
const removeMarkers = computed(() => gameState.value === "round-results" || gameState.value === "game-results");
watch(removeMarkers, (load) => {
    if (load) {
        markerRemover.load();
    } else {
        markerRemover.unload();
    }
}, { immediate: true });

watch(scoreboardVisible, (value) => {
    if (scoreboard === null) return
    if (value) {
        scoreboard.show();
    } else {
        scoreboard.hide();
    }
}, { immediate: true });

// Remove the game's controls when in satellite mode.
const gameControlsRemover = useStyleTag('[class^="styles_columnTwo__"], [class^="styles_controlGroup__"], [data-qa="compass"], [class^="panorama-compass_"] { display: none !important; }', {
    id: "cg-game-controls-remover",
    manual: true,
});
// `satelliteModeEnabled` is not actually reactive, but the actual change we're interested in is in `gameState` anyways.
const removeGameControls = computed(() => gameState.value !== "none" && satelliteModeEnabled.value === "enabled");
watch(removeGameControls, (load) => {
    if (load) {
        gameControlsRemover.load();
    } else {
        gameControlsRemover.unload();
    }
}, { immediate: true });

onBeforeUnmount(chatguessrApi.onGameStarted((isMultiGuess, restoredGuesses, location) => {
    gameState.value = "in-round";
    currentLocation.value = location;

    if (satelliteModeEnabled.value === "enabled") {
        rendererApi.showSatelliteMap(location);
    } else {
        rendererApi.hideSatelliteMap();
    }

    if (!scoreboard) {
        return;
    }

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

    timer.value!.reset();
    if (timer.value!.settings.autoStart) timer.value!.start()
}));

onBeforeUnmount(chatguessrApi.onRefreshRound((location) => {
    gameState.value = "in-round";
    if (satelliteModeEnabled.value === "enabled") {
        rendererApi.showSatelliteMap(location);
    }
}));

onBeforeUnmount(chatguessrApi.onGameQuit(() => {
    gameState.value = "none";
    timer.value!.reset();
    rendererApi.clearMarkers();
}));

onBeforeUnmount(chatguessrApi.onReceiveGuess((guess) => {
    scoreboard?.renderGuess(guess);
}));

onBeforeUnmount(chatguessrApi.onReceiveMultiGuesses((guesses) => {
    scoreboard?.renderMultiGuess(guesses);
}));

onBeforeUnmount(chatguessrApi.onShowRoundResults((round, location, roundResults, guessMarkersLimit) => {
    gameState.value = "round-results";

    rendererApi.drawRoundResults(location, roundResults, guessMarkersLimit);

    if (!scoreboard) {
        return;
    }

    scoreboard.displayRoundResults(roundResults, guessMarkersLimit);
    scoreboard.setTitle(`ROUND ${round} RESULTS (${roundResults.length})`);
    scoreboard.showSwitch(false);

    timer.value!.reset();
}));

onBeforeUnmount(chatguessrApi.onShowGameResults((locations, gameResults) => {
    gameState.value = "game-results";
    rendererApi.drawGameLocations(locations);
    rendererApi.drawPlayerResults(locations, gameResults[0]);

    if (!scoreboard) {
        return;
    }

    scoreboard.displayGameResults(locations, gameResults);
    scoreboard.setTitle(`HIGHSCORES (${gameResults.length})`);
    scoreboard.showSwitch(false);
}));

onBeforeUnmount(chatguessrApi.onStartRound((isMultiGuess, location) => {
    gameState.value = "in-round";
    currentLocation.value = location;

    rendererApi.clearMarkers();
    if (satelliteModeEnabled.value === "enabled") {
        rendererApi.showSatelliteMap(location);
    }

    if (!scoreboard) {
        return;
    }

    scoreboard.reset(isMultiGuess);
    scoreboard.showSwitch(true);

    timer.value!.reset();
    if (timer.value!.settings.autoStart) timer.value!.start()
}));

onBeforeUnmount(chatguessrApi.onGuessesOpenChanged((open) => {
    scoreboard?.switchOn(open);
}));

/** Load and update twitch connection state. */
function useTwitchConnectionState() {
    const conn = ref<"connected" | 'connecting' | 'disconnected'>("disconnected");

    onMounted(async () => {
        const { state } = await chatguessrApi.getConnectionState();
        conn.value = state;
    });

    onBeforeUnmount(chatguessrApi.onConnectionStateChange(({ state }) => {
        conn.value = state;
    }));

    return conn;
}

function openSettings() {
    chatguessrApi.openSettings();
}

function toggleScoreboard() {
    scoreboardVisible.value = !scoreboardVisible.value;
}

function toggleTimer() {
    timerVisible.value = !timerVisible.value;
    timer.value!.settings.visible = !timer.value!.settings.visible;
}

function centerSatelliteView() {
    if (currentLocation.value) {
        rendererApi.centerSatelliteView(currentLocation.value);
    }
}
</script>
<style scoped>
[hidden] {
    display: none !important;
}

#CGFrameContainer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    pointer-events: none;
}

.cg-menu {
    z-index: 99998;
    display: flex;
    flex-direction: column;
    gap: 5px;
    top: 100px;
    position: fixed;
    right: 7px;
}

.cg-button {
    box-sizing: content-box;
    display: flex;
    user-select: none;
    background: rgba(0, 0, 0, 0.4);
    border: none;
    border-radius: 50px;
    padding: 0.5rem;
    width: 1.7rem;
    height: 1.7rem;
    transition: 0.3s;
    cursor: pointer;
}

.cg-button:hover {
    background: rgba(0, 0, 0, 0.5);
}

.cg-button.disconnected {
    background: red;
}

.cg-button.connecting {
    background: blue;
}

.cg-icon {
    background-size: contain;
    width: 100%;
    height: 100%;
}

.cg-icon--gear {
    background-image: url(asset:icons/gear.svg);
}

.cg-icon--scoreboardVisible {
    background-image: url(asset:icons/scoreboard_visible.svg);
}

.cg-icon--scoreboardHidden {
    background-image: url(asset:icons/scoreboard_hidden.svg);
}

.cg-icon--timerVisible {
    background-image: url(asset:icons/timer_visible.svg);
}

.cg-icon--timerHidden {
    background-image: url(asset:icons/timer_hidden.svg);
}

.cg-icon--flag {
    background-image: url(asset:icons/start_flag.svg);
}
</style>