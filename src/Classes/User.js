class User {
	/**
	 * @param {String} user
	 * @param {String} username
	 * @param {String} flag=""
	 * @param {Number} streak=0
	 * @param {Number} bestStreak=0
	 * @param {Number} correctGuesses=0
	 * @param {Number} nbGuesses=0
	 * @param {Number} perfects=0
	 * @param {Number} victories=0
	 * @param {Number} meanScore=null
	 * @param {Object} previousGuess=null
	 */
	constructor(
		user,
		username,
		flag = "",
		streak = 0,
		bestStreak = 0,
		correctGuesses = 0,
		nbGuesses = 0,
		perfects = 0,
		victories = 0,
		meanScore = null,
		previousGuess = null
	) {
		this.user = user;
		this.username = username;
		this.flag = flag;
		this.streak = streak;
		this.bestStreak = bestStreak;
		this.correctGuesses = correctGuesses;
		this.nbGuesses = nbGuesses;
		this.perfects = perfects;
		this.victories = victories;
		this.meanScore = meanScore;
		this.previousGuess = previousGuess;
	}

	/* Add 1 to streak and correctGuesses. */
	addStreak() {
		this.streak++;
		this.correctGuesses++;
		if (this.streak > this.bestStreak) this.bestStreak = this.streak;
	}

	/** Set user streak
	 * @param {Number} number
	 */
	setStreak(number) {
		this.streak = number;
		if (this.streak > this.bestStreak) this.bestStreak = this.streak;
	}

	/** Set previous guess
	 * @param {Object} location
	 */
	setPreviousGuess(location) {
		this.previousGuess = location;
	}

	/** Set a country flag
	 * @param {String} flag country code
	 */
	setFlag(flag) {
		this.flag = flag;
	}

	/** Calculate mean score
	 * @param {Number} score
	 */
	calcMeanScore(score) {
		if (this.meanScore === null) {
			this.meanScore = score;
		} else {
			this.meanScore = (this.meanScore * this.nbGuesses + score) / (this.nbGuesses + 1);
		}
	}
}

module.exports = User;
