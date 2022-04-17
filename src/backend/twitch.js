const { EventEmitter } = require("events");
const TwitchClient = require("tmi.js").Client;

class TwitchBackend extends EventEmitter {
	/** @type {TwitchClient} */
	#tmi;

	#closing = false;

	/** @type {string} */
	botUsername;
	/** @type {string} */
	channelName;

	/**
	 * @param {object} options
	 * @param {string} options.botUsername
	 * @param {string} options.channelName
	 * @param {string} options.whisperToken
	 */
	constructor(options) {
		super();

		this.botUsername = options.botUsername;
		this.channelName = options.channelName;

		this.#tmi = new TwitchClient({
			options: { debug: true, messagesLogLevel: "info" },
			connection: {
				secure: true,
				reconnect: false,
			},
			identity: {
				username: this.botUsername,
				password: `oauth:${options.whisperToken}`,
			},
			channels: [this.channelName],
		});

		this.#tmi.on("connected", () => {
			this.emit("connected");
		});

		this.#tmi.on("disconnected", () => {
			this.emit("disconnected", this.#closing);
		});

		this.#tmi.on("whisper", (_from, userstate, message, self) => {
			if (self) return;
			this.emit("guess", userstate, message);
		});

		this.#tmi.on("message", (_channel, userstate, message, self) => {
			if (self) return;
			this.emit("message", userstate, message);
		});
	}

	async connect() {
		await this.#tmi.connect();
	}

	async close() {
		this.#closing = true;
		await this.#tmi.disconnect();
	}

	isConnected() {
		return this.#tmi.readyState() === "OPEN";
	}

	/**
	 * @param {string} message
	 * @param {{ system?: boolean }} [options]
	 */
	async sendMessage(message, options = {}) {
		if (options.system) {
			await this.#tmi.action(this.channelName, message);
		} else {
			await this.#tmi.say(this.channelName, message);
		}
	}
}

module.exports = TwitchBackend;
