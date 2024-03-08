import { IpcRenderer } from "electron";
import internal from "stream";

export type LatLng = { lat: number; lng: number };
export type Location = {
    lat: number;
    lng: number;
    panoId: string | null;
    heading: number;
    pitch: number;
    zoom: number;
};

export type Guess = {
    user: string;
    username: string;
    color: string;
    flag: string | null;
    position: LatLng;
    streak: number;
    lastStreak: number | null;
    distance: number;
    score: number;
    time?: number;
};

export type MultiGuess = {
    user: string;
    username: string;
    color: string;
    flag: string | null;
};

export type RoundScore = {
    id: string;
    userId: string;
    username: string;
    user: string;
    color: string;
    flag: string | null;
    streak: number;
    lastStreak: number | null;
    distance: number;
    score: number;
    time: number;
    position: LatLng;
};

export type GameResult = {
    username: string;
    color: string;
    flag: string;
    streak: number;
    guesses: (LatLng | null)[];
    scores: (number | null)[];
    distances: (number | null)[];
    totalScore: number;
    totalDistance: number;
};

export type Bounds = {
    min: LatLng;
    max: LatLng;
};

export type GameMode = "standard" | "streak";

export type GameType = "standard" | "streak";

export type GameState = "started" | "finished";

export type GameRound = {
    lat: number;
    lng: number;
    panoId: string | null;
    heading: number;
    pitch: number;
    zoom: number;
    streakLocationCode: string | null;
    // TODO: Add missing fields
};

export type GeoGuessrRoundScore = {
    amount: string;
    unit: string;
    percentage: number;
};

export type Distance = {
    meters: { amount: string; unit: string };
    miles: { amount: string; unit: string };
};

export type GameGuess = {
    lat: number;
    lng: number;
    timedOut: boolean;
    timedOutWithGuess: boolean;
    roundScore: GeoGuessrRoundScore;
    roundScoreInPercentage: number;
    roundScoreInPoints: number;
    distance: Distance;
    distanceInMeters: number;
    time: number;
};

export type GamePlayer = {
    guesses: GameGuess[];
    // TODO: Add rest
};

export type GameSettings = {
    forbidMoving: boolean;
    forbidRotating: boolean;
    forbidZooming: boolean;
    timeLimit: number;
};

export type Seed = GameSettings & {
    token: string;
    bounds: Bounds;
    map: string;
    mapName: string;
    mode: GameMode;
    round: number;
    roundCount: number;
    rounds: GameRound[];
    player: GamePlayer;
    state: GameState;
    type: GameType;
};

export type GeoguessrUser = {
    nick: string;
    created: string;
    isVerified: boolean;
    isCreator: boolean;
    countryCode: string;
};

export type GeoGuessrMap = {
    id: string;
    name: string;
    slug: string;
    description: string;
    url: string;
    playUrl: string;
    bounds: Bounds;
    creator: GeoguessrUser;
    createdAt: Date;
    numFinishedGames: number;
    averageScore: number;
    maxErrorDistance: number;
    likes: number;
};

export interface RendererApi {
    drawRoundResults(location: Location, roundResults: Guess[], limit?: number);
    drawGameLocations(locations: Location[]);
    drawPlayerResults(locations: Location[], result: GameResult);
    focusOnGuess(location: LatLng);
    clearMarkers(keepLocationMarkers?: boolean);
    drParseNoCar();
    blinkMode();
    satelliteMode();
    showSatelliteMap(location: LatLng);
    hideSatelliteMap();
    centerSatelliteView(location: LatLng);
    getBounds(location: LatLng, limit: number);
}

declare global {
    interface Window {
        jQuery: typeof import("jquery");
        $: typeof import("jquery");
        chatguessrApi: import("./preload").ChatguessrApi;
    }

    namespace DataTables {
        interface Settings {
            // From datatables.net-plugins
            scrollResize?: boolean;
        }
    }
}
