const Store = require("../utils/Store");
const GameHelper = require("../utils/GameHelper");
const Guess = require("./Guess");

class Game {
	constructor() {
		this.isInGame = false;
		this.isMultiGuess = true;
		this.url;
		this.seed;
		this.mapScale;
		this.country;
		this.location;
		this.guesses = [];
		this.total = [];
		this.previousGuesses;
		this.guessesOpen = false;
		this.init();
	}

	init = () => {
		// TODO change all this previousGuesses implementation
		this.previousGuesses = Store.get("previousGuesses", [[], []]);
	};

	/**
	 * @param  {string} url
	 */
	startGame = async (url) => {
		this.clearGuesses();
		this.url = url;
		this.seed = await GameHelper.fetchSeed(this.url);
		this.mapScale = GameHelper.calculateScale(this.seed.bounds);
		this.location = this.getLocation();
		this.country = await GameHelper.getCountryCode(this.location);
		this.isInGame = true;
	};

	nextRound = async () => {
		this.location = this.getLocation();
		this.country = await GameHelper.getCountryCode(this.location);
		console.log("next country: " + this.country);
		this.guesses = [];
	};

	outGame = () => {
		this.isInGame = false;
		this.closeGuesses();
	};

	openGuesses = () => (this.guessesOpen = true);

	closeGuesses = () => (this.guessesOpen = false);

	clearGuesses = () => {
		this.guesses = [];
		this.total = [];
	};

	/**
	 * @param {Object} userstate
	 * @param {Object} userGuess {lat, lng}
	 * @return {Promise} {Guess, nbGuesses}
	 */
	processUserGuess = async (userstate, userGuess) => {
		const index = this.hasGuessedThisRound(userstate.username);
		if (!this.isMultiGuess && index != -1) return "alreadyGuessed";
		if (this.hasPastedPreviousGuess(userstate.username, userGuess)) return "pastedPreviousGuess";

		const user = Store.getOrCreateUser(userstate.username, userstate["display-name"]);
		const guessedCountry = await GameHelper.getCountryCode(userGuess);
		guessedCountry === this.country ? user.addStreak() : user.setStreak(0);

		const distance = GameHelper.haversineDistance(userGuess, this.location);
		const score = GameHelper.calculateScore(distance, this.mapScale);
		if (score == 5000) user.perfects++;
		user.calcMeanScore(score);

		user.nbGuesses++;
		Store.saveUser(userstate.username, user);

		const guess = new Guess(userstate.username, userstate["display-name"], userstate.color, user.streak, userGuess, distance, score);

		// Modify guess or push it
		if (this.isMultiGuess && index != -1) {
			this.guesses[index] = guess;
			this.guesses[index].guessChanged = true;
		} else {
			this.guesses.push(guess);
		}

		this.previousGuesses[1].push(guess);
		return { guess: guess, nbGuesses: this.guesses.length };
	};

	/**
	 * @param  {string} channelName
	 */
	makeGuess = (channelName) => {
		return new Promise((resolve, reject) => {
			let i = 1;
			const fetchNextRound = () => {
				setTimeout(async () => {
					const newSeed = await GameHelper.fetchSeed(this.url);
					if (i <= 30 && newSeed.round === this.seed.round && newSeed.state != "finished") {
						console.log(`fetched round ${newSeed.round}. Same round. Try again`);
						fetchNextRound();
						i++;
					} else {
						this.seed = newSeed;
						this.processStreamerGuess(channelName).then(() => resolve());
					}
				}, 100);
			};
			fetchNextRound();
		});
	};

	/**
	 * @param  {string} channelName
	 */
	processStreamerGuess = async (channelName) => {
		let i = 2;
		if (this.seed.state === "finished") i = 1;
		const streamer = Store.getOrCreateUser(channelName, channelName);
		const streamerGuess = this.seed.player.guesses[this.seed.round - i];
		const guessPosition = { lat: streamerGuess.lat, lng: streamerGuess.lng };

		const guessedCountry = await GameHelper.getCountryCode(guessPosition);
		guessedCountry === this.country ? streamer.addStreak() : streamer.setStreak(0);

		const distance = GameHelper.haversineDistance(guessPosition, this.getLocation(i));
		let score = GameHelper.calculateScore(distance, this.mapScale);
		if (streamerGuess.timedOut) score = 0;
		if (score == 5000) streamer.perfects++;
		streamer.calcMeanScore(score);

		streamer.nbGuesses++;
		Store.saveUser(channelName, streamer);

		const guess = new Guess(channelName, channelName, "#4ddb7c", streamer.streak, guessPosition, distance, score);
		this.guesses.push(guess);

		this.guesses.forEach((guess) => this.pushToTotal(guess));

		this.previousGuesses[1].push({ user: channelName });
		this.checkUsersStreak();
	};

	/**
	 * @param  {Guess} guess
	 */
	pushToTotal = (guess) => {
		const index = this.total.findIndex((e) => e.user === guess.user);
		if (index != -1) {
			this.total[index].score += guess.score;
			this.total[index].distance += guess.distance;
			this.total[index].streak = guess.streak;
			this.total[index].guessedRounds++;
		} else {
			this.total.push({ ...guess, guessedRounds: 1 });
		}
	};

	getLocation = (i = 1) => {
		return {
			lat: this.seed.rounds[this.seed.round - i].lat,
			lng: this.seed.rounds[this.seed.round - i].lng,
		};
	};

	checkUsersStreak = () => {
		this.previousGuesses[0] = this.previousGuesses[1];
		this.previousGuesses[1] = [];
		Store.set("previousGuesses", this.previousGuesses);
		const users = Store.getUsers();
		if (!users) return;
		Object.keys(users).forEach((user) => {
			if (!this.previousGuesses[0].some((previousGuess) => previousGuess.user === user)) Store.setUserStreak(user, 0);
		});
	};

	/**
	 * @param {string} user
	 * @return {number} index
	 */
	hasGuessedThisRound = (user) => this.guesses.findIndex((e) => e.user === user);

	/**
	 * @param  {string} user
	 * @param  {Object} position {lat, lng}
	 * @return {boolean}
	 */
	hasPastedPreviousGuess = (user, position) => {
		const filter = (guess) => guess.user === user && guess.position.lat === position.lat && guess.position.lng === position.lng;
		if (this.isMultiGuess) return this.guesses.filter(filter).length > 0;
		return this.previousGuesses[0].filter(filter).length > 0;
	};

	/**
	 * @return {Guess[]} sorted guesses by Distance
	 */
	getRoundScores = () => GameHelper.sortByDistance(this.guesses);

	/**
	 * @return {Guess[]} sorted guesses by Score
	 */
	getTotalScores() {
		const scores = GameHelper.sortByScore(this.total);
		// TODO: Remember to check equality
		Store.userAddVictory(scores[0].user);
		return scores;
	}

	/**
	 * @param {boolean} bool
	 */
	setMultiGuess = (bool) => (this.isMultiGuess = bool);

	get mapName() {
		return this.seed.mapName;
	}

	get round() {
		return this.seed.round;
	}

	get currentLoc() {
		return this.location;
	}
}

module.exports = Game;
