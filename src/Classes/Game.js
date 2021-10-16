const pMap = require("p-map");
const GameHelper = require("../utils/GameHelper");
const store = require("../utils/sharedStore");
const Store = require("../utils/Store");
const legacyStoreFacade = require('../utils/legacyStoreFacade');

/** @typedef {import('../types').LatLng} LatLng */
/** @typedef {import('../types').Seed} Seed */
/** @typedef {import('../types').Guess} Guess */
/** @typedef {import("../Windows/MainWindow")} MainWindow */
/** @typedef {import('../utils/Settings')} Settings */

/**
 * @param {LatLng} a
 * @param {LatLng} b
 */
function latLngEqual(a, b) {
	return a.lat === b.lat && a.lng === b.lng;
}

class Game {
	/** @type {import('../utils/Database')} */
	#db;

	/**
	 * Play link for the current game.
	 * 
	 * @type {string|undefined}
	 */
	#url;

	/** @type {Settings} */
	#settings;

	/**
	 * The database UUID of the current round.
	 * 
	 * @type {string|undefined}
	 */
	#roundId;

	/**
	 * Country code for the current round's location.
	 * 
	 * @type {string|undefined}
	 */
	#country;

	/**
	 * @param {import('../utils/Database')} db
	 * @param {MainWindow} win
	 * @param {Settings} settings
	 */
	constructor(db, win, settings) {
		this.#db = db;
		this.win = win;
		this.#settings = settings;
		/** @type {Seed} */
		this.seed;
		/** @type {number} */
		this.mapScale;
		/** @type {LatLng} */
		this.location;
		this.isInGame = false;
		this.guessesOpen = false;
		this.isMultiGuess = false;
		/** @type {LatLng | undefined} */
		this.lastLocation = store.get("lastLocation", undefined);
	}

	/**
	 * 
	 * @param {string} url 
	 * @param {boolean} isMultiGuess 
	 */
	async start(url, isMultiGuess) {
		this.isInGame = true;
		this.isMultiGuess = isMultiGuess;
		if (this.#url === url) {
			await this.refreshSeed();
		} else {
			this.#url = url;
			this.seed = await this.#getSeed();

			try {
				this.#db.createGame(this.seed);
				this.#roundId = this.#db.createRound(this.seed.token, this.seed.rounds[0]);
			} catch (err) {
				// In this case we are restoring an existing game.
				if (err.message.includes('UNIQUE constraint failed: games.id')) {
					this.#roundId = this.#db.getCurrentRound(this.seed.token);
				} else {
					throw err;
				}
			}

			this.mapScale = GameHelper.calculateScale(this.seed.bounds);
			this.#getCountry();
		}
	}

	outGame() {
		this.isInGame = false;
		this.closeGuesses();
	}

	/** @param {Seed} newSeed */
	#streamerHasGuessed(newSeed) {
		return newSeed.player.guesses.length != this.seed.player.guesses.length;
	}

	/** @param {Seed} newSeed */
	#locHasChanged(newSeed) {
		return !latLngEqual(newSeed.rounds.at(-1), this.getLocation());
	}

	async refreshSeed() {
		const newSeed = await this.#getSeed();
		// If a guess has been comitted, process streamer guess then return scores
		if (this.#streamerHasGuessed(newSeed)) {
			this.win.webContents.send("pre-round-results"); // TODO maybe the renderer side can figure this out on its own
			this.closeGuesses();

			this.seed = newSeed;
			const location = this.location;
			await this.#makeGuess();

			const scores = this.getRoundScores();

			if (this.seed.state !== "finished") {
				this.#roundId = this.#db.createRound(this.seed.token, this.seed.rounds.at(-1));
				this.#getCountry();
			} else {
				this.#roundId = undefined;
			}

			return { location, scores };
			// Else, if only the loc has changed, the location was skipped, replace current loc
		} else if (this.#locHasChanged(newSeed)) {
			this.seed = newSeed;
			this.#roundId = this.#db.createRound(this.seed.token, this.seed.rounds.at(-1));

			this.#getCountry();

			return false;
		}
	}

	async #getSeed() {
		return await GameHelper.fetchSeed(this.#url);
	}

	async #getCountry() {
		this.location = this.getLocation();
		this.#country = await GameHelper.getCountryCode(this.location);

		this.#db.setRoundCountry(this.#roundId, this.#country);
	}

	async #makeGuess() {
		this.seed = await this.#getSeed();

		if (this.isMultiGuess) {
			await this.#processMultiGuesses();
		}
		await this.#processStreamerGuess();

		this.lastLocation = { ...this.location };
		store.set("lastLocation", this.lastLocation);
	}

	/**
	 * Update streaks for multi-guesses.
	 */
	async #processMultiGuesses() {
		// TODO only retrieve location and streak values
		const guesses = this.#db.getRoundScores(this.#roundId);
		await pMap(guesses, async (guess) => {
			const guessedCountry = await GameHelper.getCountryCode(guess.position);
			const streak = guessedCountry === this.#country ? guess.streak + 1 : 0;
			this.#db.setGuessCountry(guess.id, guessedCountry, streak);
			Store.setUserStreak(guess.user, guess.streak);
		}, { concurrency: 10 });
	}

	/**
	 */
	async #processStreamerGuess() {
		const index = this.seed.state === "finished" ? 1 : 2;
		const streamerGuess = this.seed.player.guesses[this.seed.round - index];
		const location = { lat: streamerGuess.lat, lng: streamerGuess.lng };

		const { user, dbUser } = legacyStoreFacade.getOrMigrateUser(this.#db, 'BROADCASTER', this.#settings.channelName, this.#settings.channelName);

		const guessedCountry = await GameHelper.getCountryCode(location);
		if (guessedCountry === this.#country) {
			user.addStreak();
		} else {
			user.setStreak(0);
		}

		const distance = GameHelper.haversineDistance(location, this.location);
		const score = streamerGuess.timedOut ? 0 : GameHelper.calculateScore(distance, this.mapScale);
		if (score == 5000) user.perfects++;
		user.calcMeanScore(score);

		user.nbGuesses++;
		Store.saveUser(this.#settings.channelName, user);
		
		this.#db.createGuess(this.#roundId, dbUser.id, {
			color: '#fff',
			flag: user.flag,
			location,
			country: guessedCountry,
			streak: user.streak,
			distance,
			score,
		});
	}

	/**
	 * 
	 * @param {import("tmi.js").ChatUserstate} userstate 
	 * @param {LatLng} location
	 */
	async handleUserGuess(userstate, location) {
		const { user, dbUser } = legacyStoreFacade.getOrMigrateUser(this.#db, userstate['user-id'], userstate.username, userstate['display-name']);

		const existingGuess = this.#db.getUserGuess(this.#roundId, dbUser.id);
		if (!this.isMultiGuess && existingGuess) {
			throw Object.assign(new Error('User already guessed'), { code: 'alreadyGuessed' });
		}

		
		if (dbUser.previousGuess && latLngEqual(dbUser.previousGuess, location)) {
			throw Object.assign(new Error('Same guess'), { code: 'pastedPreviousGuess' });
		}

		// Reset streak if the player skipped a round
		if (!dbUser.lastLocation || !latLngEqual(dbUser.lastLocation, this.lastLocation)) {
			user.setStreak(0);
		}

		const guessedCountry = await GameHelper.getCountryCode(location);
		if (!this.isMultiGuess) {
			if (guessedCountry === this.#country) {
				user.addStreak()
			} else {
				user.setStreak(0);
			}
		}

		const distance = GameHelper.haversineDistance(location, this.location);
		const score = GameHelper.calculateScore(distance, this.mapScale);

		// Modify guess or push it
		if (this.isMultiGuess && existingGuess) {
			this.#db.updateGuess(existingGuess.id, {
				color: userstate.color,
				flag: user.flag,
				location,
				country: guessedCountry,
				streak: user.streak,
				distance,
				score,
			});
		} else {
			user.nbGuesses++;
			this.#db.createGuess(this.#roundId, dbUser.id, {
				color: userstate.color,
				flag: user.flag,
				location,
				country: guessedCountry,
				streak: user.streak,
				distance,
				score,
			});
		}
		
		this.#db.setUserLastLocation(dbUser.id, this.location);

		if (score == 5000) {
			user.perfects++;
		}
		user.calcMeanScore(score);
		user.setLastLocation({ lat: this.location.lat, lng: this.location.lng });
		user.setPreviousGuess(location);

		Store.saveUser(userstate.username, user);

		// Old shape, for the scoreboard UI
		const guess = {
			user: userstate.username,
			username: userstate["display-name"],
			color: userstate.color,
			flag: user.flag,
			position: location,
			streak: user.streak,
			distance,
			score,
			modified: false,
		};
		return { user, guess };
	}

	getLocation() {
		const round = this.seed.rounds.at(-1);
		if (round) {
			return { lat: round.lat, lng: round.lng };
		}
	}

	getLocations() {
		return this.seed.rounds.map((round) => ({
			lat: round.lat,
			lng: round.lng,
			heading: Math.round(round.heading),
			pitch: Math.round(round.pitch),
		}));
	}

	openGuesses() {
		this.guessesOpen = true;
	}

	closeGuesses() {
		this.guessesOpen = false;
	}

	/**
	 * 
	 */
	getMultiGuesses() {
		return this.#db.getRoundParticipants(this.#roundId);
	}

	/**
	 * @return {Guess[]} sorted guesses by Distance
	 */
	getRoundScores() {
		return this.#db.getRoundScores(this.#roundId);
	}

	/**
	 * @return {(Omit<Guess, 'position' | 'modified'> & { rounds: number })[]} sorted guesses by Score
	 */
	getTotalScores() {
		const scores = this.#db.getGameScores(this.seed.token);
		// TODO: Remember to check equality
		Store.userAddVictory(scores[0].user);
		return scores;
	}

	get mapName() {
		return this.seed.mapName;
	}

	get mode() {
		return { noMove: this.seed.forbidMoving, noPan: this.seed.forbidRotating, noZoom: this.seed.forbidZooming };
	}

	get round() {
		return this.seed.round;
	}
}

module.exports = Game;
