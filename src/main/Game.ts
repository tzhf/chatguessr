import pMap from 'p-map'

import {
  latLngEqual,
  calculateScale,
  fetchSeed,
  getCountryCode,
  haversineDistance,
  calculateScore,
  isCoordsInLand
} from './utils/gameHelper'

export default class Game {
  #db: Database

  /**
   * Play link for the current game.
   */
  #url: string | undefined

  #settings: Settings

  /**
   * The database UUID of the current round.
   */
  #roundId: string | undefined

  /**
   * Country code for the current round's location.
   */
  #country: string | undefined

  seed: Seed | undefined

  mapScale: number | undefined

  location: Location_ | undefined

  lastLocation: LatLng | undefined

  isInGame = false

  guessesOpen = false

  isMultiGuess = false

  // points-gifting

  isGiftingPointsRound = false
  roundPointGift = 0
  isGiftingPointsGame = false
  gamePointGift = 0
  pointGiftCommand = "!givepoints"

  // modes

  isClosestInWrongCountryModeActivated = false
  waterPlonkMode = "normal"
  invertScoring = false
  isGameOfChickenModeActivated = false
  chickenModeSurvivesWith5k = false
  chickenMode5kGivesPoints = false



  constructor(db: Database, settings: Settings) {
    this.#db = db
    this.#settings = settings
    this.lastLocation = this.#db.getLastRoundLocation()
  }

  async start(url: string, isMultiGuess: boolean) {
    
    this.isGiftingPointsGame = this.#settings.isGiftingPointsGame
    this.gamePointGift = this.#settings.gamePointGift
    this.isGiftingPointsRound = this.#settings.isGiftingPointsRound
    this.roundPointGift = this.#settings.roundPointGift
    this.pointGiftCommand = this.#settings.pointGiftCommand
    this.isClosestInWrongCountryModeActivated = this.#settings.isClosestInWrongCountryModeActivated
    this.isGameOfChickenModeActivated = this.#settings.isGameOfChickenModeActivated
    this.chickenModeSurvivesWith5k = this.#settings.chickenModeSurvivesWith5k
    this.chickenMode5kGivesPoints = this.#settings.chickenMode5kGivesPoints
    this.waterPlonkMode = this.#settings.waterPlonkMode
    this.invertScoring = this.#settings.invertScoring


    this.isInGame = true
    this.isMultiGuess = isMultiGuess
    if (this.#url === url) {
      await this.refreshSeed()
    } else {
      this.#url = url
      this.seed = await this.#getSeed()
      if (!this.seed) {
        throw new Error('Could not load seed for this game')
      }

      try {
        this.#db.createGame(this.seed)
        this.#roundId = this.#db.createRound(this.seed.token, this.seed.rounds[0], this.invertScoring?1:0)
      } catch (err) {
        // In this case we are restoring an existing game.
        if (err instanceof Error && err.message.includes('UNIQUE constraint failed: games.id')) {
          this.#roundId = this.#db.getCurrentRound(this.seed.token)
        } else {
          throw err
        }
      }

      this.mapScale = calculateScale(this.seed.bounds)
      this.#getCountry()
    }
  }

  outGame() {
    this.isInGame = false
    this.closeGuesses()
  }

  #streamerHasGuessed(seed: Seed) {
    return seed.player.guesses.length != this.seed!.player.guesses.length
  }

  #locHasChanged(seed: Seed) {
    return !latLngEqual(seed.rounds.at(-1)!, this.getLocation())
  }

  // @ts-ignore
  async refreshSeed() {
    const newSeed = await this.#getSeed()
    // If a guess has been committed, process streamer guess then return scores
    if (newSeed && this.#streamerHasGuessed(newSeed)) {
      this.closeGuesses()

      this.seed = newSeed
      const location = this.location
      await this.#makeGuess()

      const roundResults = this.getRoundResults()

      if (this.seed!.state !== 'finished') {
        this.#roundId = this.#db.createRound(this.seed!.token, this.seed.rounds.at(-1)!, this.invertScoring?1:0)
        this.#getCountry()
      } else {
        this.#roundId = undefined
      }

      return { location, roundResults }
      // Else, if only the loc has changed, the location was skipped, replace current loc
    } else if (newSeed && this.#locHasChanged(newSeed)) {
      this.seed = newSeed
      this.#roundId = this.#db.createRound(this.seed!.token, this.seed.rounds.at(-1)!, this.invertScoring?1:0)

      this.#getCountry()

      return false
    }
  }

  async #getSeed() {
    return this.#url ? await fetchSeed(this.#url) : undefined
  }

  async #getCountry() {
    this.location = this.getLocation()
    this.#country = await getCountryCode(this.location)

    this.#db.setRoundCountry(this.#roundId!, this.#country ?? null)
  }

  async #makeGuess() {
    this.seed = await this.#getSeed()

    if (this.isMultiGuess) {
      await this.#processMultiGuesses()
    }
    await this.#processStreamerGuess()

    this.lastLocation = { lat: this.location!.lat, lng: this.location!.lng }
  }

  /**
   * Update streaks for multi-guesses.
   */
  async #processMultiGuesses() {
    const guesses = this.#db.getRoundResultsSimplified(this.#roundId!)
    await pMap(
      guesses,
      async (guess) => {
        if (guess.country === this.#country) {
          this.#db.addUserStreak(guess.player.userId, this.#roundId!)
        } else {
          this.#db.resetUserStreak(guess.player.userId)
        }
      },
      { concurrency: 10 }
    )
  }

  async #processStreamerGuess() {
    const index = this.seed!.state === 'finished' ? 1 : 2
    const streamerGuess = this.seed!.player.guesses[this.seed!.round - index]
    const location = { lat: streamerGuess.lat, lng: streamerGuess.lng }

    const dbUser = this.#db.getOrCreateUser(
      'BROADCASTER',
      this.#settings.channelName,
      this.#settings.avatar,
      '#FFF'
    )
    if (!dbUser) return

    const guessedCountry = await getCountryCode(location)
    const lastStreak = this.#db.getUserStreak(dbUser.id)
    const correct = guessedCountry === this.#country
    if (correct) {
      this.#db.addUserStreak(dbUser.id, this.#roundId!)
    } else {
      this.#db.resetUserStreak(dbUser.id)
    }

    const distance = haversineDistance(location, this.location!)
    var score = streamerGuess.timedOut ? 0 : calculateScore(distance, this.mapScale!, await getCountryCode(location) === this.#country, this.isClosestInWrongCountryModeActivated, this.waterPlonkMode, await isCoordsInLand(location), this.invertScoring)
    if(this.#db.getNumberOfGamesInRoundFromRoundId(this.#roundId!) !== 1 && this.isGameOfChickenModeActivated){
      const didUserWinLastRound = this.#db.didUserWinLastRound('BROADCASTER', this.#roundId!, this.invertScoring, this.chickenModeSurvivesWith5k)
      if(didUserWinLastRound){
        if (!(this.chickenMode5kGivesPoints && score == 5000))
          score = 0
      }
    }
    const streak = this.#db.getUserStreak(dbUser.id)

    this.#db.createGuess(this.#roundId!, dbUser.id, {
      location,
      country: guessedCountry ?? null,
      streak: streak?.count ?? 0,
      lastStreak: lastStreak?.count && !correct ? lastStreak.count : null,
      distance,
      score,
      isRandomPlonk: 0
    })
  }

  async handleUserGuess(userstate: UserData, location: LatLng, isRandomPlonk: boolean = false): Promise<Guess> {
    var dbUser = this.#db.getUser(userstate['user-id'])
    if (!dbUser || !isRandomPlonk) {
      dbUser = this.#db.getOrCreateUser(
        userstate['user-id'],
        userstate['display-name'],
        userstate.avatar,
        userstate.color
      )
    }
    


    if (!dbUser) throw Object.assign(new Error('Something went wrong creating dbUser'))

    const existingGuess = this.#db.getUserGuess(this.#roundId!, dbUser.id)
    if (existingGuess && !this.isMultiGuess) {
      throw Object.assign(new Error('User already guessed'), { code: 'alreadyGuessed' })
    }

    if (dbUser.previousGuess && latLngEqual(dbUser.previousGuess, location)) {
      throw Object.assign(new Error('Same guess'), { code: 'submittedPreviousGuess' })
    }

    const distance = haversineDistance(location, this.location!)
    var score = calculateScore(distance, this.mapScale!, await getCountryCode(location) === this.#country, this.isClosestInWrongCountryModeActivated, this.waterPlonkMode, await isCoordsInLand(location), this.invertScoring)
    if(this.#db.getNumberOfGamesInRoundFromRoundId(this.#roundId!) !== 1 && this.isGameOfChickenModeActivated){

      const didUserWinLastRound = this.#db.didUserWinLastRound(dbUser.id, this.#roundId!, this.invertScoring, this.chickenModeSurvivesWith5k)
      if(didUserWinLastRound){
        if (!(this.chickenMode5kGivesPoints && score == 5000))
          score = 0
      }
    }

    const guessedCountry = await getCountryCode(location)
    const correct = guessedCountry === this.#country
    const lastStreak = this.#db.getUserStreak(dbUser.id)

    // Reset streak if the player skipped a round
    if (
      lastStreak &&
      this.lastLocation &&
      !latLngEqual(lastStreak.lastLocation, this.lastLocation)
    ) {
      this.#db.resetUserStreak(dbUser.id)
    }

    if (!this.isMultiGuess) {
      if (correct) {
        this.#db.addUserStreak(dbUser.id, this.#roundId!)
      } else {
        this.#db.resetUserStreak(dbUser.id)
      }
    }

    let streak: { count: number } | undefined = this.#db.getUserStreak(dbUser.id)

    // Here we mimic addUserStreak() without committing for multiGuesses() mode
    // This might look weird but with this we no longer need to update guess streak in processMultiGuesses() which was slow
    if (this.isMultiGuess) {
      if (correct) {
        streak ? streak.count++ : (streak = { count: 1 })
      } else {
        streak = undefined
      }
    }

    const guess = {
      location,
      country: guessedCountry ?? null,
      streak: streak?.count ?? 0,
      lastStreak: lastStreak?.count && !correct ? lastStreak.count : null,
      distance,
      score,
      isRandomPlonk: isRandomPlonk ? 1 : 0
    }

    // Modify guess or push it
    let modified = false
    if (this.isMultiGuess && existingGuess) {
      this.#db.updateGuess(existingGuess.id, guess)
      modified = true
    } else {
      this.#db.createGuess(this.#roundId!, dbUser.id, guess)
    }

    // TODO save previous guess? No, fetch previous guess from the DB
    this.#db.setUserPreviousGuess(dbUser.id, location)

    return {
      player: {
        username: dbUser.username,
        color: dbUser.color,
        avatar: dbUser.avatar,
        flag: dbUser.flag
      },
      position: location,
      streak: streak?.count ?? 0,
      lastStreak: lastStreak?.count && !correct ? lastStreak.count : null,
      distance,
      score,
      modified,
      isRandomPlonk
    }
  }

  getLocation(): Location_ {
    return this.seed!.rounds.at(-1)!
  }

  getLocations(): Location_[] {
    return this.seed!.rounds.map((round) => ({
      lat: round.lat,
      lng: round.lng,
      panoId: round.panoId,
      heading: Math.round(round.heading),
      pitch: Math.round(round.pitch),
      zoom: round.zoom
    }))
  }

  openGuesses() {
    this.guessesOpen = true
  }

  closeGuesses() {
    this.guessesOpen = false
  }

  getModeHelp(): string[] {
    var parts: string[] = []
    if (this.#settings.invertScoring)
    {
      parts.push("Inverted scoring")
    }

    if (this.#settings.isClosestInWrongCountryModeActivated)
    {
      parts.push("Wrong country only")
    }

    if (this.#settings.isGameOfChickenModeActivated)
    {
      parts.push("Game of chicken 🐔")

      if (this.#settings.chickenMode5kGivesPoints){
        parts.push(`Chicken can 5k`)
      }
      if (this.#settings.chickenModeSurvivesWith5k){
        parts.push(`5k avoids chicken`)
      }
    }



    if (this.#settings.isDartsMode)
    {
      const bustSign = this.#settings.isDartsModeBust ? '≤': ''
      parts.push(`Darts 🎯(${bustSign}${this.#settings.dartsTargetScore})`)
    }
    if (this.#settings.waterPlonkMode !== "normal"){
      if(this.#settings.waterPlonkMode === "illegal"){
        parts.push("🌊❌")
      }
      if(this.#settings.waterPlonkMode === "mandatory"){
        parts.push("🌊❗")
      }
    }
    if (this.#settings.countdownMode !== "normal"){
      if(this.#settings.countdownMode === "countdown"){
        parts.push("Countdown")
      }
      
      if(this.#settings.countdownMode === "countup"){
        parts.push("Countup")
      }
      
    }
    return parts
  }

  /**
   * Get the participants for the current round, sorted by who guessed first.
   */
  getRoundParticipants() {
    return this.#db.getRoundParticipants(this.#roundId!)
  }

  /**
   * Get the scores for the current round, sorted by distance from closest to farthest away.
   */
  getRoundResults() {
    return this.#db.getRoundResults(this.#roundId!)
  }

  finishGame() {
    return this.#db.finishGame(this.seed!.token)
  }

  /**
   * Get the combined scores for the current game, sorted from highest to lowest score.
   */
  getGameResults() {
    return this.#db.getGameResults(this.seed!.token)
  }

  get isFinished() {
    return this.seed && this.seed.state === 'finished'
  }

  get mapName() {
    return this.seed!.mapName
  }

  get mode() {
    return {
      noMove: this.seed!.forbidMoving,
      noPan: this.seed!.forbidRotating,
      noZoom: this.seed!.forbidZooming
    }
  }

  get round() {
    return this.seed!.round
  }
}
