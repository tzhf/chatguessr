const { ipcMain } = require("electron");
const Game = require("./Classes/Game");
const GameHelper = require("./utils/GameHelper");
const Store = require("./utils/Store");
const tmi = require("./Classes/tmi");

const settings = Store.getSettings();

/** @typedef {import('./types').Guess} Guess */
/** @typedef {import('./Windows/MainWindow')} MainWindow */
/** @typedef {import('./Windows/Settings/SettingsWindow')} SettingsWindow */

const game = new Game();
/** @type {tmi} */
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

	openGuesses() {
		game.openGuesses();
		this.win.webContents.send("switch-on");
		TMI.action("Guesses are open...");
	}
	
	closeGuesses() {
		game.closeGuesses();
		this.win.webContents.send("switch-off");
		TMI.action("Guesses are closed.");
	}

	nextRound() {
		game.nextRound();
		if (game.seed.state === "finished") {
			this.processTotalScores();
		} else {
			this.win.webContents.send("next-round", game.isMultiGuess);
			TMI.action(`🌎 Round ${game.round} has started`);
			this.openGuesses();
		}
	}

	async processTotalScores () {
		const totalScores = game.getTotalScores();
		const locations = game.getLocations();
		const link = await GameHelper.makeLink(settings.channelName, game.mapName, game.mode, locations, totalScores);
		this.win.webContents.send("show-final-results", totalScores);
		await TMI.action(
			`🌎 Game finished. Congrats ${GameHelper.toEmojiFlag(totalScores[0].flag)} ${totalScores[0].username} 🏆! ${
				link != undefined ? `Game summary: ${link}` : ""
			}`
		);
	}

	/**
	 * @param {{ lat: number, lng: number }} location 
	 * @param {Guess[]} scores 
	 */
	showResults (location, scores) {
		const round = game.seed.state === "finished" ? game.round : game.round - 1;
		this.win.webContents.send("show-round-results", round, location, scores);
		TMI.action(`🌎 Round ${round} has finished. Congrats ${GameHelper.toEmojiFlag(scores[0].flag)} ${scores[0].username} !`);
	}

	init() {
		game.init(this.win, settings);

		// Browser Listening
		this.win.webContents.on("did-navigate-in-page", (e, url) => {
			if (GameHelper.isGameURL(url)) {
				game.start(url, settings.isMultiGuess).then(() => {
					this.win.webContents.send("game-started", game.isMultiGuess);
					TMI.action(`${game.round == 1 ? "🌎 A new seed of " + game.mapName : "🌎 Round " + game.round} has started`);
					this.openGuesses();
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
				if (scores) {
					this.showResults(scores.location, scores.scores);
				}
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

		ipcMain.on("next-round-click", () => {
			this.nextRound();
		});

		ipcMain.on("open-guesses", () => {
			this.openGuesses();
		});

		ipcMain.on("close-guesses", () => {
			this.closeGuesses();
		});

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

	async initTmi() {
		if (TMI && TMI.client.readyState() === "OPEN") TMI.client.disconnect();
		if (!settings.channelName) return;

		TMI = new tmi(settings.channelName, settings.botUsername, settings.token);

		this.tmiListening();

		try {
			await TMI.client.connect();
		} catch (error) {
			this.settingsWindow.webContents.send("twitch-error", error);
			console.error(error);
		}
	}

	/**
	 * 
	 * @param {string} from 
	 * @param {import("tmi.js").ChatUserstate} userstate 
	 * @param {string} message 
	 * @param {boolean} self 
	 */
	async handleWhisper(from, userstate, message, self) {
		if (self || !message.startsWith("!g") || !game.guessesOpen) {
			return;
		}

		const msg = message.replace(/^!g\s+/, '');
		if (!GameHelper.isCoordinates(msg)) {
			return;
		}

		const location = { lat: parseFloat(msg.split(",")[0]), lng: parseFloat(msg.split(",")[1]) };

		try {
			const { user, guess } = await game.handleUserGuess(userstate, location);

			if (!game.isMultiGuess) {
				this.win.webContents.send("render-guess", guess, game.nbGuesses);
				if (settings.showHasGuessed) {
					await TMI.say(`${GameHelper.toEmojiFlag(user.flag)} ${userstate["display-name"]} guessed`);
				}
			} else {
				this.win.webContents.send("render-multiguess", game.guesses, game.nbGuesses);
				if (!guess.modified) {
					if (settings.showHasGuessed) {
						await TMI.say(`${GameHelper.toEmojiFlag(user.flag)} ${userstate["display-name"]} guessed`);
					}
				} else {
					await TMI.say(`${GameHelper.toEmojiFlag(user.flag)} ${userstate["display-name"]} guess changed`);
				}
			}
		} catch (err) {
			if (err.code === "alreadyGuessed") {
				await TMI.say(`${userstate["display-name"]} you already guessed`);
			} else if (err.code === "pastedPreviousGuess") {
				await TMI.say(`${userstate["display-name"]} you pasted your previous guess :)`);
			} else {
				console.error(err);
			}
		}
	}

	/**
	 * 
	 * @param {string} channel 
	 * @param {import("tmi.js").ChatUserstate} userstate 
	 * @param {string} message 
	 * @param {boolean} self 
	 */
	async handleMessage(channel, userstate, message, self) {
		if (self || !message.startsWith("!")) return;
		message = message.toLowerCase();

		if (message === settings.userGetStatsCmd) {
			const userInfo = Store.getUser(userstate.username);
			if (!userInfo) {
				await TMI.say(`${userstate["display-name"]} you've never guessed yet.`);
			} else {
				await TMI.say(`
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
			return;
		}

		if (message === settings.cgCmd && settings.cgCmd !== "") {
			await TMI.say(settings.cgMsg);
			return;
		}

		if (message === "!best") {
			const best = Store.getBest();
			if (!best) {
				await TMI.say("No stats available.");
			} else {
				await TMI.say(`
					Channel best:
					Streak: ${best.streak.streak}${best.streak.streak > 0 ? " (" + best.streak.user + ")" : ""}.
					Victories: ${best.victories.victories}${best.victories.victories > 0 ? " (" + best.victories.user + ")" : ""}.
					Perfects: ${Math.round(best.perfects.perfects)}${best.perfects.perfects > 0 ? " (" + best.perfects.user + ")" : ""}.
				`);
			}
			return;
		}

		if (message.startsWith("!flag")) {
			const countryReq = message.substr(message.indexOf(" ") + 1);
			const user = Store.getOrCreateUser(userstate.username, userstate["display-name"]);

			if (countryReq === "none") {
				user.setFlag("");
				Store.saveUser(userstate.username, user);
				await TMI.say(`${userstate["display-name"]} flag removed`);
			} else if (countryReq === "random") {
				user.setFlag(GameHelper.getRandomFlag());
				Store.saveUser(userstate.username, user);
				await TMI.say(`${userstate["display-name"]} got ${GameHelper.toEmojiFlag(user.flag)}`);
			} else {
				const country = GameHelper.findCountry(countryReq);
				if (country) {
					user.setFlag(country.code);
					Store.saveUser(userstate.username, user);
				} else {
					await TMI.say(`${userstate["display-name"]} no country found`);
				}
			}
			return;
		}

		if (message === settings.userClearStatsCmd) {
			const userInfo = Store.getUser(userstate.username);
			if (userInfo) {
				Store.deleteUser(userstate.username);
	
				await TMI.say(`${GameHelper.toEmojiFlag(userInfo.flag)} ${userstate["display-name"]} 🗑️ stats cleared !`);
			} else {
				await TMI.say(`${userstate["display-name"]} you've never guessed yet.`);
			}
			return;
		}

		// streamer commands
		if (userstate.username != settings.channelName) return;

		if (message.startsWith(settings.setStreakCmd)) {
			const msgArr = message.split(" ");
			if (msgArr.length != 3) {
				await TMI.action(`Valid command: ${settings.setStreakCmd} user 42`);
				return;
			}

			const newStreak = parseInt(msgArr[2]);
			if (!Number.isInteger(newStreak)) {
				await TMI.action(`Invalid number.`);
				return;
			}
			if (msgArr[1].charAt(0) === "@") msgArr[1] = msgArr[1].substring(1);

			const user = msgArr[1];
			const storedUser = Store.getUser(user);
			if (!storedUser) {
				await TMI.action(`cannot find ${user}`);
				return;
			}
			Store.setUserStreak(user, newStreak);

			await TMI.action(`${user} streak set to ${newStreak}`);
		} else if (message === '!spamguess') {
			for (let i = 0; i < 50; i += 1) {
				const lat = (Math.random() * 180) - 90;
				const lng = (Math.random() * 360) - 180;
				await this.handleWhisper(`fake_${i}`, {
					username: `fake_${i}`,
					'display-name': `fake_${i}`,
					color: `#${Math.random().toString(16).slice(2, 8).padStart(6, '0')}`
				}, `!g ${lat},${lng}`, false);
			}
		}
	}

	tmiListening() {
		TMI.client.on("connected", () => {
			this.settingsWindow.webContents.send("twitch-connected", settings.botUsername);
			TMI.action("is now connected");
		});
		TMI.client.on("disconnected", () => {
			this.settingsWindow.webContents.send("twitch-disconnected");
		});

		TMI.client.on("whisper", (from, userstate, message, self) => {
			this.handleWhisper(from, userstate, message, self).catch((error) => {
				console.error(error);
			});
		});

		TMI.client.on("message", (channel, userstate, message, self) => {
			this.handleMessage(channel, userstate, message, self).catch((error) => {
				console.error(error);
			});
		});
	}

	openSettingsWindow() {
		this.settingsWindow.webContents.send("render-settings", settings, TMI ? TMI.client.readyState() : "");
		this.settingsWindow.show();
	}
}

module.exports = GameHandler;
