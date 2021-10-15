const ElectronStore = require("electron-store");

/**
 * @typedef {{
 *   settings: import('./Settings').SettingsProps,
 *   users: Record<string, import('../Classes/User')>,
 *   lastRoundPlayers: void,
 *   lastLocation: import('../types').LatLng | undefined,
 *   current_version: string,
 * }} Schema
 */

/** @type {ElectronStore<Schema>} */
const store = new ElectronStore();

module.exports = store;