import path from 'path'
import fs from 'fs/promises'
import { app } from 'electron'
import { matchSorter } from 'match-sorter'

import builtinFlags from './builtinFlags.json'
import countryCodesNames from '../countryCodesNames.json'

// The fallback to `/tmp/` is so this module can be used in tests outside electron.
const appDataDir = app?.getPath('userData') ?? '/tmp/'
const customFlagsDir = path.join(appDataDir, 'flags')

/**
 * Country flags included in Chatguessr by default.
 */
const countryFlags: Flag[] = countryCodesNames.map(({ code, names }) => ({
  code,
  names,
  emoji: getCountryEmoji(code)
}))

/**
 * Custom flags configured by the streamer.
 */
let customFlags: Flag[] = []

/** Get all available flags: custom flags, country flags, builtin flags. */
export function getAvailableFlags() {
  return [...customFlags, ...countryFlags, ...builtinFlags]
}

export async function loadCustomFlags() {
  try {
    customFlags = JSON.parse(
      await fs.readFile(path.join(customFlagsDir, 'customFlags.json'), 'utf8')
    )
  } catch {
    // it's OK if it doesn't exist
  }
}

export function setCustomFlags(flags: Flag[]) {
  customFlags = flags
}

export async function findFlagFile(id: string): Promise<Electron.ProtocolResponse> {
  const customFlagPaths = [path.join(customFlagsDir, `${id}.svg`)]

  for (const customFlagPath of customFlagPaths) {
    try {
      await fs.access(customFlagPath)
      return { path: customFlagPath }
    } catch {
      // Flag file doesn't exist. Try the next, or fall back to builtin flags.
    }
  }

  // We always return a path to the builtin SVGs because it's easy.
  // electron will return a 404 for us if the file doesn't exist.
  return { path: path.join(__dirname, `./assets/flags/${id.toUpperCase()}.svg`) }
}

/**
 * Find a flag code based on user input.
 */
export function selectFlag(input: string): string | undefined {
  const availableFlags = getAvailableFlags()

  const matches = matchSorter(availableFlags, input, {
    keys: ['names', { threshold: matchSorter.rankings.EQUAL, key: 'code' }]
  })

  return matches[0]?.code
}

/**
 * Select a random country code.
 */
export function randomCountryFlag(): string {
  return countryCodesNames[Math.floor(Math.random() * countryCodesNames.length)].code
}

/**
 * Convert a country code to a flag emoji.
 */
export function getCountryEmoji(value: string) {
  if (value.length == 2) {
    return value
      .toUpperCase()
      .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
  } else {
    const flag = value
      .toUpperCase()
      .substring(0, 2)
      .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397))
    const region = value
      .toUpperCase()
      .substring(2)
      .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397) + ' ')
    return `${flag} ${region}`.trim()
  }
}

/**
 * Convert a user flag to an emoji or text value.
 * Country codes get a flag emoji, and custom flags either get their configured emoji, or the empty string.
 */
export function getEmoji(value: string | null) {
  if (!value) return ''

  const flag = getAvailableFlags().find((flag) => flag.code === value.toLowerCase())

  return flag?.emoji ?? ''
}
