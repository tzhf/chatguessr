const { ipcMain } = require("electron");
const Game = require("./Classes/Game");
const GameHelper = require("./utils/GameHelper");
const Store = require("./utils/Store");
const tmi = require("./Classes/tmi");

const settings = Store.getSettings();

/** @typedef {import('./Windows/MainWindow')} MainWindow */
/** @typedef {import('./Windows/Settings/SettingsWindow')} SettingsWindow */

const game = new Game();
let TMI;

class GameHandler {
	/**
	 * @param {MainWindow} win 
	 * @param {SettingsWindow} settingsWindow 
	 */
	constructor(win, settingsWindow) {
		this.win = win;
		this.settingsWindow = settingsWindow;
		this.initTmi();
		this.init();
	}

	init() {
		game.init(this.win, settings);

		// Browser Listening
		this.win.webContents.on("did-navigate-in-page", (e, url) => {
			if (GameHelper.isGameURL(url)) {
				game.start(url, settings.isMultiGuess).then(() => {
					this.win.webContents.send("game-started", game.isMultiGuess);
					TMI.action(`${game.round == 1 ? "🌎 A new seed of " + game.mapName : "🌎 Round " + game.round} has started`);
					openGuesses();
				});
			} else {
				game.outGame();
				this.win.webContents.send("game-quitted");
			}
		});

		this.win.webContents.on("did-frame-finish-load", () => {
			if (!game.isInGame) return;
			this.win.webContents.send("refreshed-in-game", settings.noCompass);
			// Checks and update seed when the game has refreshed
			// update the current location if it was skipped
			// if the streamer has guessed returns scores
			game.refreshSeed().then((scores) => {
				if (scores) showResults(scores.location, scores.scores);
			});

			this.win.webContents.executeJavaScript(`
				window.nextRoundBtn = document.querySelector('[data-qa="close-round-result"]');
				if(window.nextRoundBtn) {
					nextRoundBtn.addEventListener("click", () => {
						nextRoundBtn.setAttribute('disabled', 'disabled');
						ipcRenderer.send('next-round-click');
					});
				}
			`);
		});

		const showResults = (location, scores) => {
			const round = game.seed.state === "finished" ? game.round : game.round - 1;
			this.win.webContents.send("show-round-results", round, location, scores);
			TMI.action(`🌎 Round ${round} has finished. Congrats ${GameHelper.toEmojiFlag(scores[0].flag)} ${scores[0].username} !`);
		};

		ipcMain.on("next-round-click", () => nextRound());

		const nextRound = () => {
			game.nextRound();
			if (game.seed.state === "finished") {
				processTotalScores();
			} else {
				this.win.webContents.send("next-round", game.isMultiGuess);
				TMI.action(`🌎 Round ${game.round} has started`);
				openGuesses();
			}
		};

		const processTotalScores = async () => {
			const totalScores = game.getTotalScores();
			const locations = game.getLocations();
			this.win.webContents.send("show-final-results", totalScores);

			const link = await GameHelper.makeLink(settings.channelName, game.mapName, game.mode, locations, totalScores);
			TMI.action(
				`🌎 Game finished. Congrats ${GameHelper.toEmojiFlag(totalScores[0].flag)} ${totalScores[0].username} 🏆! ${
					link != undefined ? `Game summary: ${link}` : ""
				}`
			);
		};

		ipcMain.on("open-guesses", () => openGuesses());

		ipcMain.on("close-guesses", () => {
			closeGuesses();
			TMI.action("Guesses are closed.");
		});

		const openGuesses = () => {
			game.openGuesses();
			this.win.webContents.send("switch-on");
			TMI.action("Guesses are open...");
		};

		const closeGuesses = () => {
			game.closeGuesses();
			this.win.webContents.send("switch-off");
		};

		ipcMain.on("game-form", (e, isMultiGuess, noCar, noCompass) => {
			this.win.webContents.send("game-settings-change", noCompass);
			this.settingsWindow.hide();

			if (settings.noCar != noCar) this.win.reload();

			settings.setGameSettings(isMultiGuess, noCar, noCompass);
			Store.setSettings(settings);
		});

		ipcMain.on("twitch-commands-form", (e, commands) => {
			this.settingsWindow.hide();
			settings.setTwitchCommands(commands);
			Store.setSettings(settings);
		});

		ipcMain.on("twitch-settings-form", (e, channelName, botUsername, token) => {
			settings.setTwitchSettings(channelName, botUsername, token);
			Store.setSettings(settings);
			this.initTmi();
		});

		ipcMain.on("closeSettings", () => {
			this.settingsWindow.hide();
		});

		ipcMain.on("openSettings", () => {
			this.openSettingsWindow();
		});

		ipcMain.on("showScoreboard", () => {
			this.showScoreboard();
		});

		ipcMain.on("clearStats", () => {
			Store.clearStats();
			TMI.action("All stats cleared 🗑️");
		});
	}

	initTmi() {
		if (TMI && TMI.client.readyState() === "OPEN") TMI.client.disconnect();
		if (!settings.channelName) return;

		TMI = new tmi(settings.channelName, settings.botUsername, settings.token);

		this.tmiListening();

		TMI.client
			.connect()
			.then((res) => console.log(res))
			.catch((error) => {
				this.settingsWindow.webContents.send("twitch-error", error);
				console.error(error);
			});
	}

	tmiListening() {
		TMI.client.on("connected", () => {
			this.settingsWindow.webContents.send("twitch-connected", settings.botUsername);
			TMI.action("is now connected");
		});

		TMI.client.on("disconnected", () => {
			this.settingsWindow.webContents.send("twitch-disconnected");
		});

		TMI.client.on("whisper", async (from, userstate, message, self) => {
			if (self || !message.startsWith("!g") || !game.guessesOpen) return;

			const msg = message.split("!g")[1].trim();
			if (!GameHelper.isCoordinates(msg)) return;

			const location = { lat: parseFloat(msg.split(",")[0]), lng: parseFloat(msg.split(",")[1]) };

			game.handleUserGuess(userstate, location).then((res) => {
				if (res === "alreadyGuessed") return TMI.say(`${userstate["display-name"]} you already guessed`);
				if (res === "pastedPreviousGuess") return TMI.say(`${userstate["display-name"]} you pasted your previous guess :)`);

				const { user, guess } = res;

				if (!game.isMultiGuess) {
					this.win.webContents.send("render-guess", guess, game.nbGuesses);
					if (settings.showHasGuessed) return TMI.say(`${GameHelper.toEmojiFlag(user.flag)} ${userstate["display-name"]} guessed`);
				} else {
					this.win.webContents.send("render-multiguess", game.guesses, game.nbGuesses);
					if (!guess.modified) {
						if (settings.showHasGuessed) return TMI.say(`${GameHelper.toEmojiFlag(user.flag)} ${userstate["display-name"]} guessed`);
					} else {
						return TMI.say(`${GameHelper.toEmojiFlag(user.flag)} ${userstate["display-name"]} guess changed`);
					}
				}
			});
		});

		TMI.client.on("message", (channel, userstate, message, self) => {
			if (self || !message.startsWith("!")) return;
			message = message.toLowerCase();

			if (message === settings.userGetStatsCmd) {
				const userInfo = Store.getUser(userstate.username);
				if (!userInfo) return TMI.say(`${userstate["display-name"]} you've never guessed yet.`);

				TMI.say(`
					${GameHelper.toEmojiFlag(userInfo.flag)} ${userInfo.username} : Current streak: ${userInfo.streak}.
					Best streak: ${userInfo.bestStreak}.
					Correct countries: ${userInfo.correctGuesses}/${userInfo.nbGuesses}${
					userInfo.nbGuesses > 0 ? ` (${((userInfo.correctGuesses / userInfo.nbGuesses) * 100).toFixed(2)}%).` : "."
				}
					Avg. score: ${Math.round(userInfo.meanScore)}.
					Victories: ${userInfo.victories}.
					Perfects: ${userInfo.perfects}.
				`);
			}

			if (message === settings.cgCmd) {
				if (settings.cgCmd === "") return;
				return TMI.say(settings.cgMsg);
			}

			if (message === "!best") {
				const best = Store.getBest();
				if (!best) return TMI.say("No stats available.");

				return TMI.say(`
					Channel best: 
					Streak: ${best.streak.streak}${best.streak.streak > 0 ? " (" + best.streak.user + ")" : ""}.
					Victories: ${best.victories.victories}${best.victories.victories > 0 ? " (" + best.victories.user + ")" : ""}.
					Perfects: ${Math.round(best.perfects.perfects)}${best.perfects.perfects > 0 ? " (" + best.perfects.user + ")" : ""}.
				`);
			}

			if (message.startsWith("!flag")) {
				const countryReq = message.substr(message.indexOf(" ") + 1);
				const user = Store.getOrCreateUser(userstate.username, userstate["display-name"]);

				if (countryReq === "none") {
					user.setFlag("");
					Store.saveUser(userstate.username, user);
					return TMI.say(`${userstate["display-name"]} flag removed`);
				}

				if (countryReq === "random") {
					user.setFlag(GameHelper.getRandomFlag());
					Store.saveUser(userstate.username, user);
					return TMI.say(`${userstate["display-name"]} got ${GameHelper.toEmojiFlag(user.flag)}`);
				}

				const country = GameHelper.findCountry(countryReq);
				if (!country) return TMI.say(`${userstate["display-name"]} no country found`);

				user.setFlag(country.code);
				Store.saveUser(userstate.username, user);
			}

			if (message === settings.userClearStatsCmd) {
				const userInfo = Store.getUser(userstate.username);
				if (!userInfo) return TMI.say(`${userstate["display-name"]} you've never guessed yet.`);
				Store.deleteUser(userstate.username);

				return TMI.say(`${GameHelper.toEmojiFlag(userInfo.flag)} ${userstate["display-name"]} 🗑️ stats cleared !`);
			}

			// streamer commands
			if (userstate.username != settings.channelName) return;

			if (message.startsWith(settings.setStreakCmd)) {
				const msgArr = message.split(" ");
				if (msgArr.length != 3) return TMI.action(`Valid command: ${settings.setStreakCmd} user 42`);

				const newStreak = parseInt(msgArr[2]);
				if (!Number.isInteger(newStreak)) return TMI.action(`Invalid number.`);
				if (msgArr[1].charAt(0) === "@") msgArr[1] = msgArr[1].substring(1);

				const user = msgArr[1];
				const storedUser = Store.getUser(user);
				if (!storedUser) return TMI.action(`cannot find ${user}`);
				Store.setUserStreak(user, newStreak);

				return TMI.action(`${user} streak set to ${newStreak}`);
			}
		});
	}

	openSettingsWindow() {
		this.settingsWindow.webContents.send("render-settings", settings, TMI ? TMI.client.readyState() : "");
		this.settingsWindow.show();
	}
}

module.exports = GameHandler;
