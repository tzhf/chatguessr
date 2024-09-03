import { beforeEach, describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { database } from './Database'

let db: Database

beforeEach(() => {
  db = database(':memory:')
})

function createGame() {
  const token = randomUUID()
  db.createGame({
    token,
    map: 'test',
    mapName: 'test',
    bounds: {
      min: { lat: 0, lng: 0 },
      max: { lat: 0, lng: 0 }
    },
    forbidMoving: true,
    forbidRotating: false,
    forbidZooming: false,
    timeLimit: 0
  } as Seed)
  return token
}

describe('userGuessedOnOngoingRound', () => {
  it('returnsTrueWhenUserHasGuessed', () => {
    const broadcaster = db.getOrCreateUser('BROADCASTER', 'BROADCASTER', undefined, undefined)
    const user = db.getOrCreateUser('1234567', 'libjanosgeo', undefined, undefined)
    const secondUser = db.getOrCreateUser('2345678', 'secondUser', undefined, undefined)

    const token = createGame()
    const firstRoundId = db.createRound(token, {
      lat: 0,
      lng: 0,
      panoId: null,
      heading: 0,
      pitch: 0,
      zoom: 0
    })

    expect(db.userGuessedOnOngoingRound(user!.id)).toEqual(false)
    expect(db.userGuessedOnOngoingRound(secondUser!.id)).toEqual(false)

    db.createGuess(firstRoundId, user!.id, {
      location: { lat: 0, lng: 0 },
      streakCode: null,
      streak: 1,
      lastStreak: null,
      distance: 0,
      score: 5000,
      isRandomPlonk: null
    })

    expect(db.userGuessedOnOngoingRound(user!.id)).toEqual(true)
    expect(db.userGuessedOnOngoingRound(secondUser!.id)).toEqual(false)

    // When broadcaster has guessed, round ends
    db.createGuess(firstRoundId, broadcaster!.id, {
      location: { lat: 0, lng: 0 },
      streakCode: null,
      streak: 1,
      lastStreak: null,
      distance: 0,
      score: 2500,
      isRandomPlonk: null
    })
    expect(db.userGuessedOnOngoingRound(user!.id)).toEqual(false)
    expect(db.userGuessedOnOngoingRound(secondUser!.id)).toEqual(false)
  })
})

describe('getUserStats', () => {
  it('counts victories', () => {
    const user = db.getOrCreateUser('1234567', 'libreanna', undefined, undefined)
    const token = createGame()
    const createGuess = () => {
      const roundId = db.createRound(token, {
        lat: 0,
        lng: 0,
        panoId: null,
        heading: 0,
        pitch: 0,
        zoom: 0
      })
      db.createGuess(roundId, user!.id, {
        location: { lat: 0, lng: 0 },
        streakCode: null,
        streak: 0,
        lastStreak: null,
        distance: 0,
        score: 5000,
        isRandomPlonk: 0
      })
    }

    for (let i = 0; i < 5; i += 1) {
      createGuess()
    }

    // Now on round 5: this should not yet be counted as a victory
    expect(db.getUserStats(user!.id)!.victories).toEqual(0)

    db.finishGame(token)

    // Only once the game is finished, it counts.
    expect(db.getUserStats(user!.id)!.victories).toEqual(1)
  })
})

describe('getRoundResults', () => {
  it('sorts by score and distance', () => {
    const user = db.getOrCreateUser('1234567', 'libreanna', undefined, undefined)
    const user2 = db.getOrCreateUser('1234568', 'zehef_', undefined, undefined)
    const user3 = db.getOrCreateUser('1234569', 'mramericanmike', undefined, undefined)
    const token = createGame()

    const roundId = db.createRound(token, {
      lat: 0,
      lng: 0,
      panoId: null,
      heading: 0,
      pitch: 0,
      zoom: 0
    })

    db.createGuess(roundId, user2!.id, {
      location: { lat: 0, lng: 0 },
      streakCode: null,
      streak: 0,
      lastStreak: null,
      distance: 1234,
      score: 3000,
      isRandomPlonk: 0
    })
    db.createGuess(roundId, user!.id, {
      location: { lat: 0, lng: 0 },
      streakCode: null,
      streak: 0,
      lastStreak: null,
      distance: 1000,
      score: 3600,
      isRandomPlonk: 0
    })
    db.createGuess(roundId, user3!.id, {
      location: { lat: 0, lng: 0 },
      streakCode: null,
      streak: 0,
      lastStreak: null,
      distance: 998,
      score: 3600,
      isRandomPlonk: 0
    })

    const leaderboard = db.getRoundResults(roundId).map((score) => score.player.username)
    expect(leaderboard).toEqual(['mramericanmike', 'libreanna', 'zehef_'])
  })

  it('sorts 5Ks by time', async () => {
    const user = db.getOrCreateUser('1234567', 'libreanna', undefined, undefined)
    const user2 = db.getOrCreateUser('1234568', 'zehef_', undefined, undefined)
    const user3 = db.getOrCreateUser('1234569', 'mramericanmike', undefined, undefined)
    const token = createGame()

    const roundId = db.createRound(token, {
      lat: 0,
      lng: 0,
      panoId: null,
      heading: 0,
      pitch: 0,
      zoom: 0
    })

    db.createGuess(roundId, user!.id, {
      location: { lat: 0, lng: 0 },
      streakCode: null,
      streak: 0,
      lastStreak: null,
      distance: 12,
      score: 5000,
      isRandomPlonk: 0
    })
    db.createGuess(roundId, user3!.id, {
      location: { lat: 0, lng: 0 },
      streakCode: null,
      streak: 0,
      lastStreak: null,
      distance: 998,
      score: 4800,
      isRandomPlonk: 0
    })
    const second5k = db.createGuess(roundId, user2!.id, {
      location: { lat: 0, lng: 0 },
      streakCode: null,
      streak: 0,
      lastStreak: null,
      distance: 8,
      score: 5000,
      isRandomPlonk: 0
    })

    // `second5k` was closer, but 20 seconds later,
    // so it should show up *after* the first 5K.
    // TODO maybe we can use jest simulated timers for this
    db[Symbol.for('chatguessr-test-run-query')](
      'UPDATE guesses SET created_at = created_at + 20 WHERE id = :id',
      { id: second5k }
    )

    const leaderboard = db.getRoundResults(roundId).map((score) => score.player.username)
    expect(leaderboard).toEqual(['libreanna', 'zehef_', 'mramericanmike'])
  })

  it('sorts by time in multi-guess', async () => {
    const user = db.getOrCreateUser('1234567', 'libreanna', undefined, undefined)
    const user2 = db.getOrCreateUser('1234568', 'zehef_', undefined, undefined)
    const token = createGame()

    const roundId = db.createRound(token, {
      lat: 0,
      lng: 0,
      panoId: null,
      heading: 0,
      pitch: 0,
      zoom: 0
    })

    const non5k = db.createGuess(roundId, user!.id, {
      location: { lat: 0, lng: 0 },
      streakCode: null,
      streak: 0,
      lastStreak: null,
      distance: 988,
      score: 4924,
      isRandomPlonk: 0
    })
    // adjust `non5k` to be significantly earlier than user2's 5K,
    // so it is earlier but worse by not being a 5K. Then we can check that after
    // updating the guess, the time is also updated.
    db[Symbol.for('chatguessr-test-run-query')](
      'UPDATE guesses SET created_at = created_at - 20 WHERE id = :id',
      { id: non5k }
    )

    db.createGuess(roundId, user2!.id, {
      location: { lat: 0, lng: 0 },
      streakCode: null,
      streak: 0,
      lastStreak: null,
      distance: 8,
      score: 5000,
      isRandomPlonk: 0
    })
    db.updateGuess(non5k, {
      location: { lat: 0, lng: 0 },
      streakCode: null,
      streak: 0,
      lastStreak: null,
      distance: 12,
      score: 5000,
      isRandomPlonk: 0
    })

    const leaderboard = db.getRoundResults(roundId).map((score) => score.player.username)
    expect(leaderboard).toEqual(['zehef_', 'libreanna'])
  })
})
