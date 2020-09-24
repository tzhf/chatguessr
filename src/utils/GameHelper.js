const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const axios = require("axios");
// const CG = require("codegrid-js").CodeGrid();
const countryCodes = require("./countryCodes");

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
	 * Return a country code
	 * @param {Object} location {lat, lng}
	 * @return {Promise} Country code Promise
	 */
	static getCountryCode = async (location) => {
		return axios
			.get(`https://api.bigdatacloud.net/data/reverse-geocode?latitude=${location.lat}&longitude=${location.lng}&key=${process.env.BDC_KEY}`)
			.then((res) => countryCodes[res.data.countryCode])
			.catch((error) => console.log(error));

		// return axios
		// 	.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&result_type=country&key=${process.env.GMAPS_KEY}`)
		// 	.then((res) => countryCodes[res.data.results[0].address_components[0].short_name])
		// 	.catch((error) => console.log(error));

		// return new Promise((resolve, reject) => {
		// 	CG.getCode(location.lat, location.lng, (error, code) => {
		// 		resolve(code);
		// 		reject(new Error(error));
		// 	});
		// }).then((code) => countryCodes[code.toUpperCase()]);
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
	 * Return map scale
	 * @param {Object} bounds map bounds
	 * @return {number} map scale
	 */
	static calculateScale = (bounds) =>
		GameHelper.haversineDistance({ lat: bounds.min.lat, lng: bounds.min.lng }, { lat: bounds.max.lat, lng: bounds.max.lng }) / 7.458421;

	/**
	 * Return distance in km between two coordinates
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
			Math.asin(
				Math.sqrt(Math.sin(difflat / 2) * Math.sin(difflat / 2) + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2))
			);
		return km;
	};

	/**
	 * Return score based on distance and scale
	 * @param {number} distance
	 * @param {number} scale
	 * @return {number} score
	 */
	static calculateScore = (distance, scale) => Math.round(5000 * Math.pow(0.99866017, (distance * 1000) / scale));

	/**
	 * Return guesses sorted by distance ASC
	 * @param {array} guesses
	 * @return {array} guesses
	 */
	static sortByDistance = (guesses) => guesses.sort((a, b) => a.distance - b.distance);

	/**
	 * Return guesses sorted by score DESC
	 * @param {array} guesses
	 * @return {array} guesses
	 */
	static sortByScore = (guesses) => guesses.sort((a, b) => b.score - a.score);
}

module.exports = GameHelper;
