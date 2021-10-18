const User = require("../Classes/User");
const store = require('./sharedStore');

class Store {
	/**
	 * @template {keyof store.Schema} T
	 * @param {T} key
	 * @param {store.Schema[T]} defaults
	 * @return {store.Schema[T]} returns defaults if not found
	 */
	static get(key, defaults) {
		return store.get(key, defaults);
	}

	/**
	 * @template {keyof store.Schema} T
	 * @param {T} key
	 * @param {store.Schema[T]} value
	 */
	static set(key, value) {
		store.set(key, value);
	}

	/**
	 * @param {keyof store.Schema} key
	 */
	static delete(key) {
		store.delete(key);
	}

	//* Users
	/**
	 * Returns a user or a new User instance
	 * @param {String} user
	 * @param {String} username
	 * @return {User} User
	 */
	static getOrCreateUser(user, username) {
		user = user.toLowerCase();
		const storedUser = Store.getUser(user);
		if (!storedUser) {
			return new User(user, username);
		} else {
			return new User(
				storedUser.user,
				storedUser.username,
				storedUser.flag,
				storedUser.streak,
				storedUser.bestStreak,
				storedUser.correctGuesses,
				storedUser.nbGuesses,
				storedUser.perfects,
				storedUser.victories,
				storedUser.meanScore,
				storedUser.previousGuess,
				storedUser.lastLocation,
			);
		}
	}

	/**
	 * Returns a user
	 * @param {String} user
	 * @return {User} User
	 */
	static getUser(user) {
		return store.get(`users.${user}`);
	}

	/**
	 * Get all users
	 */
	static getUsers() {
		return store.get("users");
	}

	/**
	 * Save a user
	 * @param {String} user
	 * @param {User} newUser
	 */
	static saveUser(user, newUser) {
		return store.set(`users.${user.toLowerCase()}`, newUser);
	}

	/**
	 * Delete one user
	 * @param {String} user
	 */
	static deleteUser(user) {
		// @ts-ignore https://github.com/sindresorhus/electron-store/issues/196
		return store.delete(`users.${user}`);
	}

	/**
	 * Set one user streak
	 * @param {String} user
	 * @param {number} streak
	 */
	static setUserStreak(user, streak) {
		return store.set(`users.${user}.streak`, streak);
	}

	/**
	 * Add user Victory
	 * @param {String} user
	 */
	static userAddVictory(user) {
		let victories = store.get(`users.${user}.victories`, 0);
		victories++;
		store.set(`users.${user}.victories`, victories);
	}

	/**
	 * Clear all stats
	 */
	static clearStats() {
		store.delete("users");
		store.delete("lastRoundPlayers");
	}
}

module.exports = Store;
