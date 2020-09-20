class User {
	constructor(user, username, streak = 0, bestStreak = 0, correctGuesses = 0, nbGuesses = 0, nbPerfect = 0, meanScore = null) {
		this.user = user;
		this.username = username;
		this.streak = streak;
		this.bestStreak = bestStreak;
		this.correctGuesses = correctGuesses;
		this.nbGuesses = nbGuesses;
		this.nbPerfect = nbPerfect;
		this.meanScore = meanScore;
	}

	addStreak() {
		this.streak++;
		this.correctGuesses++;
		if (this.streak > this.bestStreak) this.bestStreak = this.streak;
	}

	setStreak(number) {
		this.streak = number;
		if (this.streak > this.bestStreak) this.bestStreak = this.streak;
	}

	calcMeanScore(score) {
		if (this.meanScore === null) {
			this.meanScore = score;
		} else {
			this.meanScore = (this.meanScore * this.nbGuesses + score) / (this.nbGuesses + 1);
		}
	}
}

module.exports = User;
