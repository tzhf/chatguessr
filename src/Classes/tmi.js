const { Client } = require("tmi.js");

class TMI {
	/**
	 * @param {string} channelName 
	 * @param {string} botUsername 
	 * @param {string} token 
	 */
	constructor(channelName, botUsername, token) {
		this.channelName = channelName;
		this.botUsername = botUsername;
		this.token = token;

		this.client = new Client({
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
		});
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

module.exports = TMI;