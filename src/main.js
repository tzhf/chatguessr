"use strict";

require("./errorReporting");

if (process.platform == "win32") require("update-electron-app")();

const path = require("path");
const { app, BrowserWindow, ipcMain, protocol } = require("electron");
const { initRenderer } = require("electron-store");
const GameHandler = require("./GameHandler").default;
const flags = require("./utils/flags");
const Database = require("./utils/Database");
const sharedStore = require("./utils/sharedStore");
const Settings = require("./utils/Settings");
const { supabase } = require("./utils/supabase");
const createAuthWindow = require("./Windows/auth/AuthWindow");
const axios = require("axios").default;

if (require("electron-squirrel-startup")) {
	app.quit();
}

const dbPath = path.join(app.getPath("userData"), "scores.db");
const db = new Database(dbPath);

function serveAssets() {
	const assetDir = path.join(__dirname, "../../assets");
	protocol.interceptFileProtocol("asset", (request, callback) => {
		const assetFile = path.join(assetDir, new URL(request.url).pathname);
		if (!assetFile.startsWith(assetDir)) {
			callback({ statusCode: 404, data: "Not Found" });
		} else {
			callback({ path: assetFile });
		}
	});
}

async function serveFlags() {
	await flags.load();

	protocol.interceptFileProtocol("flag", async (request, callback) => {
		const name = request.url.replace(/^flag:/, "");
		try {
			callback(await flags.findFlagFile(name));
		} catch (err) {
			callback({ statusCode: 500, data: err.message });
		}
	});
}

function createWindow() {
	const mainWindow = require("./Windows/MainWindow");

	mainWindow.once("ready-to-show", () => {
		mainWindow.show();
		mainWindow.maximize();
	});

	return mainWindow;
}

/**
 * Previous versions used a user-generated oauth token that had too many permissions. If we still have one of those, revoke it.
 */
async function revokeLegacyOauthToken() {
	const { token } = Settings.read();
	if (!token || !process.env.TWITCH_CLIENT_ID) {
		return;
	}

	try {
		await axios.post("https://id.twitch.tv/oauth2/revoke", new URLSearchParams({
			client_id: process.env.TWITCH_CLIENT_ID,
			token: token.replace(/^oauth:/, ''),
		}));
	} catch {
		// We tried (this probably means it was not valid anymore to begin with)
	}

	// @ts-expect-error TS2345 Sub-properties are not supported by the types, but do work
	sharedStore.delete("settings.token");
}

/**
 * @param {GameHandler} gameHandler
 * @param {BrowserWindow} parentWindow
 */
async function authenticateWithTwitch(gameHandler, parentWindow) {
	const hasSession = !!sharedStore.get("session")?.access_token;

	const authConfig = await supabase.auth.signIn({
		provider: "twitch",
	}, {
		redirectTo: new URL("/streamer/redirect", `https://${process.env.CG_PUBLIC_URL}`).href,
		scopes: ["chat:read", "chat:edit", "whispers:read"].join(" "),
	});

	// If we have an existing session, we try to go through the login flow without user interaction.
	// This way users don't have to sign in manually every time they open ChatGuessr.
	const authUrl = hasSession ? authConfig.url : undefined;

	const authWindow = await createAuthWindow(parentWindow, {
		authUrl,
		clearStorageData: !hasSession,
	});

	const startAuth = () => {
		authWindow.loadURL(authConfig.url);
	};

	/**
	 * @param {import("electron").IpcMainEvent} _event
	 * @param {import("@supabase/supabase-js").Session} session
	 */
	const setSession = (_event, session) => {
		supabase.auth.setSession(session.refresh_token);
		gameHandler.authenticate(session).then(revokeLegacyOauthToken);

		authWindow.close();
	};

	ipcMain.once("set-session", setSession);
	ipcMain.handle("start-auth", startAuth);
	authWindow.on("closed", () => {
		ipcMain.off("set-session", setSession);
		ipcMain.removeHandler("start-auth");
	});
}

async function init() {
	initRenderer();

	await app.whenReady()
	serveAssets();
	await serveFlags();

	const mainWindow = createWindow();

	app.on("activate", () => {
		// On OS X it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});

	// Quit when all windows are closed, except on macOS. There, it's common
	// for applications and their menu bar to stay active until the user quits
	// explicitly with Cmd + Q.
	app.on("window-all-closed", () => {
		// temporary fix for macOS on closed app issue
		// if (process.platform !== "darwin") {
		app.quit();
		// }
	});

	const gameHandler = new GameHandler(db, mainWindow, {
		async requestAuthentication () {
			await authenticateWithTwitch(gameHandler, mainWindow);
		},
	});
	ipcMain.handle("get-connection-state", () => gameHandler.getConnectionState());
	ipcMain.handle("replace-session", async () => {
		await supabase.auth.signOut();
		await authenticateWithTwitch(gameHandler, mainWindow);
	});
	
	supabase.auth.onAuthStateChange((event, session) => {
		if (event === "SIGNED_IN") {
			sharedStore.set("session", session);
		} else if (event === "SIGNED_OUT") {
			sharedStore.delete("session");
		}
	});

	await authenticateWithTwitch(gameHandler, mainWindow);
}

init();
