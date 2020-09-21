const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Guess = require("./Guess");
const User = require("./User");

const Store = require("electron-store");
const store = new Store();
const axios = require("axios");

// const CG = require("codegrid-js").CodeGrid();
const countryCodes = require("./countryCodes");

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
		this.previousGuesses = store.get("previousGuesses", [[], []]);
	};

	fetchSeed = async (url) => {
		return axios
			.get(`https://www.geoguessr.com/api/v3/games/${url.substring(url.lastIndexOf("/") + 1)}`)
			.then((res) => res.data)
			.catch((error) => console.log(error));
	};

	getCurrentLocation = (i = 1) => {
		return {
			lat: this.seed.rounds[this.seed.round - i].lat,
			lng: this.seed.rounds[this.seed.round - i].lng,
		};
	};

	startGame = async (url) => {
		this.url = url;
		this.seed = await this.fetchSeed(this.url);
		this.mapScale = this.calculateScale(this.seed.bounds);
		this.currentLocation = this.getCurrentLocation();
		this.country = await this.getCountryCode(this.currentLocation);
		this.inGame = true;
	};

	outGame = () => {
		this.inGame = false;
		this.closeGuesses();
	};

	openGuesses = () => (this.guessesOpen = true);
	closeGuesses = () => (this.guessesOpen = false);

	processUserGuess = async (userstate, message) => {
		if (!this.isCoordinates(message)) return;
		if (this.hasGuessedThisRound(userstate.username, this.guesses)) return "alreadyGuessed";
		const guessLocation = { lat: Number.parseFloat(message.split(",")[0]), lng: Number.parseFloat(message.split(",")[1]) };
		if (this.hasPastedPreviousGuess(userstate.username, guessLocation)) return "pastedPreviousGuess";

		const user = this.getOrCreateUser(userstate.username, userstate["display-name"]);
		const guessedCountry = await this.getCountryCode(guessLocation);
		guessedCountry === this.country ? user.addStreak() : user.setStreak(0);

		const distance = this.haversineDistance(guessLocation, this.currentLocation);
		const score = this.calculateScore(distance, this.mapScale);
		if (score == 5000) user.nbPerfect++;
		user.calcMeanScore(score);

		user.nbGuesses++;
		store.set(`users.${userstate.username}`, user);

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
					const newSeed = await this.fetchSeed(this.url);
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
		const streamer = this.getOrCreateUser(channelName, channelName);
		const streamerGuess = this.seed.player.guesses[this.seed.round - i];
		const guessLocation = { lat: streamerGuess.lat, lng: streamerGuess.lng };

		const guessedCountry = await this.getCountryCode(guessLocation);
		guessedCountry === this.country ? streamer.addStreak() : streamer.setStreak(0);

		const distance = this.haversineDistance(guessLocation, this.getCurrentLocation(i));
		let score = this.calculateScore(distance, this.mapScale);
		if (streamerGuess.timedOut) score = 0;
		if (score == 5000) streamer.nbPerfect++;
		streamer.calcMeanScore(score);

		streamer.nbGuesses++;
		store.set(`users.${channelName}`, streamer);

		const guess = new Guess(channelName, channelName, "#FF000", streamer.streak, guessLocation, distance, score);
		this.guesses.push(guess);
		this.pushToTotal(guess);

		// this.previousGuesses[1].push({ username: channelName });
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
		this.country = await this.getCountryCode(this.currentLocation);
		console.log("next country: " + this.country);
		this.guesses = [];
	};

	clearGuesses = () => {
		this.guesses = [];
		this.total = [];
	};

	getCountryCode = async (location) => {
		return axios
			.get(`https://api.bigdatacloud.net/data/reverse-geocode?latitude=${location.lat}&longitude=${location.lng}&key=${process.env.BDC_KEY}`)
			.then((res) => countryCodes[res.data.countryCode])
			.catch((error) => console.log(error));

		// return axios
		// 	.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&result_type=country&key=${process.env.GMAPS_KEY}`)
		// 	.then((res) => countryCodes[res.data.results[0].address_components[0].short_name])
		// 	.catch((error) => console.log(error));

		// return new Promise((resolve, reject) => {
		// 	CG.getCode(location.lat, location.lng, (error, code) => {
		// 		resolve(code);
		// 		reject(new Error(error));
		// 	});
		// }).then((code) => countryCodes[code.toUpperCase()]);
	};

	getOrCreateUser = (user, username) => {
		const storedUser = store.get(`users.${user}`);
		if (!storedUser) {
			return new User(user, username);
		} else {
			return new User(...Object.values(storedUser));
		}
	};

	checkUsersStreak = () => {
		this.previousGuesses[0] = this.previousGuesses[1];
		this.previousGuesses[1] = [];
		store.set("previousGuesses", this.previousGuesses);
		const users = store.get("users");
		if (users) {
			Object.keys(users).forEach((user) => {
				if (!this.previousGuesses[0].some((previousGuess) => previousGuess.username === user)) store.set(`users.${user}.streak`, 0);
			});
		}
	};

	hasGuessedThisRound = (user, guesses) => guesses.some((guess) => guess.user === user);
	isCoordinates = (coordinates) => coordinates.match(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/g);
	hasPastedPreviousGuess = (username, guessLocation) => {
		return (
			this.previousGuesses[0].filter(
				(previousGuess) => previousGuess.username === username && previousGuess.guessLocation.lat === guessLocation.lat && previousGuess.guessLocation.lng === guessLocation.lng
			).length > 0
		);
	};

	haversineDistance = (mk1, mk2) => {
		const R = 6371.071;
		const rlat1 = mk1.lat * (Math.PI / 180);
		const rlat2 = mk2.lat * (Math.PI / 180);
		const difflat = rlat2 - rlat1;
		const difflon = (mk2.lng - mk1.lng) * (Math.PI / 180);
		const km = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat / 2) * Math.sin(difflat / 2) + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)));
		return km;
	};
	calculateScale = (bounds) => this.haversineDistance({ lat: bounds.min.lat, lng: bounds.min.lng }, { lat: bounds.max.lat, lng: bounds.max.lng }) / 7.458421;
	calculateScore = (distance, scale) => Math.round(5000 * Math.pow(0.99866017, (distance * 1000) / scale));
	sortByDistance = (guesses) => guesses.sort((a, b) => a.distance - b.distance);
	sortByScore = (guesses) => guesses.sort((a, b) => b.score - a.score);
	getSortedTotal = () => this.sortByScore(this.total);
	getSortedGuesses = () => this.sortByDistance(this.guesses);
}

module.exports = Game;
