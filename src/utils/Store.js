const ElectronStore = require("electron-store");
const store = new ElectronStore();

const User = require("../Classes/User");
const Settings = require("../Classes/Settings");

class Store {
	/**
	 * Get stored object, returns defaults if not found
	 * @param {string} arg
	 * @param {*} defaults
	 */
	static get = (key, defaults) => store.get(key, defaults);

	/**
	 * Set new store value
	 * @param {string} key
	 * @param {*} value
	 */
	static set = (key, value) => store.set(key, value);

	/**
	 * Returns stored settings or a new Settings instance
	 * @returns {Settings} Settings
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

	/**
	 * Returns a user
	 * @param {string} user
	 * @returns {User} User
	 */
	static getUser = (user) => store.get(`users.${user}`);

	/**
	 * Returns a user or a new User instance
	 * @param {string} user
	 * @param {string} username
	 * @returns {User} User
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
	 * Save a user
	 * @param {string} user
	 * @param {Object} newUser
	 */
	static saveUser = (user, newUser) => store.set(`users.${user}`, newUser);

	/**
	 * Get all users
	 * @returns {Array<User>} Users
	 */
	static getUsers = () => store.get("users");

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
	 * Clear all stats
	 */
	static clearStats = () => {
		store.delete("users");
		store.delete("stats");
		store.delete("previousGuesses");
	};
}

module.exports = Store;
