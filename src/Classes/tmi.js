const TMI = require("tmi.js");

class tmi {
	/**
	 * @param {string} channelName 
	 * @param {string} botUsername 
	 * @param {string} token 
	 */
	constructor(channelName, botUsername, token) {
		this.channelName = channelName;
		this.botUsername = botUsername;
		this.token = token;
		/** @type {TMI.Client} */
		this.client;
		this.init();
	}

	init() {
		const options = {
			options: { debug: true, messagesLogLevel: "info" },
			connection: {
				secure: true,
				reconnect: true,
			},
			identity: {
				username: this.botUsername,
				password: this.token,
			},
			channels: [this.channelName],
		};

		this.client = new TMI.Client(options);
	}

	/**
	 * @param {string} message
	 */
	say(message) {
		return this.client.say(this.channelName, message);
	}

	/**
	 * @param {string} message
	 */
	action(message) {
		return this.client.action(this.channelName, message);
	}
}

module.exports = tmi;