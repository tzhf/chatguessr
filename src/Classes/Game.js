const GameHelper = require("../utils/GameHelper");
const Store = require("../utils/Store");
const Guess = require("./Guess");

class Game {
	constructor() {
		this.win;
		this.settings;
		this.url;
		this.seed;
		this.mapScale;
		this.location;
		this.country;
		this.isInGame = false;
		this.guessesOpen = false;
		this.isMultiGuess = false;
		this.guesses = [];
		this.total = [];
		this.lastRoundPlayers;
	}

	init = (win, settings) => {
		this.win = win;
		this.settings = settings;
		this.lastRoundPlayers = Store.get("lastRoundPlayers", []);
	};

	start = async (url, isMultiGuess) => {
		this.isInGame = true;
		this.isMultiGuess = isMultiGuess;
		if (this.url === url) {
			this.refreshSeed();
		} else {
			this.url = url;
			this.seed = await this.getSeed();
			this.mapScale = GameHelper.calculateScale(this.seed.bounds);
			this.getCountry();
			this.clearGuesses();
		}
	};

	outGame = () => {
		this.isInGame = false;
		this.closeGuesses();
	};

	streamerHasguessed = (newSeed) => newSeed.player.guesses.length != this.seed.player.guesses.length;

	locHasChanged = (newSeed) => JSON.stringify(newSeed.rounds[newSeed.rounds.length - 1]) != JSON.stringify(this.getLocation());

	refreshSeed = async () => {
		const newSeed = await this.getSeed();
		// If a guess has been comitted, process streamer guess then return scores
		if (this.streamerHasguessed(newSeed)) {
			this.win.webContents.send("pre-round-results");
			this.closeGuesses();
			this.seed = newSeed;

			const location = this.location;
			const scores = await this.makeGuess().then(() => this.getRoundScores());
			return { location, scores };
			// Else, if only the loc has changed, the location was skipped, replace current loc
		} else if (this.locHasChanged(newSeed)) {
			this.seed = newSeed;
			this.getCountry();
			return false;
		}
	};

	getSeed = async () => await GameHelper.fetchSeed(this.url);

	getCountry = async () => {
		this.location = this.getLocation();
		this.country = await GameHelper.getCountryCode(this.location);
	};

	makeGuess = async () => {
		this.seed = await this.getSeed();

		if (this.isMultiGuess) await this.processMultiGuesses();
		const streamerGuess = await this.processStreamerGuess();

		this.guesses.push(streamerGuess);
		this.guesses.forEach((guess) => this.pushToTotal(guess));

		this.checkUsersStreak();

		if (this.seed.state != "finished") {
			this.getCountry();
		}
	};

	processMultiGuesses = () => {
		let promises = [];
		this.guesses.forEach(async (guess, index) => {
			promises.push(
				new Promise(async (resolve, reject) => {
					const guessedCountry = await GameHelper.getCountryCode(guess.position);
					guessedCountry === this.country ? guess.streak++ : (guess.streak = 0);
					this.guesses[index].streak = guess.streak;
					Store.setUserStreak(guess.user, guess.streak);
					resolve();
				})
			);
		});
		return Promise.all(promises);
	};

	processStreamerGuess = async () => {
		const index = this.seed.state === "finished" ? 1 : 2;
		const streamerGuess = this.seed.player.guesses[this.seed.round - index];
		const location = { lat: streamerGuess.lat, lng: streamerGuess.lng };

		const streamer = Store.getOrCreateUser(this.settings.channelName, this.settings.channelName);
		const guessedCountry = await GameHelper.getCountryCode(location);
		guessedCountry === this.country ? streamer.addStreak() : streamer.setStreak(0);

		const distance = GameHelper.haversineDistance(location, this.location);
		const score = streamerGuess.timedOut ? 0 : GameHelper.calculateScore(distance, this.mapScale);
		if (score == 5000) streamer.perfects++;
		streamer.calcMeanScore(score);

		streamer.nbGuesses++;
		Store.saveUser(this.settings.channelName, streamer);

		return new Guess(streamer.username, streamer.username, "#FFF", streamer.flag, location, streamer.streak, distance, score);
	};

	handleUserGuess = async (userstate, location) => {
		const index = this.hasGuessedThisRound(userstate.username);

		if (!this.isMultiGuess && index != -1) return "alreadyGuessed";

		const user = Store.getOrCreateUser(userstate.username, userstate["display-name"]);
		if (this.hasPastedPreviousGuess(user.previousGuess, location)) return "pastedPreviousGuess";

		if (!this.isMultiGuess) {
			const guessedCountry = await GameHelper.getCountryCode(location);
			guessedCountry === this.country ? user.addStreak() : user.setStreak(0);
		}

		const distance = GameHelper.haversineDistance(location, this.location);
		const score = GameHelper.calculateScore(distance, this.mapScale);
		if (score == 5000) user.perfects++;
		user.calcMeanScore(score);

		const guess = new Guess(userstate.username, userstate["display-name"], userstate.color, user.flag, location, user.streak, distance, score);

		// Modify guess or push it
		if (this.isMultiGuess && index != -1) {
			this.guesses[index] = guess;
			this.guesses[index].modified = true;
		} else {
			user.nbGuesses++;
			this.guesses.push(guess);
		}

		user.previousGuess = location;
		Store.saveUser(userstate.username, user);

		return { user: user, guess: guess };
	};

	nextRound = () => {
		this.guesses = [];
		if (this.seed.state != "finished") {
			this.win.webContents.send("next-round", this.isMultiGuess);
		} else {
			this.win.webContents.send("final-results");
		}
	};

	checkUsersStreak = () => {
		this.lastRoundPlayers = this.guesses.map((a) => a.user);
		Store.set("lastRoundPlayers", this.lastRoundPlayers);

		const users = Store.getUsers();
		if (!users) return;
		Object.keys(users).forEach((user) => {
			if (!this.lastRoundPlayers.includes(user)) Store.setUserStreak(user, 0);
		});
	};

	getLocation = () => this.seed.rounds[this.seed.round - 1];

	getLocations = () => this.seed.rounds;

	openGuesses = () => {
		this.guessesOpen = true;
	};

	closeGuesses = () => {
		this.guessesOpen = false;
	};

	clearGuesses = () => {
		this.guesses = [];
		this.total = [];
	};

	/**
	 * @param {string} user
	 * @return {Number} index
	 */
	hasGuessedThisRound = (user) => this.guesses.findIndex((e) => e.user === user);

	/**
	 * @param  {Object} previousGuess
	 * @param  {Object} location {lat, lng}
	 * @return {boolean}
	 */
	hasPastedPreviousGuess = (previousGuess, location) => {
		if (previousGuess === null) return false;
		return previousGuess.lat === location.lat && previousGuess.lng === location.lng;
	};

	/**
	 * @param  {Object} guess
	 */
	pushToTotal = (guess) => {
		const index = this.total.findIndex((e) => e.user === guess.user);
		if (index != -1) {
			this.total[index].score += guess.score;
			this.total[index].distance += guess.distance;
			this.total[index].streak = guess.streak;
			this.total[index].color = guess.color;
			this.total[index].flag = guess.flag;
			this.total[index].guessedRounds++;
		} else {
			this.total.push({ ...guess, guessedRounds: 1 });
		}
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

	get mapName() {
		return this.seed.mapName;
	}

	get round() {
		return this.seed.round;
	}

	get nbGuesses() {
		return this.guesses.length;
	}
}

module.exports = Game;
