import { store } from './store'

const storedSettings = store.get('settings')

declare global {
  type Settings = typeof defaultSettings
}

const defaultSettings = {
  channelName: '',
  avatar: '',
  cgCmd: '!cg',
  cgCmdCooldown: 30,
  cgMsg: `Two ways to play: Link your Twitch account, guess and plonk with spacebar | or paste the command into chat without editing: <your cg link>`,
  lastlocCmd: '!lastloc',
  mapCmd: '!map',
  modeCmd: '!mode',
  mapCmdCooldown: 30,
  flagsCmd: '!flags',
  getUserStatsCmd: '!me',
  getBestStatsCmd: '!best',
  clearUserStatsCmd: '!clear',
  randomPlonkCmd: '!randomplonk',
  randomPlonkWaterCmd: '!randomplonkwater',
  showHasGuessed: true,
  showHasAlreadyGuessed: true,
  showGuessChanged: true,
  showSubmittedPreviousGuess: true,
  showNewSeedStarted: true,
  showGuessesAreOpen: true,
  showGuessesAreClosed: true,
  showRoundStarted: true,
  showRoundFinished: true,
  showGameFinished: true,
  autoShowMode: true,
  isMultiGuess: false,
  isGiftingPointsRound: false,
  roundPointGift: 0,
  pointGiftCommand: "!givepoints",
  isGiftingPointsGame: false,
  gamePointGift: 0,
  guessMarkersLimit: 30,
  isClosestInWrongCountryModeActivated: false,
  isGameOfChickenModeActivated: false,
  waterPlonkMode: "normal",
  invertScoring: false,
  dartsTargetScore: 25000,
  isDartsMode: false,
  isDartsModeBust: false,
  showBestRandomplonkRound: false
}

const settings = Object.assign({}, defaultSettings, storedSettings)

const saveSettings = (settings_: Settings): void => {
  Object.assign(settings, settings_)
  store.set('settings', settings)
}

export { settings, saveSettings }
