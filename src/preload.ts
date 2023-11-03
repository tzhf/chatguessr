import "./errorReporting";
import { contextBridge, ipcRenderer } from "electron";
import type { LatLng, Location, Guess, RoundScore, GameResult } from "./types";

function ipcRendererOn(event: string, callback: (...args: unknown[]) => void) {
    const listener = (_event: unknown, ...args: unknown[]) => {
        callback(...args);
    };

    ipcRenderer.on(event, listener);
    return () => ipcRenderer.off(event, listener);
}

export type ConnectionState =
    | { state: "disconnected" }
    | { state: "connecting" }
    | { state: "connected"; botUsername: string; channelName: string };

const chatguessrApi = {
    setGuessesOpen(open: boolean) {
        if (open) {
            ipcRenderer.send("open-guesses");
        } else {
            ipcRenderer.send("close-guesses");
        }
    },
    startNextRound() {
        ipcRenderer.send("next-round-click");
    },
    returnToMapPage() {
        ipcRenderer.send("return-to-map-page");
    },
    openSettings() {
        ipcRenderer.send("openSettings");
    },
    getConnectionState(): Promise<ConnectionState> {
        return ipcRenderer.invoke("get-connection-state");
    },
    appDataPathExists(subdir?: string): Promise<string | false> {
        return ipcRenderer.invoke("app-data-path-exists", subdir);
    },
    importAudioFile() {
        return ipcRenderer.invoke("import-audio-file");
    },

    onGameStarted(callback: (isMultiGuess: boolean, restoredGuesses: Guess[], location: LatLng) => void) {
        return ipcRendererOn("game-started", callback);
    },
    onGameQuit(callback: () => void) {
        return ipcRendererOn("game-quitted", callback);
    },
    onReceiveGuess(callback: (guess: Guess) => void) {
        return ipcRendererOn("render-guess", callback);
    },
    onReceiveMultiGuesses(callback: (guesses: Guess[]) => void) {
        return ipcRendererOn("render-multiguess", callback);
    },
    onShowRoundResults(
        callback: (round: number, location: Location, roundResults: RoundScore[], markerLimit: number) => void
    ) {
        return ipcRendererOn("show-round-results", callback);
    },
    onShowGameResults(callback: (locations: Location[], gameResults: GameResult[]) => void) {
        return ipcRendererOn("show-game-results", callback);
    },
    onStartRound(callback: (isMultiGuess: boolean, location: LatLng) => void) {
        return ipcRendererOn("next-round", callback);
    },
    onRefreshRound(callback: (location: LatLng) => void) {
        return ipcRendererOn("refreshed-in-game", callback);
    },
    onGuessesOpenChanged(callback: (open: boolean) => void) {
        const remove = [
            ipcRendererOn("switch-on", () => callback(true)),
            ipcRendererOn("switch-off", () => callback(false)),
        ];
        return () => {
            for (const unlisten of remove) {
                unlisten();
            }
        };
    },
    onConnectionStateChange(callback: (state: ConnectionState) => void) {
        return ipcRendererOn("connection-state", callback);
    },
};

export type ChatguessrApi = typeof chatguessrApi;

contextBridge.exposeInMainWorld("chatguessrApi", chatguessrApi);
