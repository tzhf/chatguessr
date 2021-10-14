import { IpcRenderer } from "electron";

export type LatLng = { lat: number, lng: number };

export type Guess = {
    user: string,
    username: string,
    color: string,
    flag: string,
    position: LatLng,
    streak: number,
    distance: number,
    score: number,
    modified: boolean,
};

export type Bounds = {
    min: LatLng,
    max: LatLng,
};

export type GameMode = 'standard' | 'streak';

export type GameType = 'standard' | 'streak';

export type GameState = 'started' | 'finished';

export type GameRound = {
    lat: number,
    lng: number,
    heading: number,
    pitch: number,
    streakLocationCode: string | null,
    // TODO: Add missing fields
};

export type RoundScore = {
    amount: string,
    unit: string,
    percentage: number,
};

export type Distance = {
    meters: { amount: string, unit: string },
    miles: { amount: string, unit: string },
};

export type GameGuess = {
    lat: number,
    lng: number,
    timedOut: boolean,
    timedOutWithGuess: boolean,
    roundScore: RoundScore,
    roundScoreInPercentage: number,
    roundScoreInPoints: number,
    distance: Distance,
    distanceInMeters: number,
    time: number,
};

export type GamePlayer = {
    guesses: GameGuess[],
    // TODO: Add rest
};

export type GameSettings = {
    forbidMoving: boolean,
    forbidRotating: boolean,
    forbidZooming: boolean,
    timeLimit: number,
};

export type Seed = GameSettings & {
    token: string,
    bounds: Bounds,
    map: string,
    mapName: string,
    mode: GameMode,
    round: number,
    roundCount: number,
    rounds: GameRound[],
    player: GamePlayer,
    state: GameState,
    type: GameType,
};

declare global {
    interface Window {
        ipcRenderer: IpcRenderer;
        MAP: google.maps.Map | null;
        jQuery: typeof import('jquery');
        $: typeof import('jquery');
    }
}