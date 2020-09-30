class Settings {
	/**
	 * @param {string} channelName=""
	 * @param {string} botUsername=""
	 * @param {string} token=""
	 * @param {string} guessCmd="!g"
	 * @param {string} userGetStatsCmd="!me"
	 * @param {string} userClearStatsCmd="!clear"
	 * @param {string} setStreakCmd="!setstreak"
	 * @param {boolean} showHasGuessed=true
	 * @param {boolean} isMultiGuess=false
	 * @param {boolean} noCar=false
	 * @param {boolean} noCompass=false
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
