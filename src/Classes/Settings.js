class Settings {
	/**
	 * @param {String} channelName=""
	 * @param {String} botUsername=""
	 * @param {String} token=""
	 * @param {String} cgCmd="!cg"
	 * @param {String} cgMsg="To play along, go to this link, pick a location, and paste the whole command into chat: <your cg link>"
	 * @param {String} userGetStatsCmd="!me"
	 * @param {String} userClearStatsCmd="!clear"
	 * @param {String} setStreakCmd="!setstreak"
	 * @param {Boolean} showHasGuessed=true
	 * @param {Boolean} isMultiGuess=false
	 * @param {Boolean} noCar=false
	 * @param {Boolean} noCompass=false
	 */
	constructor(
		channelName = "",
		botUsername = "",
		token = "",
		cgCmd = "!cg",
		cgMsg = "To play along, go to this link, pick a location, and paste the whole command into chat: <your cg link>",
		userGetStatsCmd = "!me",
		userClearStatsCmd = "!clear",
		setStreakCmd = "!setstreak",
		showHasGuessed = true,
		isMultiGuess = false,
		noCar = false,
		noCompass = false
	) {
		this.channelName = channelName;
		this.botUsername = botUsername;
		this.token = token;
		this.cgCmd = cgCmd;
		this.cgMsg = cgMsg;
		this.userGetStatsCmd = userGetStatsCmd;
		this.userClearStatsCmd = userClearStatsCmd;
		this.setStreakCmd = setStreakCmd;
		this.showHasGuessed = showHasGuessed;
		this.isMultiGuess = isMultiGuess;
		this.noCar = noCar;
		this.noCompass = noCompass;
	}

	/**
	 * @param {boolean} noCar
	 * @param {boolean} noCompass
	 */
	setGameSettings(isMultiGuess, noCar, noCompass) {
		this.isMultiGuess = isMultiGuess;
		this.noCar = noCar;
		this.noCompass = noCompass;
	}

	/**
	 * @param {Object} commands
	 */
	setTwitchCommands(commands) {
		this.cgCmd = commands.cgCmdd;
		this.cgMsg = commands.cgMsgg;
		this.userGetStatsCmd = commands.userGetStats;
		this.userClearStatsCmd = commands.userClearStats;
		this.setStreakCmd = commands.setStreak;
		this.showHasGuessed = commands.showHasGuessed;
	}

	/**
	 * @param {string} channelName
	 * @param {string} botUsername
	 * @param {string} token
	 */
	setTwitchSettings(channelName, botUsername, token) {
		this.channelName = channelName;
		this.botUsername = botUsername;
		this.token = token;
	}
}

module.exports = Settings;
