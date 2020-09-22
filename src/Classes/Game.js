const Store = require("../utils/Store");
const GameHelper = require("../utils/GameHelper");
// const CG = require("codegrid-js").CodeGrid();
const Guess = require("./Guess");

class Game {
	constructor() {
		this.inGame = false;
		this.url;
		this.seed;
		this.mapScale;
		this.country;
		this.currentLocation;
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

	startGame = async (url) => {
		this.url = url;
		this.seed = await GameHelper.fetchSeed(this.url);
		this.mapScale = GameHelper.calculateScale(this.seed.bounds);
		this.currentLocation = this.getCurrentLocation();
		this.country = await GameHelper.getCountryCode(this.currentLocation);
		this.inGame = true;
	};

	outGame = () => {
		this.inGame = false;
		this.closeGuesses();
	};

	openGuesses = () => (this.guessesOpen = true);

	closeGuesses = () => (this.guessesOpen = false);

	processUserGuess = async (userstate, guessLocation) => {
		const user = Store.getOrCreateUser(userstate.username, userstate["display-name"]);
		const guessedCountry = await GameHelper.getCountryCode(guessLocation);
		guessedCountry === this.country ? user.addStreak() : user.setStreak(0);

		const distance = GameHelper.haversineDistance(guessLocation, this.currentLocation);
		const score = GameHelper.calculateScore(distance, this.mapScale);
		if (score == 5000) user.nbPerfect++;
		user.calcMeanScore(score);

		user.nbGuesses++;
		Store.saveUser(userstate.username, user);

		const guess = new Guess(userstate.username, userstate["display-name"], userstate.color, user.streak, guessLocation, distance, score);
		this.guesses.push(guess);
		this.pushToTotal(guess);

		this.previousGuesses[1].push({ username: userstate.username, guessLocation });
		return { guess: guess, nbGuesses: this.guesses.length };
	};

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

	processStreamerGuess = async (channelName) => {
		let i = 2;
		if (this.seed.state === "finished") i = 1;
		const streamer = Store.getOrCreateUser(channelName, channelName);
		const streamerGuess = this.seed.player.guesses[this.seed.round - i];
		const guessLocation = { lat: streamerGuess.lat, lng: streamerGuess.lng };

		const guessedCountry = await GameHelper.getCountryCode(guessLocation);
		guessedCountry === this.country ? streamer.addStreak() : streamer.setStreak(0);

		const distance = GameHelper.haversineDistance(guessLocation, this.getCurrentLocation(i));
		let score = GameHelper.calculateScore(distance, this.mapScale);
		if (streamerGuess.timedOut) score = 0;
		if (score == 5000) streamer.nbPerfect++;
		streamer.calcMeanScore(score);

		streamer.nbGuesses++;
		Store.saveUser(channelName, streamer);

		const guess = new Guess(channelName, channelName, "#FF000", streamer.streak, guessLocation, distance, score);
		this.guesses.push(guess);
		this.pushToTotal(guess);

		this.previousGuesses[1].push({ username: channelName });
		this.checkUsersStreak();
	};

	pushToTotal = (guess) => {
		const index = this.total.findIndex((e) => e.user === guess.user);
		if (index != -1) {
			this.total[index].score += guess.score;
			this.total[index].distance += guess.distance;
			this.total[index].streak = guess.streak;
			this.total[index].nbGuesses++;
		} else {
			guess.nbGuesses = 1;
			this.total.push(guess);
		}
	};

	nextRound = async () => {
		this.currentLocation = this.getCurrentLocation();
		this.country = await GameHelper.getCountryCode(this.currentLocation);
		console.log("next country: " + this.country);
		this.guesses = [];
	};

	clearGuesses = () => {
		this.guesses = [];
		this.total = [];
	};

	checkUsersStreak = () => {
		this.previousGuesses[0] = this.previousGuesses[1];
		this.previousGuesses[1] = [];
		Store.set("previousGuesses", this.previousGuesses);
		const users = Store.getUsers();
		if (users) {
			Object.keys(users).forEach((user) => {
				if (!this.previousGuesses[0].some((previousGuess) => previousGuess.username === user)) Store.setUserStreak(user, 0);
			});
		}
	};

	getCurrentLocation = (i = 1) => {
		return {
			lat: this.seed.rounds[this.seed.round - i].lat,
			lng: this.seed.rounds[this.seed.round - i].lng,
		};
	};

	getRound = () => this.seed.round;

	hasGuessedThisRound = (user) => this.guesses.some((guess) => guess.user === user);

	hasPastedPreviousGuess = (username, guessLocation) => {
		return (
			this.previousGuesses[0].filter(
				(previousGuess) => previousGuess.username === username && previousGuess.guessLocation.lat === guessLocation.lat && previousGuess.guessLocation.lng === guessLocation.lng
			).length > 0
		);
	};

	getSortedTotal = () => GameHelper.sortByScore(this.total);

	getSortedGuesses = () => GameHelper.sortByDistance(this.guesses);
}

module.exports = Game;
