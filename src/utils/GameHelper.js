const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const axios = require("axios").default;

const CG = require("codegrid-js").CodeGrid();
/** @type {Record<string, string>} */
// @ts-ignore
const countryCodes = require("./countryCodes");

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
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode');
  url.searchParams.append('latitude', `${location.lat}`);
  url.searchParams.append('longitude', `${location.lng}`);
  url.searchParams.append('key', process.env.BDC_KEY);

  try {
    /** @type {import("axios").AxiosResponse<{ countryCode: string }>} */
    const res = await axios.get(url.toString());
    return countryCodes[res.data.countryCode];
  } catch {
    const code = await new Promise((resolve, reject) => {
      CG.getCode(location.lat, location.lng, (error, code) => {
        if (error) {
          reject(new Error(error))
        } else {
          resolve(code);
        }
      });
    });
    return countryCodes[code.toUpperCase()];
  }
}

/**
 * Returns a country code
 * It uses CodeGrid first and then BDC if needed
 * @param {LatLng} location
 * @return {Promise<string>} Country code Promise
 */
async function getCountryCodeLocally(location) {
  let coordinates = getSurroundings(location);
  const values = await Promise.all(coordinates.map(getCountryCG));
  let unique = new Set(values);
  if (unique.size === 1) {
    return values[0];
  }
  return getCountryBDC(location);
}

/**
 * Returns a country code (Only using BDC)
 * Do not use externally - Used by getCountryCodeLocally
 * Ultimately we will call our own API here and remove/
 * replace getCountryCode
 * @param {LatLng} location
 * @return {Promise<string>} Country code Promise
 */
async function getCountryBDC(location) {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode');
  url.searchParams.append('latitude', `${location.lat}`);
  url.searchParams.append('longitude', `${location.lng}`);
  url.searchParams.append('key', process.env.BDC_KEY);

  /** @type {import("axios").AxiosResponse<{ countryCode: string }>} */
  const res = await axios.get(url.toString());
  return countryCodes[res.data.countryCode];
}

/**
 * Returns a country code (Only using CodeGrid)
 * Do not use externally - Used by getCountryCodeLocally
 * @param {LatLng} location
 * @return {Promise<string>} Country code Promise
 */
function getCountryCG(location) {
  return new Promise((resolve, reject) => {
    CG.getCode(location.lat, location.lng, (error, code) => {
      if (error) {
        reject(new Error(error));
      } else {
        resolve(countryCodes[code.toUpperCase()]);
      }
    });
  });
}

/**
 * Returns an array of 9 coodinates as objects.
 * Each coordinate is 100 meters aways from the given
 * coordinate y angles from 0 to 315
 * The first coordinate is the original passed
 * @param {LatLng} location
 * @returns Coordinates [{lat, lng}, {lat, lng}] x 8
 */
function getSurroundings(location) {
  const meters = 100;
  const R_EARTH = 6378.137;
  const M = 1 / (((2 * Math.PI) / 360) * R_EARTH) / 1000;

  function moveFrom(coords, angle, distance) {
    let radianAngle = (angle * Math.PI) / 180;
    let x = 0 + distance * Math.cos(radianAngle);
    let y = 0 + distance * Math.sin(radianAngle);
    let newLat = coords.lat + y * M;
    let newLng = coords.lng + (x * M) / Math.cos(coords.lat * (Math.PI / 180));
    return { lat: newLat, lng: newLng };
  }
  let coordinates = [location];
  for (let angle = 0; angle < 360; angle += 45) {
    coordinates.push(
      moveFrom({ lat: location.lat, lng: location.lng }, angle, meters)
    );
  }
  return coordinates;
}

/**
 * Check if the param is coordinates
 * @param {string} coordinates
 * @return {boolean}
 */
function isCoordinates(coordinates) {
  const regex =
    /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/g;
  return regex.test(coordinates);
}

/**
 * Returns map scale
 * @param {import("../types").Bounds} bounds map bounds
 * @return {number} map scale
 */
function calculateScale(bounds) {
  return (
    haversineDistance(
      { lat: bounds.min.lat, lng: bounds.min.lng },
      { lat: bounds.max.lat, lng: bounds.max.lng }
    ) / 7.458421
  );
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
 * Returns guesses sorted by distance ASC
 * FIXME this modifies the input
 * @template {{ distance: number }} T
 * @param {T[]} guesses
 * @return {T[]} guesses
 */
function sortByDistance(guesses) {
  return guesses.sort((a, b) => a.distance - b.distance);
}

/**
 * Returns guesses sorted by score DESC
 * FIXME this modifies the input
 * @template {{ score: number }} T
 * @param {T[]} guesses
 * @return {T[]} guesses
 */
function sortByScore(guesses) {
  return guesses.sort((a, b) => b.score - a.score);
}

/**
 * Make game summary link
 * 
 * @param  {string} streamer
 * @param  {string} mapName
 * @param {Object} mode
 * @param  {LatLng[]} locations
 * @param  {(Guess & { rounds: number })[]} totalScores
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
exports.getCountryBDC = getCountryBDC;
exports.getCountryCG = getCountryCG;
exports.getCountryCodeLocally = getCountryCodeLocally;
exports.getSurroundings = getSurroundings;
exports.isCoordinates = isCoordinates;
exports.calculateScale = calculateScale;
exports.haversineDistance = haversineDistance;
exports.calculateScore = calculateScore;
exports.sortByDistance = sortByDistance;
exports.sortByScore = sortByScore;
exports.makeLink = makeLink;
