const ElectronStore = require("electron-store");

/**
 * @typedef {object} LegacyUser
 * @prop {String} user
 * @prop {String} username
 * @prop {String} flag
 * @prop {Number} streak
 * @prop {Number} bestStreak
 * @prop {Number} correctGuesses
 * @prop {Number} nbGuesses
 * @prop {Number} perfects
 * @prop {Number} victories
 * @prop {number|null} meanScore
 * @prop {import("../types").LatLng|null} previousGuess
 * @prop {import("../types").LatLng|null} lastLocation
 */

/**
 * @typedef {{
 *   settings: import('./Settings').SettingsProps,
 *   users: Record<string, LegacyUser>,
 *   lastRoundPlayers: void,
 *   lastLocation: import('../types').LatLng | undefined,
 *   current_version: string,
 * }} Schema
 */

/** @type {ElectronStore<Schema>} */
const store = new ElectronStore();

module.exports = store;