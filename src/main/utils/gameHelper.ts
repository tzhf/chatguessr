import axios from 'axios'
import countryIso from 'coordinate_to_country'
import { session } from 'electron'
/**
 * Country code mapping for 2-character ISO codes that should be considered
 * part of another country for GeoGuessr streak purposes.
 */
import countryCodes from '../lib/countryCodes.json'

const GEOGUESSR_URL = 'https://geoguessr.com'
const CG_API_URL = import.meta.env.VITE_CG_API_URL ?? 'https://chatguessr.com/api'
const CG_PUBLIC_URL = import.meta.env.VITE_CG_PUBLIC_URL ?? 'chatguessr.com'

/**
 * Checks if the URL is an in-game page.
 */
export function isGameURL(url: string): boolean {
  return url.includes('/game/')
}

/**
 * Gets the Game ID from a game URL
 * Checks if ID is 16 characters in length
 */
export function getGameId(url: string): string | void {
  const id = url.slice(url.lastIndexOf('/') + 1)
  if (id.length == 16) return id
}

/**
 *  Get GeoGuessr cookies
 */
async function getCookies() {
  return session.defaultSession.cookies
    .get({ url: 'https://www.geoguessr.com' })
    .then((cookies) => {
      const ncfa = cookies.find((cookie) => cookie.name === '_ncfa')
      return ncfa ? { Cookie: `${ncfa.name}=${ncfa.value}` } : null
    })
    .catch((err) => {
      console.error(err)
    })
}

/**
 * Fetch a game seed from the GeoGuessr API.
 */
export async function fetchSeed(url: string): Promise<Seed | undefined> {
  const cookies = await getCookies()
  const gameId = getGameId(url)
  if (!gameId || !cookies) {
    return
  }

  const { data } = await axios.get(`${GEOGUESSR_URL}/api/v3/games/${gameId}`, { headers: cookies })
  return data
}

/**
 * Compare two coordinates
 */
export function latLngEqual(a: LatLng, b: LatLng) {
  return a.lat === b.lat && a.lng === b.lng
}

/**
 * Get the country code for a coordinate.
 */
export async function getCountryCode(location: LatLng): Promise<string | undefined> {
  const localResults = countryIso(location.lat, location.lng, true)
  const localIso = localResults.length > 0 ? localResults[0] : undefined
  if (!localIso) return

  return countryCodes[localIso]
}

/**
 * Parse lat/lng coordinates from a string.
 */
export function parseCoordinates(coordinates: string): LatLng | void {
  const regex =
    /^(?<lat>[-+]?(?:[1-8]?\d(?:\.\d+)?|90(?:\.0+)?)),\s*(?<lng>[-+]?(?:180(?:\.0+)?|(?:(?:1[0-7]\d)|(?:[1-9]?\d))(?:\.\d+)?))$/
  const m = regex.exec(coordinates)
  if (m?.groups) {
    return { lat: parseFloat(m.groups.lat), lng: parseFloat(m.groups.lng) }
  }
}

/**
 * Returns map scale
 */
export function calculateScale(bounds: Bounds): number {
  return haversineDistance(bounds.min, bounds.max) / 7.458421
}

/**
 * Returns distance in km between two coordinates
 */
export function haversineDistance(mk1: LatLng, mk2: LatLng): number {
  const R = 6371.071
  const rlat1 = mk1.lat * (Math.PI / 180)
  const rlat2 = mk2.lat * (Math.PI / 180)
  const difflat = rlat2 - rlat1
  const difflon = (mk2.lng - mk1.lng) * (Math.PI / 180)
  const km =
    2 *
    R *
    Math.asin(
      Math.sqrt(
        Math.sin(difflat / 2) * Math.sin(difflat / 2) +
          Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)
      )
    )
  return km
}

/**
 * Returns score based on distance and scale
 */
export function calculateScore(distance: number, scale: number): number {
  if (distance * 1000 < 25) return 5000
  return Math.round(5000 * Math.pow(0.99866017, (distance * 1000) / scale))
}

/**
 * Upload scores to the Chatguessr API and return the game summary link
 */
export async function makeGameSummaryLink(params: {
  accessToken: string
  bot: string
  streamer: string
  map: string
  mode: GameMode
  locations: Location_[]
  gameResults: GameResult[]
}): Promise<string> {
  const res = await axios.post<{ code: string }>(
    `${CG_API_URL}/game`,
    {
      bot: params.bot,
      streamer: params.streamer,
      map: params.map,
      mode: params.mode,
      locations: params.locations,
      players: params.gameResults
    },
    { headers: { access_token: params.accessToken } }
  )

  return `${CG_PUBLIC_URL}/game/${res.data.code}`
}

/**
 * Make GMaps URL from a Location object
 */
export async function makeMapsUrl(location: Location_): Promise<string> {
  const url = new URL('https://www.google.com/maps/@?api=1&map_action=pano')
  if (location.panoId) url.searchParams.set('pano', location.panoId)
  url.searchParams.set('viewpoint', `${location.lat},${location.lng}`)
  url.searchParams.set('heading', String(location.heading))
  url.searchParams.set('pitch', String(location.pitch))
  if (location.zoom) {
    const fov = 180 / 2 ** location.zoom
    url.searchParams.set('fov', String(fov))
  }

  const shortUrl = await shortenMapsUrl(url.href)
  return shortUrl ?? url.href
}

async function shortenMapsUrl(url: string): Promise<string | undefined> {
  const v = encodeURIComponent(url.replaceAll('!', '*21'))
  try {
    const { data } = await axios.get<string | undefined>(
      `https://www.google.com/maps/rpc/shorturl?authuser=0&hl=en&pb=!1s${v}!2m1!7e81!6b1`
    )
    if (data) {
      const [shortened]: string = JSON.parse(data.split('\n')[1])
      return shortened
    }
  } catch (e) {
    return undefined
  }
  return undefined
}

export async function fetchMap(mapToken: string): Promise<GeoGuessrMap | undefined> {
  const cookies = await getCookies()
  if (!cookies) {
    return
  }

  const { data } = await axios.get(`${GEOGUESSR_URL}/api/maps/${mapToken}`, { headers: cookies })
  return data
}

/**
 * Returns random coordinates within land, no Antarctica
 */
export async function getRandomCoordsInLand(bounds: Bounds | null = null): Promise<LatLng> {
  let lat_north = 85,
    lat_south = -60,
    lng_west = -180,
    lng_east = 180
  if (bounds != null) {
    lat_north = bounds.max.lat
    lat_south = Math.max(bounds.min.lat, lat_south)
    lng_east = bounds.max.lng
    lng_west = bounds.min.lng
  }
  const lat = Math.random() * (lat_north - lat_south) + lat_south
  const lng = Math.random() * (lng_east - lng_west) + lng_west
  const localResults = countryIso(lat, lng, true)
  if (!localResults.length) return await getRandomCoordsInLand(bounds)
  return { lat, lng }
}

export async function getStreamerAvatar(channel: string): Promise<{ avatar: string | undefined }> {
  try {
    const { data } = await axios.get<{ avatar: string }>(`${CG_API_URL}/channel/${channel}`)
    return data
  } catch (e) {
    return { avatar: undefined }
  }
}

export function dateToUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

/**
 * Parses a user-defined string that represents a date into a Unix timestamp. Will set timestamp to > 0 on success
 * or == 0 for an empty input, and -1 on unrecognized dates.
 */
export async function parseUserDate(
  userDateStr: string | undefined
): Promise<{ timeStamp: number; description: string | undefined }> {
  let timeStamp = -1
  let description: string | undefined =
    "Unsupported date (supported dates: 'day', 'week', 'month', 'year')"
  if (!userDateStr || userDateStr === 'all') {
    timeStamp = 0
    description = undefined
  }
  if (userDateStr === 'day' || userDateStr === 'today') {
    timeStamp = dateToUnixTimestamp(new Date(new Date().setHours(0, 0, 0, 0)))
    description = 'today'
  } else if (userDateStr === 'week') {
    const lastMidnight = new Date(new Date().setHours(0, 0, 0, 0))
    const day = lastMidnight.getDay() || 7 // Convert sunday to 7
    lastMidnight.setHours(-24 * (day - 1))
    timeStamp = dateToUnixTimestamp(lastMidnight)
    description = 'this week'
  } else if (userDateStr === 'month') {
    const now = new Date()
    timeStamp = dateToUnixTimestamp(new Date(now.getFullYear(), now.getMonth(), 1))
    description = 'this month'
  } else if (userDateStr === 'year') {
    const now = new Date()
    timeStamp = dateToUnixTimestamp(new Date(now.getFullYear(), 0, 1))
    description = 'this year'
  }
  return { timeStamp: timeStamp, description: description }
}
