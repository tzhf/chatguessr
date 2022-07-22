import { ipcMain } from "electron";
import { once } from "events";
import Game from "./Classes/Game";
import GameHelper from "./utils/GameHelper";
import Settings from "./utils/Settings";
import TwitchBackend from "./backend/twitch";
import flags from "./utils/flags";
import createSettingsWindow from "./Windows/settings/SettingsWindow";
import store from "./utils/sharedStore";
import { io } from "socket.io-client";

const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL ?? "https://chatguessr-server.herokuapp.com";
const settings = Settings.read();

/** @typedef {import('./types').Guess} Guess */
/** @typedef {import('./utils/Database')} Database */
/** @typedef {import('./Windows/MainWindow')} MainWindow */
/** @typedef {import('electron').BrowserWindow} BrowserWindow */
/** @typedef {import('socket.io-client').Socket} Socket */

class GameHandler {
	/** @type {Database} */
	#db;

	/**
	 * @type {MainWindow}
	 */
	#win;

	/**
	 * @type {BrowserWindow|undefined}
	 */
	#settingsWindow;

	/**
	 * @type {import("@supabase/supabase-js").Session|undefined}
	 */
	#session;

	/**
	 * @type {TwitchBackend|undefined}
	 */
	#backend;

	/**
	 * @type {Socket}
	 */
	#socket;

	/**
	 * @type {Game}
	 */
	#game;

	#requestAuthentication;

	/**
	 * @param {Database} db
	 * @param {MainWindow} win
	 * @param {{ requestAuthentication: () => Promise<void> }} options
	 */
	constructor(db, win, options) {
		this.#db = db;
		this.#win = win;
		this.#backend = undefined;
		this.#socket = undefined;
		this.#game = new Game(db, settings);
		this.#requestAuthentication = options.requestAuthentication;
		this.init();
	}

	openGuesses() {
		this.#game.openGuesses();
		this.#win.webContents.send("switch-on");
		this.#backend.sendMessage("Guesses are open...", { system: true });
	}

	closeGuesses() {
		this.#game.closeGuesses();
		this.#win.webContents.send("switch-off");
		this.#backend.sendMessage("Guesses are closed.", { system: true });
	}

	nextRound() {
		if (this.#game.isFinished) {
			this.#game.finishGame();
			this.#processTotalScores();
		} else {
			this.#win.webContents.send("next-round", this.#game.isMultiGuess, this.#game.getLocation());
			this.#backend.sendMessage(`🌎 Round ${this.#game.round} has started`, { system: true });
			this.openGuesses();
		}
	}

	async #processTotalScores() {
		const totalScores = this.#game.getTotalScores();
		this.#win.webContents.send("show-final-results", totalScores);

		const locations = this.#game.getLocations();
		/** @type {string|undefined} */
		let link;
		try {
			link = await GameHelper.makeLink(
				this.#session.access_token,
				this.#session.user.user_metadata.name,
				settings.channelName,
				this.#game.mapName,
				this.#game.mode,
				locations,
				totalScores
			);
		} catch (error) {
			console.error("could not upload summary", error);
		}
		await this.#backend.sendMessage(
			`🌎 Game finished. Congrats ${flags.getEmoji(totalScores[0].flag)} ${totalScores[0].username} 🏆! ${link != undefined ? `Game summary: ${link}` : ""}`,
			{ system: true }
		);
	}

	/**
	 * @param {{ lat: number, lng: number }} location
	 * @param {Guess[]} scores
	 */
	#showResults(location, scores) {
		const round = this.#game.isFinished ? this.#game.round : this.#game.round - 1;
		this.#win.webContents.send("show-round-results", round, location, scores);
		this.#backend.sendMessage(`🌎 Round ${round} has finished. Congrats ${flags.getEmoji(scores[0].flag)} ${scores[0].username} !`, { system: true });
	}

	init() {
		// Browser Listening
		this.#win.webContents.on("did-navigate-in-page", (_event, url) => {
			if (GameHelper.isGameURL(url)) {
				// TODO(reanna) warn about the thing not being connected
				if (!this.#backend) return;

				this.#game
					.start(url, settings.isMultiGuess)
					.then(() => {
						const guesses = this.#game.isMultiGuess ? this.#game.getMultiGuesses() : this.#game.getRoundScores();
						this.#win.webContents.send("game-started", this.#game.isMultiGuess, guesses, this.#game.getLocation());

						if (guesses.length > 0) {
							this.#backend.sendMessage(`🌎 Round ${this.#game.round} has resumed`, { system: true });
						} else if (this.#game.round === 1) {
							this.#backend.sendMessage(`🌎 A new seed of ${this.#game.mapName} has started`, { system: true });
						} else {
							this.#backend.sendMessage(`🌎 Round ${this.#game.round} has started`, { system: true });
						}

						this.openGuesses();
					})
					.catch((error) => {
						console.error(error);
					});
			} else {
				this.#game.outGame();
				this.#win.webContents.send("game-quitted");
			}
		});

		this.#win.webContents.on("did-frame-finish-load", () => {
			if (!this.#game.isInGame) return;
			this.#win.webContents.send("refreshed-in-game");
			// Checks and update seed when the this.game has refreshed
			// update the current location if it was skipped
			// if the streamer has guessed returns scores
			this.#game.refreshSeed().then((scores) => {
				if (scores) {
					this.#showResults(scores.location, scores.scores);
				}
			});

			this.#win.webContents.executeJavaScript(`
				window.nextRoundBtn = document.querySelector('[data-qa="close-round-result"]');
				if (window.nextRoundBtn) {
					nextRoundBtn.addEventListener("click", () => {
						nextRoundBtn.setAttribute('disabled', 'disabled');
						chatguessrApi.startNextRound();
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

		ipcMain.on("game-form", (_event, isMultiGuess) => {
			settings.setGameSettings(isMultiGuess);
			this.#settingsWindow?.close();
		});

		ipcMain.on("twitch-commands-form", (_event, commands) => {
			settings.setTwitchCommands(commands);
			this.#settingsWindow?.close();
		});

		ipcMain.on("twitch-settings-form", (_event, channelName) => {
			settings.setTwitchSettings(channelName);
			this.#requestAuthentication();
		});

		ipcMain.on("add-banned-user", (_event, username) => {
			this.#db.addBannedUser(username);
		});

		ipcMain.on("delete-banned-user", (_event, username) => {
			this.#db.deleteBannedUser(username);
		});

		ipcMain.on("closeSettings", () => {
			this.closeSettingsWindow();
		});

		ipcMain.on("openSettings", () => {
			this.openSettingsWindow();
		});

		ipcMain.on("clearStats", async () => {
			store.delete("users"); // from pre-sqlite chatguessr versions
			store.delete("lastRoundPlayers"); // from even older versions
			await this.#db.clear();
			await this.#backend.sendMessage("All stats cleared 🗑️", { system: true });
		});
	}

	getConnectionState() {
		if (!this.#backend) {
			return { state: "disconnected" };
		} else if (this.#backend.isConnected()) {
			return { state: "connected", botUsername: this.#backend.botUsername, channelName: this.#backend.channelName };
		}
		return { state: "connecting" };
	}

	/**
	 * @param {import("@supabase/supabase-js").Session} session
	 */
	async authenticate(session) {
		this.#session = session;
		await this.#initBackend(session);
		await this.#initSocket(session);
	}

	/**
	 * @param {import("@supabase/supabase-js").Session} session
	 */
	async #initBackend(session) {
		this.#backend?.close();
		this.#backend = undefined;
		if (!settings.channelName) {
			return;
		}
		if (session.user.app_metadata.provider === "twitch") {
			this.#backend = new TwitchBackend({
				botUsername: session.user.user_metadata.name,
				channelName: settings.channelName,
				whisperToken: session.provider_token,
			});
		} else {
			throw new Error("unsupported provider");
		}

		const emitConnectionState = () => {
			const state = this.getConnectionState();
			this.#win.webContents.send("connection-state", state);
			this.#settingsWindow?.webContents.send("connection-state", state);
		};

		this.#backend.on("connected", () => {
			emitConnectionState();
			this.#backend.sendMessage("is now connected", { system: true });
		});
		this.#backend.on("disconnected", (requestedClose) => {
			emitConnectionState();
			if (!requestedClose) {
				// Try to reconnect.
				this.#requestAuthentication();
			}
		});

		this.#backend.on("guess", (userstate, message) => {
			this.#handleGuess(userstate, message).catch((error) => {
				console.error(error);
			});
		});

		this.#backend.on("message", (userstate, message) => {
			this.#handleMessage(userstate, message).catch((error) => {
				console.error(error);
			});
		});

		emitConnectionState();
		try {
			await this.#backend.connect();
		} catch (error) {
			if (this.#settingsWindow) {
				this.#settingsWindow.webContents.send("twitch-error", error);
			}
			console.error(error);
		}
	}

	/**
	 * @param {import("tmi.js").ChatUserstate} userstate
	 * @param {string} message
	 */
	async #handleGuess(userstate, message) {
		if (!message.startsWith("!g") || !this.#game.guessesOpen) return;
		// Ignore guesses made by the broadcaster with the CG map: prevents seemingly duplicate guesses
		if (userstate.username.toLowerCase() === settings.channelName.toLowerCase()) return;

		// Check if user is banned
		const bannedUsers = this.#db.getBannedUsers();
		const isBanned = bannedUsers.some((user) => user.username === userstate.username);
		if (isBanned) return;

		const location = GameHelper.parseCoordinates(message.replace(/^!g\s+/, ""));

		if (!location) return;

		try {
			const guess = await this.#game.handleUserGuess(userstate, location);

			if (!this.#game.isMultiGuess) {
				this.#win.webContents.send("render-guess", guess);
				if (settings.showHasGuessed) {
					await this.#backend.sendMessage(`${flags.getEmoji(guess.flag)} ${userstate["display-name"]} has guessed`);
				}
			} else {
				const guesses = this.#game.getMultiGuesses();
				this.#win.webContents.send("render-multiguess", guesses);
				if (!guess.modified) {
					if (settings.showHasGuessed) {
						await this.#backend.sendMessage(`${flags.getEmoji(guess.flag)} ${userstate["display-name"]} has guessed`);
					}
				} else {
					await this.#backend.sendMessage(`${flags.getEmoji(guess.flag)} ${userstate["display-name"]} guess changed`);
				}
			}
		} catch (err) {
			if (err.code === "alreadyGuessed" && settings.showHasAlreadyGuessed) {
				await this.#backend.sendMessage(`${userstate["display-name"]} you already guessed`);
			} else if (err.code === "pastedPreviousGuess") {
				await this.#backend.sendMessage(`${userstate["display-name"]} you pasted your previous guess :)`);
			} else {
				console.error(err);
			}
		}
	}

	/**
	 * @param {import("tmi.js").ChatUserstate} userstate
	 * @param {string} message
	 */
	async #handleMessage(userstate, message) {
		if (!message.startsWith("!")) return;
		message = message.trim().toLowerCase();

		const userId = userstate.badges?.broadcaster === "1" ? "BROADCASTER" : userstate["user-id"];

		if (message === settings.userGetStatsCmd) {
			const userInfo = this.#db.getUserStats(userId);
			if (!userInfo) {
				await this.#backend.sendMessage(`${userstate["display-name"]} you've never guessed yet.`);
			} else {
				await this.#backend.sendMessage(`
					${flags.getEmoji(userInfo.flag)} ${userInfo.username} : Current streak: ${userInfo.streak}.
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
			await this.#backend.sendMessage(settings.cgMsg.replace("<your cg link>", `https://chatguessr.com/map/${this.#backend.botUsername}`));
			return;
		}

		if (message === "!best") {
			const { streak, victories, perfects } = this.#db.getGlobalStats();
			if (!streak && !victories && !perfects) {
				await this.#backend.sendMessage("No stats available.");
			} else {
				let msg = "";
				if (streak) {
					msg += `Streak: ${streak.streak} (${streak.username}). `;
				}
				if (victories) {
					msg += `Victories: ${victories.victories} (${victories.username}). `;
				}
				if (perfects) {
					msg += `Perfects: ${perfects.perfects} (${perfects.username}). `;
				}
				await this.#backend.sendMessage(`Channels best: ${msg}`);
			}
			return;
		}

		if (message.startsWith("!flag")) {
			const countryReq = message.slice(message.indexOf(" ") + 1).trim();
			const dbUser = this.#db.getOrCreateUser(userId, userstate["display-name"]);

			let newFlag;
			if (countryReq === "none") {
				newFlag = null;
			} else if (countryReq === "random") {
				newFlag = flags.randomCountryFlag();
			} else {
				newFlag = flags.selectFlag(countryReq);
				if (!newFlag) {
					await this.#backend.sendMessage(`${userstate["display-name"]} no flag found`);
					return;
				}
			}

			this.#db.setUserFlag(dbUser.id, newFlag);

			if (countryReq === "none") {
				await this.#backend.sendMessage(`${userstate["display-name"]} flag removed`);
			} else if (countryReq === "random") {
				await this.#backend.sendMessage(`${userstate["display-name"]} got ${flags.getEmoji(newFlag)}`);
			}
			return;
		}

		if (message === settings.userClearStatsCmd) {
			// @ts-ignore
			store.delete(`users.${userstate.username}`);

			const dbUser = this.#db.getUser(userId);
			if (dbUser) {
				this.#db.resetUserStats(dbUser.id);
				await this.#backend.sendMessage(`${flags.getEmoji(dbUser.flag)} ${userstate["display-name"]} 🗑️ stats cleared !`);
			} else {
				await this.#backend.sendMessage(`${userstate["display-name"]} you've never guessed yet.`);
			}

			return;
		}

		// streamer commands
		if (userstate.badges?.broadcaster !== "1") {
			return;
		}
		if (process.env.NODE_ENV !== "development") {
			return;
		}

		if (message.startsWith("!spamguess")) {
			const max = parseInt(message.split(" ")[1] ?? "50", 10);
			for (let i = 0; i < max; i += 1) {
				const lat = Math.random() * 180 - 90;
				const lng = Math.random() * 360 - 180;
				await this.#handleGuess(
					{
						"user-id": `123450${i}`,
						username: `fake_${i}`,
						"display-name": `fake_${i}`,
						color: `#${Math.random().toString(16).slice(2, 8).padStart(6, "0")}`,
					},
					`!g ${lat},${lng}`
				);
			}
		}
	}

	/**
	 * @param {import("@supabase/supabase-js").Session} session
	 */
	async #initSocket(session) {
		if (this.#socket?.connected) {
			this.#socket.disconnect();
		}

		const botUsername = session.user.user_metadata.name;

		this.#socket = io(SOCKET_SERVER_URL, {
			transportOptions: {
				polling: {
					extraHeaders: {
						access_token: session.access_token,
						channelname: settings.channelName,
						bot: botUsername,
					},
				},
			},
		});

		this.#socket.on("connect", () => {
			this.#socket.emit("join", botUsername);
			if (this.#settingsWindow) {
				this.#settingsWindow.webContents.send("socket-connected");
			}
			console.log("Connected to socket !");
		});

		this.#socket.on("disconnect", (reason) => {
			if (this.#settingsWindow) {
				this.#settingsWindow.webContents.send("socket-disconnected");
			}
		});

		this.#socket.on("guess", (userData, guess) => {
			this.#handleGuess(userData, guess).catch((error) => {
				console.error(error);
			});
		});

		await once(this.#socket, "connect");
	}

	openSettingsWindow() {
		// Initialise the window if it doesn't exist,
		// especially important in non-windows systems where Chatguessr may not be able
		// to prevent the window from being completely closed.
		if (!this.#settingsWindow) {
			this.#settingsWindow = createSettingsWindow(this.#win).on("closed", () => {
				this.#settingsWindow = undefined;
			});

			this.#settingsWindow.webContents.on("did-finish-load", () => {
				this.#settingsWindow.webContents.send("render-settings", settings, this.#db.getBannedUsers(), this.getConnectionState(), this.#socket?.connected);

				this.#settingsWindow.show();
			});
		}
	}

	closeSettingsWindow() {
		this.#settingsWindow?.close();
	}
}

export default GameHandler;
