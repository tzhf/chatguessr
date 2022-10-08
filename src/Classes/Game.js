'use strict';

const pMap = require("p-map");
const GameHelper = require("../utils/GameHelper");
const store = require("../utils/sharedStore");

/** @typedef {import('../types').LatLng} LatLng */
/** @typedef {import('../types').Location} Location */
/** @typedef {import('../types').Seed} Seed */
/** @typedef {import('../types').Guess} Guess */
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
	 * @type {Seed | undefined}
	 * @private
	 */
	seed;
	/** @type {number | undefined} */
	mapScale;
	/** @type {Location | undefined} */
	location;

	isInGame = false;
	guessesOpen = false;
	isMultiGuess = false;

	/**
	 * @param {import('../utils/Database')} db
	 * @param {Settings} settings
	 */
	constructor(db, settings) {
		this.#db = db;
		this.#settings = settings;
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
			if (!this.seed) {
				throw new Error('Could not load seed for this game');
			}

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
		return this.#url ? await GameHelper.fetchSeed(this.#url) : undefined;
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

			this.#db.setUserLastLocation(guess.userId, this.location);
			
			const correct = guessedCountry === this.#country
			this.#db.setGuessCountry(guess.id, guessedCountry, correct ? guess.streak + 1 : 0);
			if (correct) {
				this.#db.addUserStreak(guess.userId, this.#roundId);
			} else {
				this.#db.resetUserStreak(guess.userId);
			}
		}, { concurrency: 10 });
	}

	/**
	 */
	async #processStreamerGuess() {
		const index = this.seed.state === "finished" ? 1 : 2;
		const streamerGuess = this.seed.player.guesses[this.seed.round - index];
		const location = { lat: streamerGuess.lat, lng: streamerGuess.lng };

		const dbUser = this.#db.getOrCreateUser('BROADCASTER', this.#settings.channelName);

		const guessedCountry = await GameHelper.getCountryCode(location);
		if (guessedCountry === this.#country) {
			this.#db.addUserStreak(dbUser.id, this.#roundId);
		} else {
			this.#db.resetUserStreak(dbUser.id);
		}

		const distance = GameHelper.haversineDistance(location, this.location);
		const score = streamerGuess.timedOut ? 0 : GameHelper.calculateScore(distance, this.mapScale);

		const streak = this.#db.getUserStreak(dbUser.id);
		
		this.#db.createGuess(this.#roundId, dbUser.id, {
			color: '#fff',
			flag: dbUser.flag,
			location,
			country: guessedCountry,
			streak: streak?.count ?? 0,
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
		const dbUser = this.#db.getOrCreateUser(userstate['user-id'], userstate['display-name']);

		const existingGuess = this.#db.getUserGuess(this.#roundId, dbUser.id);
		if (!this.isMultiGuess && existingGuess) {
			throw Object.assign(new Error('User already guessed'), { code: 'alreadyGuessed' });
		}

		if (dbUser.previousGuess && latLngEqual(dbUser.previousGuess, location)) {
			throw Object.assign(new Error('Same guess'), { code: 'pastedPreviousGuess' });
		}

		// Reset streak if the player skipped a round
		if (!dbUser.lastLocation || !latLngEqual(dbUser.lastLocation, this.lastLocation)) {
			this.#db.resetUserStreak(dbUser.id);
		}

		/** @type {string | null} */
		let guessedCountry = null;
		if (!this.isMultiGuess) {
			// TODO I think this is only used for streaks,
			// DB streaks track their own last round id so then this would be unnecessary
			this.#db.setUserLastLocation(dbUser.id, this.location);

			guessedCountry = await GameHelper.getCountryCode(location);
			if (guessedCountry === this.#country) {
				this.#db.addUserStreak(dbUser.id, this.#roundId);
			} else {
				this.#db.resetUserStreak(dbUser.id);
			}
		}

		const streak =  this.#db.getUserStreak(dbUser.id);
		const distance = GameHelper.haversineDistance(location, this.location);
		const score = GameHelper.calculateScore(distance, this.mapScale);
		let modified = false;

		userstate.color = userstate.color || "#FFF";

		// Modify guess or push it
		if (this.isMultiGuess && existingGuess) {
			this.#db.updateGuess(existingGuess.id, {
				color: userstate.color,
				flag: dbUser.flag,
				location,
				country: guessedCountry,
				streak: streak?.count ?? 0,
				distance,
				score,
			});
			modified = true;
		} else {
			this.#db.createGuess(this.#roundId, dbUser.id, {
				color: userstate.color,
				flag: dbUser.flag,
				location,
				country: guessedCountry,
				streak: streak?.count ?? 0,
				distance,
				score,
			});
		}

		// TODO save previous guess? No, fetch previous guess from the DB
		this.#db.setUserPreviousGuess(dbUser.id, location);

		// Old shape, for the scoreboard UI
		return {
			user: userstate.username,
			username: userstate["display-name"],
			color: userstate.color,
			flag: dbUser.flag,
			position: location,
			streak: streak?.count ?? 0,
			distance,
			score,
			modified,
		};
	}

	/** @returns {Location} */
	getLocation() {
		return this.seed.rounds.at(-1);
	}

	/** @returns {Location[]} */
	getLocations() {
		return this.seed.rounds.map((round) => ({
			lat: round.lat,
			lng: round.lng,
			panoId: round.panoId,
			heading: Math.round(round.heading),
			pitch: Math.round(round.pitch),
			zoom: round.zoom,
		}));
	}

	openGuesses() {
		this.guessesOpen = true;
	}

	closeGuesses() {
		this.guessesOpen = false;
	}

	/**
	 * Get the participants for the current round, sorted by who guessed first.
	 */
	getMultiGuesses() {
		return this.#db.getRoundParticipants(this.#roundId);
	}

	/**
	 * Get the scores for the current round, sorted by distance from closest to farthest away.
	 */
	getRoundScores() {
		return this.#db.getRoundScores(this.#roundId);
	}

	finishGame() {
		return this.#db.finishGame(this.seed.token);
	}

	/**
	 * Get the combined scores for the current game, sorted from highest to lowest score.
	 */
	getTotalScores() {
		return this.#db.getGameScores(this.seed.token);
	}

	get isFinished() {
		return this.seed.state === 'finished';
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
