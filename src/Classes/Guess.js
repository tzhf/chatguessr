class Guess {
	/**
	 * @param {string} user
	 * @param {string} username
	 * @param {string} color
	 * @param {string} flag
	 * @param {Object} position {lat, lng}
	 * @param {number} distance
	 * @param {number} score
	 * @param {number} streak
	 */
	constructor(user, username, color, flag, position, distance, score, streak) {
		this.user = user;
		this.username = username;
		this.color = color === null ? "#FFFFFF" : color;
		this.flag = flag;
		this.position = position;
		this.distance = distance;
		this.score = score;
		this.streak = streak;
	}
}

module.exports = Guess;
