// shared/settings/defaultSettings.ts
export const defaultSettings = {
  channelName: '',
  avatar: '',
  isMultiGuess: false,
  excludeBroadcasterData: false,
  guessMarkersLimit: 50,
  showStreamerRandomPlonkButton: true,
  commands: {
    getChatguessrMap: {
      command: '!cg',
      message: `Two ways to play: Link your Twitch account, guess and plonk with spacebar | or paste the command into chat without editing: <your cg link>`,
      cooldown: 30
    },
    getGeoguessrMap: {
      command: '!map',
      cooldown: 30
    },
    getLastLoc: {
      command: '!lastloc'
    },
    getFlagsLink: {
      command: '!flags'
    },
    getUserStats: {
      command: '!me'
    },
    getBestStats: {
      command: '!best'
    },
    clearUserStats: {
      command: '!clear'
    },
    randomPlonk: {
      command: '!randomplonk'
    }
  },
  notifications: {
    seedStarted: {
      enabled: true,
      message: '🌎 A new seed of <map> has started.'
    },
    roundStarted: {
      enabled: true,
      message: '🌎 Round <round> has started.'
    },
    guessesAreOpen: {
      enabled: true,
      message: 'Guesses are open...'
    },
    guessesAreClosed: {
      enabled: true,
      message: 'Guesses are closed.'
    },
    roundFinished: {
      enabled: true,
      message: '🌎 Round <round> has finished. Congrats <username> <flag> !'
    },
    gameFinished: {
      enabled: true,
      message: '🌎 Game finished. Congrats <username> <flag> ! 🏆 Game Summary: <link>'
    },
    hasGuessed: {
      enabled: true,
      message: '<username> <flag> has guessed !'
    },
    guessChanged: {
      enabled: true,
      message: '<username> <flag> guess changed'
    },
    alreadyGuessed: {
      enabled: true,
      message: '<username> <flag> you already guessed'
    },
    submittedPreviousGuess: {
      enabled: true,
      message: '<username> <flag> you submitted your previous guess'
    }
  }
}

declare global {
  type Settings = typeof defaultSettings
}
