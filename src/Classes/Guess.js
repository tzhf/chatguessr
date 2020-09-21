class Guess {
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
