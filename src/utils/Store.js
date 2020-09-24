const ElectronStore = require("electron-store");
const store = new ElectronStore();

const User = require("../Classes/User");
const Settings = require("../Classes/Settings");

class Store {
	/**
	 * @param {string} key
	 * @param {*} defaults
	 * @return {*} returns defaults if not found
	 */
	static get = (key, defaults) => store.get(key, defaults);

	/**
	 * @param {string} key
	 * @param {*} value
	 */
	static set = (key, value) => store.set(key, value);

	/**
	 * @param  {string} key
	 */
	static delete = (key) => store.delete(key);

	//* Settings
	/**
	 * Returns stored settings or a new Settings instance
	 * @return {Settings} Settings
	 */
	static getSettings = () => {
		const storedSettings = store.get("settings");
		if (!storedSettings) return new Settings();
		return new Settings(...Object.values(storedSettings));
	};

	/**
	 * Set settings
	 * @param {Object} settings
	 */
	static setSettings = (settings) => store.set("settings", settings);

	//* Users
	/**
	 * Returns a user or a new User instance
	 * @param {string} user
	 * @param {string} username
	 * @return {User} User
	 */
	static getOrCreateUser = (user, username) => {
		const storedUser = this.getUser(user);
		if (!storedUser) {
			return new User(user, username);
		} else {
			return new User(...Object.values(storedUser));
		}
	};

	/**
	 * Returns a user
	 * @param {string} user
	 * @return {User} User
	 */
	static getUser = (user) => store.get(`users.${user}`);

	/**
	 * Get all users
	 * @return {User[]} Users
	 */
	static getUsers = () => store.get("users");

	/**
	 * Save a user
	 * @param {string} user
	 * @param {User} newUser
	 */
	static saveUser = (user, newUser) => store.set(`users.${user}`, newUser);

	/**
	 * Delete one user
	 * @param {string} user
	 */
	static deleteUser = (user) => store.delete(`users.${user}`);

	/**
	 * Set one user streak
	 * @param {string} user
	 * @param {number} streak
	 */
	static setUserStreak = (user, streak) => store.set(`users.${user}.streak`, streak);

	/**
	 * Add user Victory
	 * @param {string} user
	 */
	static userAddVictory = (user) => {
		let victories = store.get(`users.${user}.victories`, 0);
		victories++;
		store.set(`users.${user}.victories`, victories);
	};

	/**
	 * Returns best stats
	 * @return {Object} collection
	 */
	static getBest = () => {
		const storedUsers = this.getUsers();
		if (!storedUsers) return null;
		const streak = Math.max(...Object.values(storedUsers).map((o) => o.bestStreak));
		const streakUser = Object.keys(storedUsers).filter((user) => storedUsers[user].bestStreak === streak);

		const meanScore = Math.max(...Object.values(storedUsers).map((o) => o.meanScore));
		const meanScoreUser = Object.keys(storedUsers).filter((user) => storedUsers[user].meanScore === meanScore);

		const victories = Math.max(...Object.values(storedUsers).map((o) => o.victories));
		const victoriesUser = Object.keys(storedUsers).filter((user) => storedUsers[user].victories === victories);

		const best = {
			streak: { streak: streak, user: streakUser },
			meanScore: { meanScore: meanScore, user: meanScoreUser },
			victories: { victories: victories, user: victoriesUser },
		};
		return best;
	};

	/**
	 * Clear all stats
	 */
	static clearStats = () => {
		store.delete("users");
		store.delete("stats");
		store.delete("previousGuesses");
	};

	//* Scoreboard
	/**
	 * Returns defaults if not found
	 * @param {Object} defaults
	 * @return {Object} position
	 */
	static getScoreboardPosition = (defaults) => store.get("scoreboard.postion", defaults);

	/**
	 * Store scoreboard position
	 * @param {Object} key { top, left, width, height }
	 */
	static setScoreboardPosition = (position) => store.set("scoreboard.postion", position);
}

module.exports = Store;
