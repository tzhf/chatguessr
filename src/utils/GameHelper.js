const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const axios = require("axios");

// Small fix to avoid recent SSL expiration issue, remove when fixed
// const https = require("https");
// const agent = new https.Agent({
// 	rejectUnauthorized: false,
// });
// axios.defaults.httpsAgent = agent;

const CG = require("codegrid-js").CodeGrid();
const countryCodes = require("./countryCodes");
const countryCodesNames = require("./countryCodesNames");

class GameHelper {
	/**
	 * Checks if '/game/' is in the URL
	 * @param {string} url Game URL
	 * @return {boolean}
	 */
	static isGameURL = (url) => url.includes("/game/");

	/**
	 * Gets the Game ID from a game URL
	 * Checks if ID is 16 characters in length
	 * @param {string} url Game URL
	 * @return {string|boolean} id or false
	 */
	static getGameId = (url) => {
		const id = url.substring(url.lastIndexOf("/") + 1);
		if (id.length == 16) {
			return id;
		} else {
			return false;
		}
	};

	/**
	 * Fetch a game seed
	 * @param {string} url
	 * @return {Promise} Seed Promise
	 */
	static fetchSeed = async (url) => {
		return axios
			.get(`https://www.geoguessr.com/api/v3/games/${url.substring(url.lastIndexOf("/") + 1)}`)
			.then((res) => res.data)
			.catch((error) => console.log(error));
	};

	/**
	 * Returns a country code
	 * @param {Object} location {lat, lng}
	 * @return {Promise} Country code Promise
	 */
	static getCountryCode = async (location) => {
		return axios
			.get(`https://api.bigdatacloud.net/data/reverse-geocode?latitude=${location.lat}&longitude=${location.lng}&key=${process.env.BDC_KEY}`)
			.then((res) => countryCodes[res.data.countryCode])
			.catch((error) => {
				// if BDC returns an error use CodeGrid
				return new Promise((resolve, reject) => {
					CG.getCode(location.lat, location.lng, (error, code) => {
						resolve(code);
						reject(new Error(error));
					});
				}).then((code) => countryCodes[code.toUpperCase()]);
			});
	};

	/**
	 * Returns a country code
	 * It uses CodeGrid first and then BDC if needed
	 * @param {Object} location {lat, lng}
	 * @return {Promise} Country code Promise
	 */
	static getCountryCodeLocally = async (location) => {
		return new Promise((resolve, reject) => {
			let coordinates = this.getSurroundings(location);
			let promises = [];
			coordinates.forEach((coord) => {
				promises.push(this.getCountryCG(coord));
			});
			Promise.all(promises).then((values) => {
				let unique = new Set(values);
				if (unique.size === 1) {
					console.log(unique.values().next().value);
				} else {
					this.getCountryBDC(location).then((data) => resolve(data));
				}
			});
		});
	};

	/**
	 * Returns a country code (Only using BDC)
	 * Do not use externally - Used by getCountryCodeLocally
	 * Ultimately we will call our own API here and remove/
	 * replace getCountryCode
	 * @param {Object} location {lat, lng}
	 * @return {Promise} Country code Promise
	 */
	static getCountryBDC = async (location) => {
		return axios
			.get(`https://api.bigdatacloud.net/data/reverse-geocode?latitude=${location.lat}&longitude=${location.lng}&key=${process.env.BDC_KEY}`)
			.then((res) => countryCodes[res.data.countryCode])
			.catch((error) => error);
	};

	/**
	 * Returns a country code (Only using CodeGrid)
	 * Do not use externally - Used by getCountryCodeLocally
	 * @param {Object} location {lat, lng}
	 * @return {Promise} Country code Promise
	 */
	static getCountryCG = (location) => {
		return new Promise((resolve, reject) => {
			CG.getCode(location.lat, location.lng, (error, code) => {
				if (error) {
					reject(new Error(error));
				} else {
					resolve(countryCodes[code.toUpperCase()]);
				}
			});
		});
	};

	/**
	 * Returns an array of 9 coodinates as objects.
	 * Each coordinate is 100 meters aways from the given
	 * coordinate y angles from 0 to 315
	 * The first coordinate is the original passed
	 * @param {Object} location {lat, lng}
	 * @return {Array} Coordinates [{lat, lng}, {lat, lng}] x 8
	 */
	static getSurroundings = (location) => {
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
			coordinates.push(moveFrom({ lat: location.lat, lng: location.lng }, angle, meters));
		}
		return coordinates;
	};

	/**
	 * Check if the param is coordinates
	 * @param {string} coordinates
	 * @return {boolean}
	 */
	static isCoordinates = (coordinates) => {
		const regex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/g;
		return regex.test(coordinates);
	};

	/**
	 * Returns map scale
	 * @param {Object} bounds map bounds
	 * @return {number} map scale
	 */
	static calculateScale = (bounds) =>
		GameHelper.haversineDistance({ lat: bounds.min.lat, lng: bounds.min.lng }, { lat: bounds.max.lat, lng: bounds.max.lng }) / 7.458421;

	/**
	 * Returns distance in km between two coordinates
	 * @param {Object} mk1 {lat, lng}
	 * @param {Object} mk2 {lat, lng}
	 * @return {number} km
	 */
	static haversineDistance = (mk1, mk2) => {
		const R = 6371.071;
		const rlat1 = mk1.lat * (Math.PI / 180);
		const rlat2 = mk2.lat * (Math.PI / 180);
		const difflat = rlat2 - rlat1;
		const difflon = (mk2.lng - mk1.lng) * (Math.PI / 180);
		const km =
			2 *
			R *
			Math.asin(Math.sqrt(Math.sin(difflat / 2) * Math.sin(difflat / 2) + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)));
		return km;
	};

	/**
	 * Returns score based on distance and scale
	 * @param {number} distance
	 * @param {number} scale
	 * @return {number} score
	 */
	static calculateScore = (distance, scale) => Math.round(5000 * Math.pow(0.99866017, (distance * 1000) / scale));

	/**
	 * Returns guesses sorted by distance ASC
	 * @param {array} guesses
	 * @return {array} guesses
	 */
	static sortByDistance = (guesses) => guesses.sort((a, b) => a.distance - b.distance);

	/**
	 * Returns guesses sorted by score DESC
	 * @param {array} guesses
	 * @return {array} guesses
	 */
	static sortByScore = (guesses) => guesses.sort((a, b) => b.score - a.score);

	/** Converts a country code into an emoji flag
	 * @param {String} value
	 */
	static toEmojiFlag = (value) => {
		if (value.length == 2) {
			return value.toUpperCase().replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
		} else {
			const flag = value
				.toUpperCase()
				.substring(0, 2)
				.replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
			const region = value
				.toUpperCase()
				.substring(2)
				.replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397) + " ");
			return `${flag} ${region}`.trim();
		}
	};

	/** Replace special chars
	 * @param {String} val
	 */
	static normalize = (val) => val.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

	/** Matches words above 3 letters
	 * @param {String} input
	 * @param {String} key
	 */
	static isMatch = (input, key) => input.length >= 3 && key.includes(input) && input.length <= key.length;

	/** Find country by code or name
	 * @param {String} input
	 * @return {Object} countryCodesNames
	 */
	static findCountry = (input) => {
		const normalized = GameHelper.normalize(input);
		return countryCodesNames.find((country) => country.code === normalized || GameHelper.isMatch(normalized, country.names.toLowerCase()));
	};

	/** Return a random country code
	 * @return {String}
	 */
	static getRandomFlag = () => countryCodesNames[Math.floor(Math.random() * countryCodesNames.length)].code;

	/** Make game summary link
	 * @param  {string} streamer
	 * @param  {string} mapName
	 * @param  {Object[]} locations
	 * @param  {Object[]} scores
	 * @return {Promise} link
	 */
	static makeLink = (streamer, mapName, locations, totalScores) => {
		const players = totalScores.map((guess) => {
			return { username: guess.username, flag: guess.flag, score: guess.score, rounds: guess.rounds };
		});

		return axios
			.post(`${process.env.API_URL}/game`, {
				streamer: streamer,
				map: mapName,
				locations: locations,
				players: players,
			})
			.then((res) => {
				return `${process.env.BASE_URL}/game/${res.data.code}`;
			})
			.catch((err) => {
				console.log(err);
			});
	};
}

module.exports = GameHelper;
