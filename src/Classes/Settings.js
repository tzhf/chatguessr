class Settings {
	/**
	 * @param {String} channelName=""
	 * @param {String} botUsername=""
	 * @param {String} token=""
	 * @param {String} guessCmd="!g"
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
		guessCmd = "!g",
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
		this.guessCmd = guessCmd;
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
		this.guessCmd = commands.guess;
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
