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
 * @prop {boolean} showGuessChanged
 * @prop {boolean} showSubmittedPreviousGuess
 * @prop {boolean} isMultiGuess
 * @prop {number} guessMarkersLimit
 */

class Settings {
    /** @param {Partial<SettingsProps>} settings */
    constructor({
        channelName = "",
        token = "",
        cgCmd = "!cg",
        cgCmdCooldown = 30,
        cgMsg = `Two ways to play: 
1. Login with Twitch, make your guess and press guess (spacebar). 
2. Paste the command into chat without editing: <your cg link>`,
        userGetStatsCmd = "!me",
        userClearStatsCmd = "!clear",
        showHasGuessed = true,
        showHasAlreadyGuessed = true,
        showGuessChanged = true,
        showSubmittedPreviousGuess = true,
        isMultiGuess = false,
        guessMarkersLimit = 100,
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
        this.showGuessChanged = showGuessChanged;
        this.showSubmittedPreviousGuess = showSubmittedPreviousGuess;
        this.isMultiGuess = isMultiGuess;
        this.guessMarkersLimit = guessMarkersLimit;
    }

    /**
     * @param {{ isMultiGuess: boolean, guessMarkersLimit: number, cgCmd: string, cgMsg: string, cgCmdCooldown: number, userGetStats: string, userClearStats: string, showHasGuessed: boolean, showHasAlreadyGuessed: boolean, showGuessChanged: boolean, showSubmittedPreviousGuess: boolean }} globalSettings
     */
    saveGlobalSettings(globalSettings) {
        this.isMultiGuess = globalSettings.isMultiGuess;
        this.guessMarkersLimit = globalSettings.guessMarkersLimit;
        this.cgCmd = globalSettings.cgCmd;
        this.cgCmdCooldown = globalSettings.cgCmdCooldown;
        this.cgMsg = globalSettings.cgMsg;
        this.userGetStatsCmd = globalSettings.userGetStats;
        this.userClearStatsCmd = globalSettings.userClearStats;
        this.showHasGuessed = globalSettings.showHasGuessed;
        this.showHasAlreadyGuessed = globalSettings.showHasAlreadyGuessed;
        this.showGuessChanged = globalSettings.showGuessChanged;
        this.showSubmittedPreviousGuess = globalSettings.showSubmittedPreviousGuess;
        this.#save();
    }

    /**
     * @param {string} channelName
     */
    saveTwitchSettings(channelName) {
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
            showGuessChanged: this.showGuessChanged,
            showSubmittedPreviousGuess: this.showSubmittedPreviousGuess,
            isMultiGuess: this.isMultiGuess,
            guessMarkersLimit: this.guessMarkersLimit,
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
