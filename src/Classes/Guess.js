class Guess {
	/**
	 * @param {string} user
	 * @param {string} username
	 * @param {string} color
	 * @param {number} streak
	 * @param {Object} position {lat, lng}
	 * @param {number} distance
	 * @param {number} score
	 */
	constructor(user, username, color, streak, position, distance, score) {
		this.user = user;
		this.username = username;
		this.color = color;
		this.streak = streak;
		this.position = position;
		this.distance = distance;
		this.score = score;
	}
}

module.exports = Guess;
