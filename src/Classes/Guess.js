class Guess {
	/**
	 * @param {String} user
	 * @param {String} username
	 * @param {String} color
	 * @param {String} flag
	 * @param {Object} position {lat, lng}
	 * @param {Number} streak
	 * @param {Number} distance
	 * @param {Number} score
	 * @param {Boolean} modified
	 */
	constructor(user, username, color, flag, position, streak, distance, score, modified = false) {
		this.user = user;
		this.username = username;
		this.color = color === null ? "#FFF" : color;
		this.flag = flag;
		this.position = position;
		this.streak = streak;
		this.distance = distance;
		this.score = score;
		this.modified = modified;
	}
}

module.exports = Guess;
