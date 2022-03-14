'use strict';

const path = require("path");
const fs = require("fs/promises");
const { app } = require("electron");
const builtinFlags = require('./builtinFlags.json');
const countryCodesNames = require("./countryCodesNames.json");
const { matchSorter } = require("match-sorter");

// The fallback to `/tmp/` is so this module can be used in tests outside electron.
const appDataDir = app?.getPath("userData") ?? '/tmp/';
const customFlagsDir = path.join(appDataDir, "flags");

/** @typedef {{ code: string, names: string, emoji?: string }} Flag */

/**
 * Country flags included in Chatguessr by default.
 * @type {Flag[]}
 */
const countryFlags = countryCodesNames.map(({ code, names }) => ({
	code,
	names,
	emoji: getCountryEmoji(code),
}));
/**
 * Custom flags configured by the streamer.
 * @type {Flag[]}
 */
let customFlags = [];

/** Get all available flags: custom flags, country flags, builtin flags. */
function getAvailableFlags () {
	return [...customFlags, ...countryFlags, ...builtinFlags];
}

async function loadCustomFlagMetadata() {
	try {
		customFlags = JSON.parse(await fs.readFile(path.join(customFlagsDir, 'flags.json'), 'utf8'));
	} catch {
		// it's OK if it doesn't exist
	}
}

/**
 * @param {string} id
 * @returns {Promise<import('electron').ProtocolResponse>}
 */
async function findFlagFile(id) {
	try {
		const customFlagPath = path.join(customFlagsDir, `${id}.png`);
		await fs.access(customFlagPath);
		return { path: customFlagPath };
	} catch {
		// we naively fall back to the builtin SVGs. electron will return a 404 for us if the file doesn't exist.
		return { path: path.join(__dirname, `../../assets/flags/${id.toUpperCase()}.svg`) };
	}
}

/**
 * Find a flag code based on user input.
 *
 * @param {string} input
 * @returns {string|undefined}
 */
function selectFlag(input) {
	const availableFlags = getAvailableFlags();

	const matches = matchSorter(availableFlags, input, {
		keys: [
			{ threshold: matchSorter.rankings.EQUAL, key: 'code' },
			'names',
		],
	});

	return matches[0]?.code;
}

/**
 * Select a random country code.
 *
 * @return {String}
 */
function randomCountryFlag() {
	return countryCodesNames[Math.floor(Math.random() * countryCodesNames.length)].code;
}

/**
 * Convert a country code to a flag emoji.
 *
 * @param {string} value
 */
function getCountryEmoji(value) {
	if (value.length == 2) {
		return value
			.toUpperCase()
			.replace(/./g, (char) =>
				String.fromCodePoint(char.charCodeAt(0) + 127397)
		);
	} else {
		const flag = value
		.toUpperCase()
		.substring(0, 2)
		.replace(/./g, (char) =>
			String.fromCodePoint(char.charCodeAt(0) + 127397)
		);
		const region = value
		.toUpperCase()
		.substring(2)
		.replace(
			/./g,
			(char) => String.fromCodePoint(char.charCodeAt(0) + 127397) + " "
		);
		return `${flag} ${region}`.trim();
	}
}

/**
 * Convert a user flag to an emoji or text value.
 *
 * Country codes get a flag emoji, and custom flags either get their configured emoji, or the empty string.
 *
 * @param {string|null} value
 */
function getEmoji(value) {
	if (!value) return '';

	const flag = getAvailableFlags()
		.find((flag) => flag.code === value.toLowerCase());

	return flag?.emoji ?? '';
}

exports.load = loadCustomFlagMetadata;
exports.findFlagFile = findFlagFile;
exports.selectFlag = selectFlag;
exports.randomCountryFlag = randomCountryFlag;
exports.getEmoji = getEmoji;
