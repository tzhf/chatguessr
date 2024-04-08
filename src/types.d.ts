type Socket = import('socket.io-client').Socket
type ChatUserstate = import('tmi.js').ChatUserstate

interface UserData extends ChatUserstate {
  'user-id': string
  'display-name': string
  avatar?: string
}

type LatLng = { lat: number; lng: number }

interface Location_ extends LatLng {
  panoId: string | null
  heading: number
  pitch: number
  zoom: number
}

interface Player {
  userId?: string
  username: string
  color: string
  avatar: string | null
  flag: string | null
}

interface Guess {
  player: Player
  position: LatLng
  streak: number
  lastStreak: number | null
  distance: number
  score: number
  modified?: boolean
}

interface RoundResult {
  player: Player
  country: string | null
  streak: number
  lastStreak: number | null
  distance: number
  score: number
  time: number
  position: LatLng
}

interface GameResult {
  player: Player
  streak: number
  guesses: (LatLng | null)[]
  scores: (number | null)[]
  distances: (number | null)[]
  totalScore: number
  totalDistance: number
}

interface GameResultDisplay {
  player: Player
  guesses: (LatLng | null)[]
  distances: (number | null)[]
  scores: (number | null)[]
}

interface ScoreboardRow {
  index?: { value: number; display: string | number }
  player: Player
  streak?: {
    value: number
    display: number | string
  }
  distance?: {
    value: number
    display: number | string
  }
  score?: {
    value: number
    display: number | string
  }
  modified?: boolean
  position?: LatLng
  guesses?: (LatLng | null)[]
  distances?: (number | null)[]
  scores?: (number | null)[]
  totalScore?: number
  totalDistance?: number
}

type GameType = 'standard' | 'streak'

type GameStatus = 'started' | 'finished'

type GameState = 'in-round' | 'round-results' | 'game-results' | 'none'

interface Seed {
  token: string
  map: string
  mapName: string
  mode: GameType
  type: GameType
  forbidMoving: boolean
  forbidRotating: boolean
  forbidZooming: boolean
  timeLimit: number
  bounds: Bounds
  round: number
  roundCount: number
  rounds: GameRound[]
  player: GamePlayer
  state: GameStatus
}

type GameRound = Location_ & {
  streakLocationCode: string | null
  // TODO: Add missing fields
}

type GamePlayer = {
  guesses: GameGuess[]
  // TODO: Add rest
}

type GameGuess = {
  lat: number
  lng: number
  timedOut: boolean
  timedOutWithGuess: boolean
  roundScore: GeoGuessrRoundScore
  roundScoreInPercentage: number
  roundScoreInPoints: number
  distance: Distance
  distanceInMeters: number
  time: number
}

type GeoGuessrRoundScore = {
  amount: string
  unit: string
  percentage: number
}

type GeoguessrUser = {
  nick: string
  created: string
  isVerified: boolean
  isCreator: boolean
  countryCode: string
}

type GeoGuessrMap = {
  id: string
  name: string
  slug: string
  description: string
  url: string
  playUrl: string
  bounds: Bounds
  creator: GeoguessrUser
  createdAt: Date
  numFinishedGames: number
  averageScore: number
  maxErrorDistance: number
  likes: number
}

type Distance = {
  meters: { amount: string; unit: string }
  miles: { amount: string; unit: string }
}

type Bounds = {
  min: LatLng
  max: LatLng
}

type GameMode = {
  noMove: boolean
  noPan: boolean
  noZoom: boolean
}

type Flag = {
  code: string
  names: string
  emoji?: string
}

type TwitchConnectionState =
  | { state: 'disconnected' }
  | { state: 'connecting' }
  | { state: 'connected'; botUsername: string; channelName: string }
  | { state: 'error'; error: unknown }

type SocketConnectionState =
  | { state: 'disconnected' }
  | { state: 'connecting' }
  | { state: 'connected' }
