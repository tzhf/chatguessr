const axios = require("axios").default;
const countryIso = require("country-iso");
const iso3to2 = require('country-iso-3-to-2');
/**
 * Country code mapping for 2-character ISO codes that should be considered
 * part of another country for GeoGuessr streak purposes.
 * 
 * @type {Record<string, string>}
 */
// @ts-ignore
const countryCodes = require('./countryCodes.json')

/** @typedef {import('../types').LatLng} LatLng */
/** @typedef {import('../types').Guess} Guess */
/** @typedef {import('../types').Seed} Seed */

/**
 * Checks if '/game/' is in the URL
 * @param {string} url Game URL
 * @return {boolean}
 */
function isGameURL(url) {
  return url.includes("/game/");
}

/**
 * Gets the Game ID from a game URL
 * Checks if ID is 16 characters in length
 * @param {string} url Game URL
 * @return {string|false} id or false
 */
function getGameId(url) {
  const id = url.substring(url.lastIndexOf("/") + 1);
  if (id.length == 16) {
    return id;
  } else {
    return false;
  }
}

/**
 * Fetch a game seed
 * @param {string} url
 * @return {Promise<Seed>} Seed Promise
 */
async function fetchSeed(url) {
  const gameId = getGameId(url);
  if (!gameId) return;

  /** @type {import("axios").AxiosResponse<Seed>} */
  const { data } = await axios.get(`https://www.geoguessr.com/api/v3/games/${gameId}`);
  return data;
}

/**
 * Returns a country code
 * @param {LatLng} location
 * @return {Promise<string>} Country code Promise
 */
async function getCountryCode(location) {
  const localResults = countryIso.get(location.lat, location.lng);
  const localIso = localResults.length > 0 ? iso3to2(localResults[0]) : undefined;

  // do we even need this fallback?
  // const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode');
  // url.searchParams.append('latitude', `${location.lat}`);
  // url.searchParams.append('longitude', `${location.lng}`);
  // url.searchParams.append('key', process.env.BDC_KEY);

  // /** @type {import("axios").AxiosResponse<{ countryCode: string }>} */
  // const res = await axios.get(url.toString());
  // const remoteIso = res.data.countryCode === '__' ? undefined : res.data.countryCode;
  
  return countryCodes[localIso];
}

/**
 * Check if the param is coordinates
 * @param {string} coordinates
 * @return {LatLng | undefined}
 */
function parseCoordinates(coordinates) {
  const regex = /^[-+]?(?<lat>[1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(?<lng>180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
  const m = regex.exec(coordinates);
  if (m) {
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
          Math.cos(rlat1) *
            Math.cos(rlat2) *
            Math.sin(difflon / 2) *
            Math.sin(difflon / 2)
      )
    );
  return km;
}

/**
 * Returns score based on distance and scale
 * FIXME this modifies the input
 * @param {number} distance
 * @param {number} scale
 * @return {number} score
 */
function calculateScore(distance, scale) {
  return Math.round(5000 * Math.pow(0.99866017, (distance * 1000) / scale));
}

/**
 * Make game summary link
 * 
 * @param  {string} streamer
 * @param  {string} mapName
 * @param {Object} mode
 * @param  {LatLng[]} locations
 * @param  {({ username: string, flag: string, score: number, rounds: number })[]} totalScores
 * @return {Promise<string>} link
 */
async function makeLink(streamer, mapName, mode, locations, totalScores) {
  const players = totalScores.map((guess) => {
    return {
      username: guess.username,
      flag: guess.flag,
      score: guess.score,
      rounds: guess.rounds,
    };
  });

  /** @type {import("axios").AxiosResponse<{ code: string }>} */
  const res = await axios.post(`${process.env.API_URL}/game`, {
    streamer: streamer,
    map: mapName,
		mode: mode,
    locations: locations,
    players: players,
  });

  return `${process.env.BASE_URL}/game/${res.data.code}`;
}

exports.isGameURL = isGameURL;
exports.getGameId = getGameId;
exports.fetchSeed = fetchSeed;
exports.getCountryCode = getCountryCode;
exports.parseCoordinates = parseCoordinates;
exports.calculateScale = calculateScale;
exports.haversineDistance = haversineDistance;
exports.calculateScore = calculateScore;
exports.makeLink = makeLink;
