class Settings {
	/**
	 * @param  {string} channelName=""
	 * @param  {string} botUsername=""
	 * @param  {string} token=""
	 * @param  {string} guessCmd="!g"
	 * @param  {string} userGetStatsCmd="!me"
	 * @param  {string} userClearStatsCmd="!clear"
	 * @param  {string} clearAllStatsCmd="!clearall"
	 * @param  {string} setStreakCmd="!setstreak"
	 * @param  {boolean} showHasGuessed=true
	 * @param  {boolean} noCar=false
	 * @param  {boolean} noCompass=false
	 */
	constructor(
		channelName = "",
		botUsername = "",
		token = "",
		guessCmd = "!g",
		userGetStatsCmd = "!me",
		userClearStatsCmd = "!clear",
		clearAllStatsCmd = "!clearall",
		setStreakCmd = "!setstreak",
		showHasGuessed = true,
		noCar = false,
		noCompass = false
	) {
		this.channelName = channelName;
		this.botUsername = botUsername;
		this.token = token;
		this.guessCmd = guessCmd;
		this.userGetStatsCmd = userGetStatsCmd;
		this.userClearStatsCmd = userClearStatsCmd;
		this.clearAllStatsCmd = clearAllStatsCmd;
		this.setStreakCmd = setStreakCmd;
		this.showHasGuessed = showHasGuessed;
		this.noCar = noCar;
		this.noCompass = noCompass;
	}

	/**
	 * @param  {boolean} noCar
	 * @param  {boolean} noCompass
	 */
	setGameSettings(noCar, noCompass) {
		this.noCar = noCar;
		this.noCompass = noCompass;
	}

	/**
	 * @param  {string} guessCmd
	 * @param  {string} userGetStatsCmd
	 * @param  {string} userClearStatsCmd
	 * @param  {string} clearAllStatsCmd
	 * @param  {string} setStreakCmd
	 * @param  {boolean} showHasGuessed
	 */
	setTwitchCommands(guessCmd, userGetStatsCmd, userClearStatsCmd, clearAllStatsCmd, setStreakCmd, showHasGuessed) {
		this.guessCmd = guessCmd;
		this.userGetStatsCmd = userGetStatsCmd;
		this.userClearStatsCmd = userClearStatsCmd;
		this.clearAllStatsCmd = clearAllStatsCmd;
		this.setStreakCmd = setStreakCmd;
		this.showHasGuessed = showHasGuessed;
	}

	/**
	 * @param  {string} channelName
	 * @param  {string} botUsername
	 * @param  {string} token
	 */
	setTwitchSettings(channelName, botUsername, token) {
		this.channelName = channelName;
		this.botUsername = botUsername;
		this.token = token;
	}
}

module.exports = Settings;
