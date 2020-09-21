class GameHelper {
	/**
	 * Checks if '/game/' is in the URL
	 * On fail it returns false
	 * @param {string} url Game URL
	 */
	static isGameURL = (url) => url.includes("/game/");

	/**
	 * Gets the Game ID from a game URL
	 * Checks if ID is 16 characters in length
	 * On fail it returns false
	 * @param {string} url Game URL
	 */
	static getGameId = (url) => {
		let id = url.substring(url.lastIndexOf("/") + 1);
		if (id.length == 16) {
			return id;
		} else {
			return false;
		}
	};

	/**
	 * Check if the param is coordinates
	 * On fail it returns false
	 * @param {string} coordinates
	 */
	static isCoordinates = (coordinates) => coordinates.match(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/g);

	/**
	 * Returns scale
	 * @param {Object} bounds map bounds
	 */
	static calculateScale = (bounds) => this.haversineDistance({ lat: bounds.min.lat, lng: bounds.min.lng }, { lat: bounds.max.lat, lng: bounds.max.lng }) / 7.458421;

	/**
	 * Returns distance in km between two coordinates
	 * @param {Object} mk1 {lat, lng}
	 * @param {Object} mk2 {lat, lng}
	 */
	static haversineDistance = (mk1, mk2) => {
		const R = 6371.071;
		const rlat1 = mk1.lat * (Math.PI / 180);
		const rlat2 = mk2.lat * (Math.PI / 180);
		const difflat = rlat2 - rlat1;
		const difflon = (mk2.lng - mk1.lng) * (Math.PI / 180);
		const km = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat / 2) * Math.sin(difflat / 2) + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)));
		return km;
	};

	/**
	 * Returns score based on distance and scale
	 * @param {number} distance
	 * @param {number} scale
	 */
	static calculateScore = (distance, scale) => Math.round(5000 * Math.pow(0.99866017, (distance * 1000) / scale));

	/**
	 * Returns sorted guesses by distance ASC
	 * @param {array} guesses
	 */
	static sortByDistance = (guesses) => guesses.sort((a, b) => a.distance - b.distance);

	/**
	 * Returns sorted guesses by score DESC
	 * @param {array} guesses
	 */
	static sortByScore = (guesses) => guesses.sort((a, b) => b.score - a.score);
}

module.exports = GameHelper;
