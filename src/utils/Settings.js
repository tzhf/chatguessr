"use strict";

const store = require("./sharedStore");

/**
 * @typedef {object} SettingsProps
 * @prop {string} channelName
 * @prop {string} token
 * @prop {string} cgCmd
 * @prop {number} cgCmdCooldown
 * @prop {string} cgMsg
 * @prop {string} userGetStatsCmd
 * @prop {string} userClearStatsCmd
 * @prop {boolean} showHasGuessed
 * @prop {boolean} showHasAlreadyGuessed
 * @prop {boolean} isMultiGuess
 */

class Settings {
	/** @param {Partial<SettingsProps>} settings */
	constructor({
		channelName = "",
		token = "",
		cgCmd = "!cg",
		cgCmdCooldown = 30,
		cgMsg = "Two ways to play: 1. Login with Twitch, make your guess and press guess (spacebar). 2. Paste the command into chat without editing: <your cg link>",
		userGetStatsCmd = "!me",
		userClearStatsCmd = "!clear",
		showHasGuessed = true,
		showHasAlreadyGuessed = true,
		isMultiGuess = false,
	} = {}) {
		this.channelName = channelName;
		this.token = token;
		this.cgCmd = cgCmd;
		this.cgCmdCooldown = cgCmdCooldown;
		this.cgMsg = cgMsg;
		this.userGetStatsCmd = userGetStatsCmd;
		this.userClearStatsCmd = userClearStatsCmd;
		this.showHasGuessed = showHasGuessed;
		this.showHasAlreadyGuessed = showHasAlreadyGuessed;
		this.isMultiGuess = isMultiGuess;
	}

	/**
	 * @param {boolean} isMultiGuess
	 */
	setGameSettings(isMultiGuess) {
		this.isMultiGuess = isMultiGuess;
		this.#save();
	}

	/**
	 * @param {{ cgCmdd: string, cgMsgg: string, cgCmdCooldown: number, userGetStats: string, userClearStats: string, showHasGuessed: boolean, showHasAlreadyGuessed: boolean }} commands
	 */
	setTwitchCommands(commands) {
		this.cgCmd = commands.cgCmdd;
		this.cgCmdCooldown = commands.cgCmdCooldown;
		this.cgMsg = commands.cgMsgg;
		this.userGetStatsCmd = commands.userGetStats;
		this.userClearStatsCmd = commands.userClearStats;
		this.showHasGuessed = commands.showHasGuessed;
		this.showHasAlreadyGuessed = commands.showHasAlreadyGuessed;
		this.#save();
	}

	/**
	 * @param {string} channelName
	 */
	setTwitchSettings(channelName) {
		this.channelName = channelName;
		this.#save();
	}

	toJSON() {
		return {
			channelName: this.channelName,
			token: this.token,
			cgCmd: this.cgCmd,
			cgCmdCooldown: this.cgCmdCooldown,
			cgMsg: this.cgMsg,
			userGetStatsCmd: this.userGetStatsCmd,
			userClearStatsCmd: this.userClearStatsCmd,
			showHasGuessed: this.showHasGuessed,
			showHasAlreadyGuessed: this.showHasAlreadyGuessed,
			isMultiGuess: this.isMultiGuess,
		};
	}

	static read() {
		return new Settings(store.get("settings"));
	}

	#save() {
		store.set("settings", this.toJSON());
	}
}

module.exports = Settings;
