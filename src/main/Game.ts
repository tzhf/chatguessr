import pMap from 'p-map'

import {
  latLngEqual,
  calculateScale,
  fetchSeed,
  getStreakCode,
  haversineDistance,
  calculateScore
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
   * Streak code for the current round's location.
   */
  #streakCode: string | undefined

  seed: Seed | undefined

  mapScale: number | undefined

  location: Location_ | undefined

  lastLocation: LatLng | undefined

  isInGame = false

  guessesOpen = false

  isMultiGuess = false

  streamerDidRandomPlonk = false

  constructor(db: Database, settings: Settings) {
    this.#db = db
    this.#settings = settings
    this.lastLocation = this.#db.getLastRoundLocation()
  }

  async start(url: string, isMultiGuess: boolean) {
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
        this.#roundId = this.#db.createRound(this.seed.token, this.seed.rounds[0])
      } catch (err) {
        // In this case we are restoring an existing game.
        if (err instanceof Error && err.message.includes('UNIQUE constraint failed: games.id')) {
          this.#roundId = this.#db.getCurrentRound(this.seed.token)
        } else {
          throw err
        }
      }

      this.mapScale = calculateScale(this.seed.bounds)
      this.#assignStreakCode()
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
        this.#roundId = this.#db.createRound(this.seed!.token, this.seed.rounds.at(-1)!)
        this.#assignStreakCode()
      } else {
        this.#roundId = undefined
      }

      return { location, roundResults }
      // Else, if only the loc has changed, the location was skipped, replace current loc
    } else if (newSeed && this.#locHasChanged(newSeed)) {
      this.seed = newSeed
      this.#roundId = this.#db.createRound(this.seed!.token, this.seed.rounds.at(-1)!)

      this.#assignStreakCode()

      return false
    }
  }

  async #getSeed() {
    return this.#url ? await fetchSeed(this.#url) : undefined
  }

  async #assignStreakCode() {
    this.location = this.getLocation()
    this.#streakCode = await getStreakCode(this.location)

    this.#db.setRoundStreakCode(this.#roundId!, this.#streakCode ?? null)
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
        if (guess.streakCode === this.#streakCode) {
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

    const streakCode = await getStreakCode(location)
    const lastStreak = this.#db.getUserStreak(dbUser.id)
    const correct = streakCode === this.#streakCode
    if (correct) {
      this.#db.addUserStreak(dbUser.id, this.#roundId!)
    } else {
      this.#db.resetUserStreak(dbUser.id)
    }

    const distance = haversineDistance(location, this.location!)
    const score = streamerGuess.timedOut ? 0 : calculateScore(distance, this.mapScale!)

    const streak = this.#db.getUserStreak(dbUser.id)

    this.#db.createGuess(this.#roundId!, dbUser.id, {
      location,
      streakCode: streakCode ?? null,
      streak: streak?.count ?? 0,
      lastStreak: lastStreak?.count && !correct ? lastStreak.count : null,
      distance,
      score,
      isRandomPlonk: this.streamerDidRandomPlonk ? 1 : 0
    })
    this.streamerDidRandomPlonk = false
  }

  async handleUserGuess(
    userstate: UserData,
    location: LatLng,
    isRandomPlonk: boolean = false
  ): Promise<Guess> {
    const dbUser = this.#db.getOrCreateUser(
      userstate['user-id'],
      userstate['display-name'],
      userstate.avatar,
      userstate.color
    )

    if (!dbUser) throw Object.assign(new Error('Something went wrong creating dbUser'))

    const existingGuess = this.#db.getUserGuess(this.#roundId!, dbUser.id)
    if (existingGuess && !this.isMultiGuess) {
      throw Object.assign(new Error('User already guessed'), {
        code: 'alreadyGuessed',
        player: {
          username: dbUser.username,
          flag: dbUser.flag
        }
      })
    }

    if (dbUser.previousGuess && latLngEqual(dbUser.previousGuess, location)) {
      throw Object.assign(new Error('Same guess'), {
        code: 'submittedPreviousGuess',
        player: {
          username: dbUser.username,
          flag: dbUser.flag
        }
      })
    }

    const distance = haversineDistance(location, this.location!)
    const score = calculateScore(distance, this.mapScale!)

    const streakCode = await getStreakCode(location)
    const correct = streakCode === this.#streakCode
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
      streakCode: streakCode ?? null,
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
