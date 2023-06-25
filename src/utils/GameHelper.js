const axios = require("axios").default;
const countryIso = require("coordinate_to_country");
/**
 * Country code mapping for 2-character ISO codes that should be considered
 * part of another country for GeoGuessr streak purposes.
 *
 * @type {Record<string, string>}
 */
// @ts-ignore
const countryCodes = require("./countryCodes.json");

const GEOGUESSR_URL = "https://geoguessr.com";
const CG_API_URL = process.env.CG_API_URL ?? "https://chatguessr.com/api";
const CG_PUBLIC_URL = process.env.CG_PUBLIC_URL ?? "chatguessr.com";

/** @typedef {import('../types').LatLng} LatLng */
/** @typedef {import('../types').GameResult} GameResult */
/** @typedef {import('../types').Seed} Seed */

/**
 * Checks if the URL is an in-game page.
 *
 * @param {string} url
 * @return {boolean}
 */
function isGameURL(url) {
    return url.includes("/game/");
}

/**
 * Gets the Game ID from a game URL
 * Checks if ID is 16 characters in length
 * @param {string} url Game URL
 * @return {string|undefined}
 */
function getGameId(url) {
    const id = url.slice(url.lastIndexOf("/") + 1);
    if (id.length == 16) {
        return id;
    }
}

/**
 * Fetch a game seed from the GeoGuessr API.
 * @param {string} url URL for the game.
 * @return {Promise<Seed | undefined>} Seed Promise
 */
async function fetchSeed(url) {
    const gameId = getGameId(url);
    if (!gameId) {
        return;
    }

    /** @type {import("axios").AxiosResponse<Seed>} */
    const { data } = await axios.get(`${GEOGUESSR_URL}/api/v3/games/${gameId}`);
    return data;
}

/**
 * Get the country code for a coordinate.
 *
 * @param {LatLng} location
 * @return {Promise<string | undefined>} Country code or `undefined` if the location is not in a known country.
 */
async function getCountryCode(location) {
    const localResults = countryIso(location.lat, location.lng, true);
    let localIso = localResults.length > 0 ? localResults[0] : undefined;
    if (!localIso) {
        return;
    }
    return countryCodes[localIso];
}

/**
 * Parse lat/lng coordinates from a string.
 *
 * @param {string} coordinates
 * @return {LatLng | undefined}
 */
function parseCoordinates(coordinates) {
    const regex =
        /^(?<lat>[-+]?(?:[1-8]?\d(?:\.\d+)?|90(?:\.0+)?)),\s*(?<lng>[-+]?(?:180(?:\.0+)?|(?:(?:1[0-7]\d)|(?:[1-9]?\d))(?:\.\d+)?))$/;
    const m = regex.exec(coordinates);
    if (m?.groups) {
        return { lat: parseFloat(m.groups.lat), lng: parseFloat(m.groups.lng) };
    }
}

/**
 * Returns map scale
 * @param {import("../types").Bounds} bounds map bounds
 * @return {number} map scale
 */
function calculateScale(bounds) {
    return haversineDistance(bounds.min, bounds.max) / 7.458421;
}

/**
 * Returns distance in km between two coordinates
 * @param {LatLng} mk1
 * @param {LatLng} mk2
 * @return {number} km
 */
function haversineDistance(mk1, mk2) {
    const R = 6371.071;
    const rlat1 = mk1.lat * (Math.PI / 180);
    const rlat2 = mk2.lat * (Math.PI / 180);
    const difflat = rlat2 - rlat1;
    const difflon = (mk2.lng - mk1.lng) * (Math.PI / 180);
    const km =
        2 *
        R *
        Math.asin(
            Math.sqrt(
                Math.sin(difflat / 2) * Math.sin(difflat / 2) +
                    Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)
            )
        );
    return km;
}

/**
 * Returns score based on distance and scale
 * @param {number} distance
 * @param {number} scale
 * @return {number} score
 */
function calculateScore(distance, scale) {
    if (distance * 1000 < 25) {
        return 5000;
    }
    return Math.round(5000 * Math.pow(0.99866017, (distance * 1000) / scale));
}

/**
 * Upload scores to the Chatguessr API and return the game summary link
 *
 * @param {string} accessToken
 * @param {string} bot
 * @param {string} streamer
 * @param {string} map
 * @param {Object} mode
 * @param {LatLng[]} locations
 * @param {GameResult[]} gameResults
 * @return {Promise<string>}
 */
async function makeLink(accessToken, bot, streamer, map, mode, locations, gameResults) {
    /** @type {import("axios").AxiosResponse<{ code: string }>} */
    const res = await axios.post(
        `${CG_API_URL}/game`,
        {
            bot: bot,
            streamer: streamer,
            map: map,
            mode: mode,
            locations: locations,
            players: gameResults,
        },
        { headers: { access_token: accessToken } }
    );

    return `${CG_PUBLIC_URL}/game/${res.data.code}`;
}

/**
 * Returns random coordinates within land, no Antarctica
 * @param {import("../types").Bounds} bounds Optional bounds to further restrict random coordinates
 * @return {Promise<LatLng>}
 */
async function getRandomCoordsInLand(bounds = null) {
    var lat_north = 85, lat_south = -60, lng_west = -180, lng_east = 180;
    if(bounds != null)  {
        lat_north = bounds.max.lat;
        lat_south = Math.max(bounds.min.lat, lat_south)
        lng_east = bounds.max.lng;
        lng_west = bounds.min.lng;
    }
    const lat = Math.random() * (lat_north - lat_south) + lat_south;
    const lng = Math.random() * (lng_east - lng_west) + lng_west;
    const localResults = countryIso(lat, lng, true);
    if (!localResults.length) return await getRandomCoordsInLand(bounds);
    return { lat, lng };
}

exports.isGameURL = isGameURL;
exports.fetchSeed = fetchSeed;
exports.getCountryCode = getCountryCode;
exports.parseCoordinates = parseCoordinates;
exports.calculateScale = calculateScale;
exports.haversineDistance = haversineDistance;
exports.calculateScore = calculateScore;
exports.makeLink = makeLink;
exports.getRandomCoordsInLand = getRandomCoordsInLand;
