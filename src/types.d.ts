import { IpcRenderer } from "electron";

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
    time: number;
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

export type RoundScore = {
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
    roundScore: RoundScore;
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

export interface RendererApi {
    populateMap(location: Location, scores: Guess[]);
    clearMarkers();
    drParseNoCar();
    blinkMode();
    satelliteMode();
    showSatelliteMap(location: LatLng);
    hideSatelliteMap();
    centerSatelliteView(location: LatLng);
    getBounds(location: LatLng, meters: number);
    focusOnGuess(location: LatLng);
}

export interface ChatguessrApi {
    init(api: RendererApi);
    startNextRound();
    returnToMapPage();
}

declare global {
    interface Window {
        jQuery: typeof import("jquery");
        $: typeof import("jquery");
        chatguessrApi: ChatguessrApi;
    }

    namespace DataTables {
        interface Settings {
            // From datatables.net-plugins
            scrollResize?: boolean;
        }
    }
}
