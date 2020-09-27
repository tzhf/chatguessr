// @ts-check
const { app, ipcMain, globalShortcut } = require("electron");
const MainWindow = require("./Windows/MainWindow");
const SettingsWindow = require("./Windows/settings/SettingsWindow");

const Game = require("./Classes/Game");
const GameHelper = require("./utils/GameHelper");
const game = new Game();

const Store = require("./utils/Store");
const settings = Store.getSettings();

const tmi = require("tmi.js");
const Hastebin = require("./utils/Hastebin");

let client;
let mainWindow;
let settingsWindow;

const init = () => {
	mainWindow = new MainWindow();
	settingsWindow = new SettingsWindow();
	settingsWindow.setParentWindow(mainWindow);

	mainWindow.webContents.on("did-navigate-in-page", (e, url) => {
		if (GameHelper.isGameURL(url)) {
			game.setMultiGuess(settings.isMultiGuess);
			game.startGame(url).then(() => {
				client.action(settings.channelName, `${game.round == 1 ? "🌎 A new seed of " + game.mapName : "🌎 Round " + game.round} has started`);
				mainWindow.webContents.send("in-game", game.isMultiGuess, settings.noCar, settings.noCompass);
				openGuesses();
			});
		} else {
			game.outGame();
			mainWindow.webContents.send("out-game");
		}
	});

	mainWindow.webContents.on("did-stop-loading", () => {
		if (!game.isInGame) return;
		mainWindow.webContents.executeJavaScript(`
				guessBtn = document.querySelector('[data-qa="perform-guess"]');
				if(guessBtn) {
					guessBtn.addEventListener("click", () => ipcRenderer.send('make-guess-click'));
				}
				nextRoundBtn = document.querySelector('[data-qa="close-round-result"]');
				if(nextRoundBtn) {
					nextRoundBtn.addEventListener("click", () => ipcRenderer.send('next-round-click'));
				}
			`);
		if (game.seed.timeLimit != 0 && game.seed.state != "finished") {
			GameHelper.fetchSeed(game.url).then((seedData) => {
				if (seedData.round != game.round || seedData.state === "finished") {
					makeGuess();
				}
			});
		}
	});

	ipcMain.on("game-form", (e, isMultiGuess, noCar, noCompass) => {
		settingsWindow.hide();
		mainWindow.webContents.send("game-settings-change", noCar, noCompass);
		if (settings.noCar != noCar) {
			mainWindow.reload(); // may cause issues when reloading in game
		}
		settings.setGameSettings(isMultiGuess, noCar, noCompass);
		Store.setSettings(settings);
	});

	ipcMain.on("twitch-commands-form", (e, guessCmd, userGetStatsCmd, userClearStatsCmd, clearAllStatsCmd, setStreakCmd, showHasGuessed) => {
		settingsWindow.hide();
		settings.setTwitchCommands(guessCmd, userGetStatsCmd, userClearStatsCmd, clearAllStatsCmd, setStreakCmd, showHasGuessed);
		Store.setSettings(settings);
	});

	ipcMain.on("twitch-settings-form", (e, channelName, botUsername, token) => {
		settings.setTwitchSettings(channelName, botUsername, token);
		Store.setSettings(settings);
		if (client && client.readyState() === "OPEN") client.disconnect();
		loadTmi();
	});

	ipcMain.on("open-guesses", () => openGuesses());
	const openGuesses = () => {
		game.openGuesses();
		mainWindow.webContents.send("switch-on");
		client.action(settings.channelName, "Guesses are open...");
	};

	ipcMain.on("close-guesses", () => {
		closeGuesses();
		client.action(settings.channelName, "Guesses are closed.");
	});
	const closeGuesses = () => {
		game.closeGuesses();
		mainWindow.webContents.send("switch-off");
	};

	ipcMain.on("make-guess-click", () => makeGuess());
	const makeGuess = async () => {
		closeGuesses();
		mainWindow.webContents.send("pre-round-results");
		await game.makeGuess(settings.channelName);
		const scores = game.getRoundScores();
		mainWindow.webContents.send("show-round-results", game.location, scores);

		client.action(settings.channelName, `🌎 Round ${game.seed.state === "finished" ? game.round : game.round - 1} has finished. Congrats ${scores[0].username}!`);
	};

	ipcMain.on("next-round-click", () => nextRound());
	const nextRound = () => {
		game.nextRound();
		if (game.seed.state === "finished") {
			processTotalScores();
		} else {
			mainWindow.webContents.send("next-round");
			client.action(settings.channelName, `🌎 Round ${game.round} has started`);
			openGuesses();
		}
	};

	const processTotalScores = async () => {
		const totalScores = game.getTotalScores();
		const link = await Hastebin.makeHastebin(totalScores, game.mapName);
		mainWindow.webContents.send("show-total-results", totalScores);
		client.action(settings.channelName, `🌎 Game finished. Congrats ${totalScores[0].username} 🏆! Check out the full results here: ${link}`);
	};

	ipcMain.on("clearStats", () => clearStats());

	globalShortcut.register("CommandOrControl+R", () => false);
	globalShortcut.register("CommandOrControl+Shift+R", () => false);
	globalShortcut.register("Escape", () => settingsWindow.hide());
	globalShortcut.register("CommandOrControl+P", () => {
		settingsWindow.webContents.send("render-settings", settings);
		settingsWindow.show();
	});
};

const loadTmi = () => {
	if (!settings.channelName) return;
	const options = {
		options: { debug: true },
		connection: {
			secure: true,
			reconnect: true,
		},
		identity: {
			username: settings.botUsername,
			password: settings.token,
		},
		channels: [settings.channelName],
	};
	client = new tmi.Client(options);
	client
		.connect()
		.then(() => tmiListening())
		.catch((error) => {
			settingsWindow.webContents.send("twitch-error", error);
			console.error(error);
		});
};

const tmiListening = () => {
	client.on("connected", () => {
		settingsWindow.webContents.send("twitch-connected");
		client.action(settings.channelName, "is now connected");
	});

	client.on("disconnected", () => {
		settingsWindow.webContents.send("twitch-disconnected");
	});

	client.on("whisper", async (from, userstate, message, self) => {
		if (self) return;
		if (game.guessesOpen && message.startsWith(settings.guessCmd)) {
			message = message.split(settings.guessCmd)[1].trim();
			if (!GameHelper.isCoordinates(message)) return;
			const guessLocation = { lat: parseFloat(message.split(",")[0]), lng: parseFloat(message.split(",")[1]) };
			game.processUserGuess(userstate, guessLocation).then((res) => {
				if (res === "alreadyGuessed") return client.say(settings.channelName, `${userstate["display-name"]} you already guessed`);
				if (res === "pastedPreviousGuess") return client.say(settings.channelName, `${userstate["display-name"]} you pasted your previous guess :)`);
				const { guess, nbGuesses } = res;

				if (game.isMultiGuess) {
					mainWindow.webContents.send("render-multiguess", guess, nbGuesses);
					if (guess.guessChanged && settings.showHasGuessed) return client.say(settings.channelName, `${userstate["display-name"]} guess changed`);
				} else {
					mainWindow.webContents.send("render-guess", guess, nbGuesses);
				}
				if (settings.showHasGuessed) return client.say(settings.channelName, `${userstate["display-name"]} guessed`);
			});
		}
	});

	client.on("chat", (channel, userstate, message, self) => {
		if (self) return;
		if (message.toLowerCase() === settings.userGetStatsCmd) {
			const userInfo = Store.getUser(userstate.username);
			if (userInfo) {
				return client.say(
					channel,
					`
						${userstate["display-name"]}: Current streak: ${userInfo.streak}.
						Best streak: ${userInfo.bestStreak}.
						Correct countries: ${userInfo.correctGuesses}/${userInfo.nbGuesses} (${((userInfo.correctGuesses / userInfo.nbGuesses) * 100).toFixed(2)}%).
						Avg. score: ${Math.round(userInfo.meanScore)}.
						Victories: ${userInfo.victories}.
						Perfects: ${userInfo.perfects}.
					`
				);
			} else {
				return client.say(channel, `${userstate["display-name"]} you've never guessed yet.`);
			}
		}

		if (message.toLowerCase() === "!best") {
			const best = Store.getBest();
			if (!best) return client.say(channel, "No stats available.");
			return client.say(
				channel,
				`	Channel's best:
					Streak: ${best.streak.streak} ${best.streak.streak > 0 ? " (" + best.streak.user + ")" : ""}.
					Avg. score: ${Math.round(best.meanScore.meanScore)} (${best.meanScore.user}).
					Victories: ${best.victories.victories} ${best.victories.victories > 0 ? " (" + best.victories.user + ")" : ""}.
				`
			);
		}

		if (message.toLowerCase() === settings.userClearStatsCmd) {
			const userInfo = Store.getUser(userstate.username);
			if (!userInfo) return client.say(channel, `${userstate["display-name"]} you've never guessed yet.`);
			Store.deleteUser(userstate.username);
			return client.say(channel, `${userstate["display-name"]} 🗑️ stats cleared !`);
		}

		if (userstate.username != settings.channelName) return; //! streamer commands

		if (message.toLowerCase().startsWith(settings.setStreakCmd)) {
			const msgArr = message.split(" ");
			if (msgArr.length != 3) return client.action(channel, `Valid command: ${settings.setStreakCmd} user 42`);
			const newStreak = parseFloat(msgArr[2]);
			if (!Number.isInteger(newStreak)) return client.action(channel, `Invalid number.`);
			if (msgArr[1].charAt(0) === "@") msgArr[1] = msgArr[1].substring(1);
			const user = msgArr[1].toLowerCase();
			const storedUser = Store.getUser(user);
			if (!storedUser) return client.action(channel, `${user} has never guessed.`);
			Store.setUserStreak(user, newStreak);
			return client.action(channel, `${user} streak set to ${newStreak}`);
		}

		if (message.toLowerCase() === settings.clearAllStatsCmd) clearStats();
	});
};

const clearStats = () => {
	Store.clearStats();
	client.action(settings.channelName, "🗑️ All stats have been cleared.");
};

app.whenReady().then(init).then(loadTmi);
