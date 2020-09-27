class Guess {
	/**
	 * @param {string} user
	 * @param {string} username
	 * @param {string} color
	 * @param {Object} position {lat, lng}
	 * @param {number} distance
	 * @param {number} score
	 * @param {number} streak
	 */
	constructor(user, username, color, position, distance, score, streak) {
		this.user = user;
		this.username = username;
		this.color = color;
		this.position = position;
		this.distance = distance;
		this.score = score;
		this.streak = streak;
	}
}

module.exports = Guess;
