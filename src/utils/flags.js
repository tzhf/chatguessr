const path = require("path");
const fs = require("fs/promises");
const { app } = require("electron");
/** @type {{ code: string, names: string }[]} */
// @ts-ignore
const countryCodesNames = require("./countryCodesNames");

const countryFlagCodes = new Set(countryCodesNames.map((country) => country.code));

const appDataDir = app.getPath("userData");
const customFlagsDir = path.join(appDataDir, "flags");

/** @type {{ code: string, names: string, emoji?: string }[]} */
let customFlags = [];

async function load() {
  try {
    customFlags = JSON.parse(await fs.readFile(path.join(customFlagsDir, 'flags.json'), 'utf8'));
  } catch {
    // it's OK if it doesn't exist
  }
}

/**
 * 
 * @param {string} id
 */
async function findFlagFile(id) {
  try {
    const customFlagPath = path.join(customFlagsDir, `${id}.png`);
    await fs.access(customFlagPath);
    return { path: customFlagPath };
  } catch (error) {
    // we naively fall back to the builtin SVGs. electron can 404 it if the file
    // doesn't exist.
    return { path: path.join(__dirname, `../../assets/flags/${id}.svg`) };
  }
}

/**
 * Matches words above 3 letters
 * @param {string} input
 * @param {string} key
 */
function contained(input, key) {
  return input.length >= 3 && key.includes(input) && input.length <= key.length;
}

// TODO use match-sorter?
// matchSorter(customFlags.concat(countryCodesNames), input, { keys: ['code', 'names'] })
/**
 * Find a flag code based on user input.
 * 
 * @param {string} input
 * @returns {string|undefined}
 */
function selectFlag(input) {
  const normalized = input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  return [...customFlags, ...countryCodesNames].find((flag) =>
    flag.code.toLowerCase() === normalized || contained(normalized, flag.names.toLowerCase())
  )?.code;
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
 * Convert a flag to an emoji. Custom flags are excluded and instead get the empty string.
 * 
 * @param {string} value
 */
function getEmoji(value) {
  if (!countryFlagCodes.has(value)) {
    return customFlags.find((flag) => flag.code === value)?.emoji ?? '';
  }

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

exports.load = load;
exports.findFlagFile = findFlagFile;
exports.selectFlag = selectFlag;
exports.randomCountryFlag = randomCountryFlag;
exports.getEmoji = getEmoji;