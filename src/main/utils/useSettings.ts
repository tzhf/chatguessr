import { store } from './store'

const storedSettings = store.get('settings')

declare global {
  type Settings = typeof defaultSettings
}

const defaultSettings = {
  messageHasGuessed: '<emoji> <username> has guessed!',
  messageHasAlreadyGuessed: '<username> already guessed!',
  messageGuessChanged: '<emoji> <username> guess changed',
  messageSubmittedPreviousGuess: '<username> submitted their previous guess!',
  messageNewSeedStarted: '🌎 A new seed of <map> has started',
  messageGuessesAreOpen: 'Guesses are open...',
  messageGuessesAreClosed: 'Guesses are closed.',
  messageRoundStarted: '🌎 Round <round> has started',
  messageRoundFinished: '🌎 Round <round> has finished. Congrats <emoji> <username>!',
  messageGameFinished: '🌎 Game finished. Congrats <emoji> <username>! 🏆 Game Summary: <link>',


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
  chickenModeSurvivesWith5k: false,
  chickenMode5kGivesPoints: false,
  waterPlonkMode: "normal",
  countdownMode: "normal",
  invertScoring: false,
  exclusiveMode: false,
  dartsTargetScore: 25000,
  isDartsMode: false,
  isDartsModeBust: false,
  showBestRandomplonkRound: false,
  includeBroadcasterDataInBest: true,
  isStartOfRoundCommandActive: false,
  startOfRoundCommand: "!botrandomplonk",
  ABCModeLetters: "ABCDE",
  isBRMode: false,
  battleRoyaleReguessLimit: 3,
  countryRandomPlonkAllowed: false,
  isRandomPlonkOnlyMode: false,
}

const settings = Object.assign({}, defaultSettings, storedSettings)

const saveSettings = (settings_: Settings): void => {
  Object.assign(settings, settings_)
  store.set('settings', settings)
}

export { settings, saveSettings }
