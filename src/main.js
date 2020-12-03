const { app, ipcMain, globalShortcut } = require("electron");
const MainWindow = require("./Windows/MainWindow");
const SettingsWindow = require("./Windows/settings/SettingsWindow");

const Game = require("./Classes/Game");
const GameHelper = require("./utils/GameHelper");
const countryCodesNames = require("./utils/countryCodesNames");
const game = new Game();

const Store = require("./utils/Store");
const settings = Store.getSettings();

const tmi = require("tmi.js");
const Hastebin = require("./utils/Hastebin");

let client;
let mainWindow;
let settingsWindow;

const initWindows = () => {
	Store.checkVersion();

	mainWindow = new MainWindow();
	settingsWindow = new SettingsWindow();
	settingsWindow.setParentWindow(mainWindow);

	ipcMain.on("game-form", (e, isMultiGuess, noCar, noCompass) => {
		mainWindow.webContents.send("game-settings-change", noCar, noCompass);
		settingsWindow.hide();

		if (settings.noCar != noCar) {
			mainWindow.reload(); // may cause issues when reloading in game
		}
		settings.setGameSettings(isMultiGuess, noCar, noCompass);
		Store.setSettings(settings);
	});

	ipcMain.on("twitch-commands-form", (e, commands) => {
		settingsWindow.hide();
		settings.setTwitchCommands(commands);
		Store.setSettings(settings);
	});

	ipcMain.on("twitch-settings-form", (e, channelName, botUsername, token) => {
		settings.setTwitchSettings(channelName, botUsername, token);
		Store.setSettings(settings);
		if (client && client.readyState() === "OPEN") client.disconnect();
		initTmi();
	});

	globalShortcut.register("CommandOrControl+R", () => false);
	globalShortcut.register("CommandOrControl+Shift+R", () => false);
	globalShortcut.register("Escape", () => settingsWindow.hide());
	globalShortcut.register("CommandOrControl+P", () => {
		settingsWindow.webContents.send("render-settings", settings);
		settingsWindow.show();
	});
};

const gameHandlers = () => {
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
					guessBtn.addEventListener("click", () => {
						guessBtn.setAttribute('disabled', 'disabled');
						ipcRenderer.send('make-guess-click');
					});
				}
				nextRoundBtn = document.querySelector('[data-qa="close-round-result"]');
				if(nextRoundBtn) {
					nextRoundBtn.addEventListener("click", () => {
						nextRoundBtn.setAttribute('disabled', 'disabled');
						ipcRenderer.send('next-round-click');
					});
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
		const round = game.seed.state === "finished" ? game.round : game.round - 1;
		mainWindow.webContents.send("show-round-results", round, game.location, scores);
		client.action(settings.channelName, `🌎 Round ${round} has finished. Congrats ${scores[0].username} !`);
	};

	ipcMain.on("next-round-click", () => nextRound());

	const nextRound = () => {
		game.nextRound();
		if (game.seed.state === "finished") {
			processTotalScores();
		} else {
			mainWindow.webContents.send("next-round", game.isMultiGuess);
			client.action(settings.channelName, `🌎 Round ${game.round} has started`);
			openGuesses();
		}
	};

	const processTotalScores = async () => {
		const totalScores = game.getTotalScores();
		const locations = game.getLocations();
		const link = await Hastebin.makeHastebin(game.mapName, totalScores, locations);
		mainWindow.webContents.send("show-total-results", totalScores);
		client.action(settings.channelName, `🌎 Game finished. Congrats ${totalScores[0].username} 🏆 ! Game summary: ${link}`);
	};

	ipcMain.on("clearStats", () => clearStats());
};

const initTmi = () => {
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

	if (!settings.channelName) return;

	client
		.connect()
		.then(tmiListening)
		.catch((error) => {
			settingsWindow.webContents.send("twitch-error", error);
			console.error(error);
		});

	client.on("connected", () => {
		settingsWindow.webContents.send("twitch-connected", settings.botUsername);
		client.action(settings.channelName, "is now connected");
	});
};

const tmiListening = () => {
	client.on("disconnected", () => {
		settingsWindow.webContents.send("twitch-disconnected");
	});

	client.on("whisper", async (from, userstate, message, self) => {
		if (self) return;
		if (game.guessesOpen && message.startsWith("!g")) {
			message = message.split("!g")[1].trim();
			if (!GameHelper.isCoordinates(message)) return;

			const guessLocation = { lat: parseFloat(message.split(",")[0]), lng: parseFloat(message.split(",")[1]) };

			game.processUserGuess(userstate, guessLocation).then((res) => {
				if (res === "alreadyGuessed") return client.say(settings.channelName, `${userstate["display-name"]} you already guessed`);
				if (res === "pastedPreviousGuess") return client.say(settings.channelName, `${userstate["display-name"]} you pasted your previous guess :)`);

				const { guess, user, nbGuesses } = res;

				if (game.isMultiGuess) {
					mainWindow.webContents.send("render-multiguess", game.guesses, nbGuesses);
					if (guess.guessChanged) return client.say(settings.channelName, `${toEmojiFlag(user.flag)} ${userstate["display-name"]} guess changed`);
				} else {
					mainWindow.webContents.send("render-guess", guess, nbGuesses);
				}
				if (settings.showHasGuessed) return client.say(settings.channelName, `${toEmojiFlag(user.flag)} ${userstate["display-name"]} guessed`);
			});
		}
	});

	client.on("chat", (channel, userstate, message, self) => {
		if (self || message.charAt(0) != "!") return;
		message = message.toLowerCase();

		if (message === settings.userGetStatsCmd) {
			const userInfo = Store.getUser(userstate.username);
			if (userInfo) {
				return client.say(
					channel,
					`
						${toEmojiFlag(userInfo.flag)} ${userstate["display-name"]} : Current streak: ${userInfo.streak}.
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

		if (message === "!best") {
			const best = Store.getBest();
			if (!best) return client.say(channel, "No stats available.");

			return client.say(
				channel,
				`	Channel's best:
					Streak: ${best.streak.streak}${best.streak.streak > 0 ? " (" + best.streak.user + ")" : ""}.
					Victories: ${best.victories.victories}${best.victories.victories > 0 ? " (" + best.victories.user + ")" : ""}.
					Perfects: ${Math.round(best.perfects.perfects)}${best.perfects.perfects > 0 ? " (" + best.perfects.user + ")" : ""}.
				`
			);
		}

		if (message.startsWith("!flag")) {
			const countryReq = message.substr(message.indexOf(" ") + 1);
			const user = Store.getOrCreateUser(userstate.username, userstate["display-name"]);

			if (countryReq === "none") {
				user.setFlag("");
				Store.saveUser(userstate.username, user);
				return client.say(channel, `${userstate["display-name"]} flag removed`);
			}

			if (countryReq === "random") {
				const rndCode = countryCodesNames[Math.floor(Math.random() * countryCodesNames.length)].code;
				user.setFlag(rndCode);
				Store.saveUser(userstate.username, user);
				return client.say(channel, `${userstate["display-name"]} got ${toEmojiFlag(user.flag)}`);
			}

			const country = findCountry(countryReq);
			if (!country) return client.say(channel, `${userstate["display-name"]} no country found`);

			user.setFlag(country.code);
			Store.saveUser(userstate.username, user);
		}

		if (message === settings.userClearStatsCmd) {
			const userInfo = Store.getUser(userstate.username);
			if (!userInfo) return client.say(channel, `${userstate["display-name"]} you've never guessed yet.`);
			Store.deleteUser(userstate.username);

			return client.say(channel, `${toEmojiFlag(userInfo.flag)} ${userstate["display-name"]} 🗑️ stats cleared !`);
		}

		//! streamer commands
		if (userstate.username != settings.channelName) return;

		if (message.startsWith(settings.setStreakCmd)) {
			const msgArr = message.split(" ");
			if (msgArr.length != 3) return client.action(channel, `Valid command: ${settings.setStreakCmd} user 42`);

			const newStreak = parseFloat(msgArr[2]);
			if (!Number.isInteger(newStreak)) return client.action(channel, `Invalid number.`);
			if (msgArr[1].charAt(0) === "@") msgArr[1] = msgArr[1].substring(1);

			const user = msgArr[1];
			const storedUser = Store.getUser(user);
			if (!storedUser) return client.action(channel, `${user} has never guessed.`);
			Store.setUserStreak(user, newStreak);

			return client.action(channel, `${user} streak set to ${newStreak}`);
		}
	});
};

/** Replace special chars
 * @param {String} val
 */
const normalize = (val) => val.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Matches words above 3 letters
 * @param {String} input
 * @param {String} key
 */
const isMatch = (input, key) => input.length >= 3 && key.includes(input) && input.length <= key.length;

/** Find country by code or name
 * @param {String} input
 * @return {Object} countryCodesNames
 */
const findCountry = (input) => {
	const normalized = normalize(input);
	return countryCodesNames.find((country) => country.code === normalized || isMatch(normalized, country.names.toLowerCase()));
};

/** Converts a country code into an emoji flag
 * @param {String} value
 */
const toEmojiFlag = (value) => value.toUpperCase().replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));

const clearStats = () => {
	Store.clearStats();
	client.action(settings.channelName, "🗑️ All stats have been cleared.");
};

app.whenReady().then(initWindows).then(initTmi).then(gameHandlers);

