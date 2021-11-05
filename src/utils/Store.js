const ElectronStore = require("electron-store");
const store = new ElectronStore();

const User = require("../Classes/User");
const Settings = require("../Classes/Settings");

class Store {
	/**
	 * @param {String} key
	 * @param {*} defaults
	 * @return {*} returns defaults if not found
	 */
	static get = (key, defaults) => store.get(key, defaults);

	/**
	 * @param {String} key
	 * @param {*} value
	 */
	static set = (key, value) => store.set(key, value);

	/**
	 * @param {String} key
	 */
	static delete = (key) => store.delete(key);

	//* Settings
	/**
	 * Returns stored settings or a new Settings instance
	 * @return {Settings} Settings
	 */
	static getSettings = () => {
		const storedSettings = store.get("settings");
		if (!storedSettings) {
			const settings = new Settings();
			store.set("settings", settings);
			return settings;
		} else {
			return new Settings(...Object.values(storedSettings));
		}
	};

	/**
	 * Set settings
	 * @param {Object} settings
	 */
	static setSettings = (settings) => store.set("settings", settings);

	//* Users
	/**
	 * Returns a user or a new User instance
	 * @param {String} user
	 * @param {String} username
	 * @return {User} User
	 */
	static getOrCreateUser = (user, username) => {
		user = user.toLowerCase();
		const storedUser = Store.getUser(user);
		if (!storedUser) {
			return new User(user, username);
		} else {
			return new User(...Object.values(storedUser));
		}
	};

	/**
	 * Returns a user
	 * @param {String} user
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
	 * @param {String} user
	 * @param {User} newUser
	 */
	static saveUser = (user, newUser) => store.set(`users.${user.toLowerCase()}`, newUser);

	/**
	 * Delete one user
	 * @param {String} user
	 */
	static deleteUser = (user) => store.delete(`users.${user}`);

	/**
	 * Set one user streak
	 * @param {String} user
	 * @param {number} streak
	 */
	static setUserStreak = (user, streak) => store.set(`users.${user}.streak`, streak);

	/**
	 * Add user Victory
	 * @param {String} user
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
		const storedUsers = Store.getUsers();
		if (!storedUsers) return null;

		const streak = Math.max(...Object.values(storedUsers).map((o) => o.bestStreak));
		const streakUser = Object.keys(storedUsers).filter((user) => storedUsers[user].bestStreak === streak);

		const victories = Math.max(...Object.values(storedUsers).map((o) => o.victories));
		const victoriesUser = Object.keys(storedUsers).filter((user) => storedUsers[user].victories === victories);

		const perfects = Math.max(...Object.values(storedUsers).map((o) => o.perfects));
		const perfectsUser = Object.keys(storedUsers).filter((user) => storedUsers[user].perfects === perfects);

		return {
			streak: { streak: streak, user: streakUser },
			victories: { victories: victories, user: victoriesUser },
			perfects: { perfects: perfects, user: perfectsUser },
		};
	};

	/**
	 * Clear all stats
	 */
	static clearStats = () => {
		store.delete("users");
		store.delete("lastRoundPlayers");
	};
}

module.exports = Store;
