class Guess {
	/**
	 * @param {string} user
	 * @param {string} username
	 * @param {string} color
	 * @param {string} flag
	 * @param {{ lat: number, lng: number }} position {lat, lng}
	 * @param {number} streak
	 * @param {number} distance
	 * @param {number} score
	 * @param {boolean} modified
	 */
	constructor(user, username, color, flag, position, streak, distance, score, modified = false) {
		/** @type {string} */
		this.user = user;
		/** @type {string} */
		this.username = username;
		/** @type {string} */
		this.color = color === null ? "#FFF" : color;
		/** @type {string} */
		this.flag = flag;
		/** @type {{ lat: number, lng: number }} */
		this.position = position;
		/** @type {number} */
		this.streak = streak;
		/** @type {number} */
		this.distance = distance;
		/** @type {number} */
		this.score = score;
		/** @type {boolean} */
		this.modified = modified;
	}
}

module.exports = Guess;