class User {
	/**
	 * @param  {string} user
	 * @param  {string} username
	 * @param  {number} streak=0
	 * @param  {number} bestStreak=0
	 * @param  {number} correctGuesses=0
	 * @param  {number} nbGuesses=0
	 * @param  {number} perfects=0
	 * @param  {number} victories=0
	 * @param  {number} meanScore=null
	 */
	constructor(user, username, streak = 0, bestStreak = 0, correctGuesses = 0, nbGuesses = 0, perfects = 0, victories = 0, meanScore = null) {
		this.user = user;
		this.username = username;
		this.streak = streak;
		this.bestStreak = bestStreak;
		this.correctGuesses = correctGuesses;
		this.nbGuesses = nbGuesses;
		this.perfects = perfects;
		this.victories = victories;
		this.meanScore = meanScore;
	}

	/**
	 * Add 1 to streak and correctGuesses.
	 */
	addStreak() {
		this.streak++;
		this.correctGuesses++;
		if (this.streak > this.bestStreak) this.bestStreak = this.streak;
	}

	/**
	 * Set user streak
	 * @param {Number} number
	 */
	setStreak(number) {
		this.streak = number;
		if (this.streak > this.bestStreak) this.bestStreak = this.streak;
	}

	/**
	 * Calculate mean score
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
