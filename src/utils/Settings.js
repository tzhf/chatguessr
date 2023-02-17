"use strict";

const store = require("./sharedStore");

/**
 * @typedef {object} SettingsProps
 * @prop {string} channelName
 * @prop {string} token
 * @prop {string} cgCmd
 * @prop {number} cgCmdCooldown
 * @prop {string} cgMsg
 * @prop {string} flagsCmd
 * @prop {string} flagsCmdMsg
 * @prop {string} getUserStatsCmd
 * @prop {string} clearUserStatsCmd
 * @prop {string} randomPlonkCmd
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
        flagsCmd = "!flags",
        flagsCmdMsg = "chatguessr.com/flags",
        getUserStatsCmd = "!me",
        clearUserStatsCmd = "!clear",
        randomPlonkCmd = "!randomplonk",
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
        this.flagsCmd = flagsCmd;
        this.flagsCmdMsg = flagsCmdMsg;
        this.getUserStatsCmd = getUserStatsCmd;
        this.clearUserStatsCmd = clearUserStatsCmd;
        this.randomPlonkCmd = randomPlonkCmd;
        this.showHasGuessed = showHasGuessed;
        this.showHasAlreadyGuessed = showHasAlreadyGuessed;
        this.showGuessChanged = showGuessChanged;
        this.showSubmittedPreviousGuess = showSubmittedPreviousGuess;
        this.isMultiGuess = isMultiGuess;
        this.guessMarkersLimit = guessMarkersLimit;
    }

    /**
     * @param {{
     * cgCmd: string,
     * cgCmdCooldown: number,
     * cgMsg: string,
     * flagsCmd: string,
     * flagsCmdMsg: string,
     * clearUserStatsCmd: string,
     * getUserStatsCmd: string,
     * randomPlonkCmd: string,
     * showHasGuessed: boolean,
     * showHasAlreadyGuessed: boolean,
     * showGuessChanged: boolean,
     * showSubmittedPreviousGuess: boolean,
     * isMultiGuess: boolean,
     * guessMarkersLimit: number
     * }} globalSettings
     */
    saveGlobalSettings(globalSettings) {
        this.cgCmd = globalSettings.cgCmd;
        this.cgCmdCooldown = globalSettings.cgCmdCooldown;
        this.cgMsg = globalSettings.cgMsg;
        this.flagsCmd = globalSettings.flagsCmd;
        this.flagsCmdMsg = globalSettings.flagsCmdMsg;
        this.getUserStatsCmd = globalSettings.getUserStatsCmd;
        this.clearUserStatsCmd = globalSettings.clearUserStatsCmd;
        this.randomPlonkCmd = globalSettings.randomPlonkCmd;
        this.showHasGuessed = globalSettings.showHasGuessed;
        this.showHasAlreadyGuessed = globalSettings.showHasAlreadyGuessed;
        this.showGuessChanged = globalSettings.showGuessChanged;
        this.showSubmittedPreviousGuess = globalSettings.showSubmittedPreviousGuess;
        this.isMultiGuess = globalSettings.isMultiGuess;
        this.guessMarkersLimit = globalSettings.guessMarkersLimit;
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
            flagsCmd: this.flagsCmd,
            flagsCmdMsg: this.flagsCmdMsg,
            getUserStatsCmd: this.getUserStatsCmd,
            clearUserStatsCmd: this.clearUserStatsCmd,
            randomPlonkCmd: this.randomPlonkCmd,
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
