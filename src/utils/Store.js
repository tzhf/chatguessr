const ElectronStore = require("electron-store");
const store = new ElectronStore();

const User = require("../Classes/User");
const Settings = require("../Classes/Settings");

class Store {
	static get = (arg, defaults) => store.get(arg, defaults);

	static set = (key, value) => store.set(key, value);

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
	 */
	static getUser = (user) => store.get(`users.${user}`);

	/**
	 * Returns a user or create one
	 * @param {string} user
	 * @param {string} username
	 */
	static getOrCreateUser = (user, username) => {
		const storedUser = this.getUser(user);
		if (!storedUser) {
			return new User(user, username);
		} else {
			return new User(...Object.values(storedUser));
		}
	};

	static saveUser = (user, newUser) => store.set(`users.${user}`, newUser);

	static getUsers = () => store.get("users");

	static deleteUser = (user) => store.delete(`users.${user}`);

	static setUserStreak = (user, streak) => store.set(`users.${user}.streak`, streak);

	static clearStats = () => {
		store.delete("users");
		store.delete("stats");
		store.delete("previousGuesses");
	};
}

module.exports = Store;
