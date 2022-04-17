const axios = require("axios").default;
const countryIso = require("country-iso");
const iso3to2 = require("country-iso-3-to-2");
/**
 * Country code mapping for 2-character ISO codes that should be considered
 * part of another country for GeoGuessr streak purposes.
 *
 * @type {Record<string, string>}
 */
// @ts-ignore
const countryCodes = require("./countryCodes.json");

const GEOGUESSR_URL = "https://geoguessr.com";
const CG_API_URL = process.env.CG_API_URL ?? "https://chatguessr-api.vercel.app";
const CG_PUBLIC_URL = process.env.CG_PUBLIC_URL ?? "chatguessr.com";

/** @typedef {import('../types').LatLng} LatLng */
/** @typedef {import('../types').Guess} Guess */
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
	const localResults = countryIso.get(location.lat, location.lng).map(iso3to2);
	const localIso = localResults.length > 0 ? localResults[0] : undefined;
	if (!localIso) {
		return;
	}

	let mappedIso = countryCodes[localIso];
	// `countryIso` does not seem to handle holes in the border polygons correctly,
	// so we need to patch up some special cases.
	// This is a short-term patch, we cannot handle anomalies like Baarle this way,
	// we probably need to find a different library for that.
	if (localResults.includes("LS") && localResults.includes("ZA")) {
		mappedIso = "LS"; // Lesotho…
	}
	if (localResults.includes("SM") && localResults.includes("IT")) {
		mappedIso = "SM"; // San Marino
	}
	if (localResults.includes("VA") && localResults.includes("IT")) {
		mappedIso = "VA"; // Vatican City
	}
	if (localResults.includes("CH") && localResults.includes("IT")) {
		mappedIso = "IT"; // Campione d'Italia
	}

	return mappedIso;
}

/**
 * Parse lat/lng coordinates from a string.
 *
 * @param {string} coordinates
 * @return {LatLng | undefined}
 */
function parseCoordinates(coordinates) {
	const regex = /^(?<lat>[-+]?(?:[1-8]?\d(?:\.\d+)?|90(?:\.0+)?)),\s*(?<lng>[-+]?(?:180(?:\.0+)?|(?:(?:1[0-7]\d)|(?:[1-9]?\d))(?:\.\d+)?))$/;
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
		2 * R * Math.asin(Math.sqrt(Math.sin(difflat / 2) * Math.sin(difflat / 2) + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)));
	return km;
}

/**
 * Returns score based on distance and scale
 * @param {number} distance
 * @param {number} scale
 * @return {number} score
 */
function calculateScore(distance, scale) {
	return Math.round(5000 * Math.pow(0.99866017, (distance * 1000) / scale));
}

/**
 * Upload scores to the Chatguessr API and return the public URL to the scoreboard.
 *
 * @param  {string} accessToken
 * @param  {string} bot
 * @param  {string} streamer
 * @param  {string} mapName
 * @param {Object} mode
 * @param  {LatLng[]} locations
 * @param  {({ username: string, flag: string, score: number, rounds: number })[]} totalScores
 * @return {Promise<string>}
 */
async function makeLink(accessToken, bot, streamer, mapName, mode, locations, totalScores) {
	const players = totalScores.map((guess) => {
		return {
			username: guess.username,
			flag: guess.flag,
			score: guess.score,
			rounds: guess.rounds,
		};
	});

	/** @type {import("axios").AxiosResponse<{ code: string }>} */
	const res = await axios.post(
		`${CG_API_URL}/game`,
		{
			streamer: streamer,
			bot: bot,
			map: mapName,
			mode: mode,
			locations: locations,
			players: players,
		},
		{ headers: { access_token: accessToken } },
	);

	return `${CG_PUBLIC_URL}/game/${res.data.code}`;
}

exports.isGameURL = isGameURL;
exports.fetchSeed = fetchSeed;
exports.getCountryCode = getCountryCode;
exports.parseCoordinates = parseCoordinates;
exports.calculateScale = calculateScale;
exports.haversineDistance = haversineDistance;
exports.calculateScore = calculateScore;
exports.makeLink = makeLink;
