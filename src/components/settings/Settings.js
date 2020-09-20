class Settings {
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

	setGameSettings(noCar, noCompass) {
		this.noCar = noCar;
		this.noCompass = noCompass;
	}

	setTwitchCommands(guessCmd, userGetStatsCmd, userClearStatsCmd, clearAllStatsCmd, setStreakCmd, showHasGuessed) {
		this.guessCmd = guessCmd;
		this.userGetStatsCmd = userGetStatsCmd;
		this.userClearStatsCmd = userClearStatsCmd;
		this.clearAllStatsCmd = clearAllStatsCmd;
		this.setStreakCmd = setStreakCmd;
		this.showHasGuessed = showHasGuessed;
	}

	setTwitchSettings(channelName, botUsername, token) {
		this.channelName = channelName;
		this.botUsername = botUsername;
		this.token = token;
	}
}

module.exports = Settings;
