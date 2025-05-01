import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import * as GameHelper from './gameHelper'

describe('getStreakCode', () => {
  // These are not political opinions, but checks to ensure we match whatever decisions
  // GeoGuessr has made, even when those decisions are bad.

  it('identifies the country', async () => {
    const korea = { lat: 37.00990352577917, lng: 128.60820945116575 }
    await expect(GameHelper.getStreakCode(korea)).resolves.toBe('KR')
    const luxNearBorder = { lat: 50.18241242506854, lng: 6.022353016459996 }
    await expect(GameHelper.getStreakCode(luxNearBorder)).resolves.toBe('LU')
    const nearNorthPole = { lat: 87.94532231211203, lng: 102.72437132716654 }
    await expect(GameHelper.getStreakCode(nearNorthPole)).resolves.toBe(undefined)
  })
  it('counts TW islands near China as Taiwan', async () => {
    const kinmen = { lat: 24.478693881519966, lng: 118.30351505188996 }
    await expect(GameHelper.getStreakCode(kinmen)).resolves.toBe('TW')
    const lienchiang = { lat: 26.1640452690357, lng: 119.91813403003158 }
    await expect(GameHelper.getStreakCode(lienchiang)).resolves.toBe('TW')
    const dongyin = { lat: 26.37011790575555, lng: 120.48353606410257 }
    await expect(GameHelper.getStreakCode(dongyin)).resolves.toBe('TW')
  })
  it('counts HK/Macao as China', async () => {
    const hongKong = { lat: 22.424952693214557, lng: 114.12527863797602 }
    await expect(GameHelper.getStreakCode(hongKong)).resolves.toBe('CN')
    const macao = { lat: 22.17174108804142, lng: 113.53648510492957 }
    await expect(GameHelper.getStreakCode(macao)).resolves.toBe('CN')
  })
  it('counts Israel/Palestine as the same country', async () => {
    const il = await GameHelper.getStreakCode({ lat: 32.034961561407215, lng: 34.75764745886409 })
    const ps = await GameHelper.getStreakCode({ lat: 31.862835854507576, lng: 35.456499397290635 })
    expect(il).toBe(ps)
  })
  it('counts Åland as Finland', async () => {
    const aland = { lat: 60.41415638472204, lng: 20.309877225436857 }
    await expect(GameHelper.getStreakCode(aland)).resolves.toBe('FI')
  })
  it('counts Lesotho as Lesotho', async () => {
    const ls = { lat: -29.496987596535757, lng: 28.212890625 }
    expect(await GameHelper.getStreakCode(ls)).toBe('LS')
  })
  it("counts Campione d'Italia as Italy", async () => {
    const campione = { lat: 45.9689301700563, lng: 8.97377014160156 }
    expect(await GameHelper.getStreakCode(campione)).toBe('IT')
  })
  it('counts San Marino', async () => {
    const sanMarino = { lat: 43.937461690316646, lng: 12.47222900390625 }
    expect(await GameHelper.getStreakCode(sanMarino)).toBe('SM')
  })
  it('counts Vatican City', async () => {
    const vatican = { lat: 41.903363034132724, lng: 12.452659606933594 }
    expect(await GameHelper.getStreakCode(vatican)).toBe('VA')
  })
  it('Baarle-Nassau and Baarle-Hertog are resolved properly', async () => {
    const nl = { lat: 51.439391, lng: 4.931514 }
    const be = { lat: 51.445161, lng: 4.94144 }
    expect(await GameHelper.getStreakCode(nl)).toBe('NL')
    expect(await GameHelper.getStreakCode(be)).toBe('BE')
  })
  it('the Vennbahn is resolved properly', async () => {
    const de = { lat: 50.563848, lng: 6.211089 }
    const be = { lat: 50.563992, lng: 6.231465 }
    expect(await GameHelper.getStreakCode(de)).toBe('DE')
    expect(await GameHelper.getStreakCode(be)).toBe('BE')
  })
  it('counts Llívia as spain', async () => {
    const es = { lat: 42.465134, lng: 1.976742 }
    expect(await GameHelper.getStreakCode(es)).toBe('ES')
  })
})

describe('parseCoordinates', () => {
  it("Checks if '30.12345, 50.54321' are valid coordinates >> true", () => {
    expect(GameHelper.parseCoordinates('30.12345, 50.54321')).toBeTruthy()
  })
  it("Checks if '30.12345,50.54321' are valid coordinates >> true", () => {
    expect(GameHelper.parseCoordinates('30.12345,50.54321')).toBeTruthy()
  })
  it("Checks if '-30.12345, -50.54321' are valid coordinates >> true", () => {
    const coord = GameHelper.parseCoordinates('-30.12345, -50.54321')
    expect(coord).toBeDefined()
    expect(coord!.lat).toBeCloseTo(-30.12345, 4)
    expect(coord!.lng).toBeCloseTo(-50.54321, 4)
  })
  it("Checks if '-30.12345,-50.54321' are valid coordinates >> true", () => {
    expect(GameHelper.parseCoordinates('-30.12345,-50.54321')).toBeTruthy()
  })
  it("Checks if '95.12345, 50.54321' are invalid coordinates >> false", () => {
    expect(GameHelper.parseCoordinates('95.12345, 50.54321')).toBeFalsy()
  })
  it("Checks if '30.12345, 190.54321' are invalid coordinates >> false", () => {
    expect(GameHelper.parseCoordinates('30.12345, 190.54321')).toBeFalsy()
  })
})

describe('randomPlonk', () => {
  // Requires ~30ms/test
  const repeats = 100
  it('Checks if randomplonk without bounds avoids antarctica', async () => {
    // This takes about 30ms/test, so ...
    for (let i = 0; i < repeats; i++) {
      const { lat, lng } = await GameHelper.getRandomCoordsInLand()
      expect(lat > -60).toBeTruthy()
      expect(lat < 90).toBeTruthy()
      expect(lng > -180).toBeTruthy()
      expect(lng < 180).toBeTruthy()
    }
  })
  it('Checks if randomplonk with bounds remains in bounds', async () => {
    const inBounds = { min: { lat: 32, lng: -117 }, max: { lat: 33, lng: -116 } }
    for (let i = 0; i < repeats; i++) {
      const { lat, lng } = await GameHelper.getRandomCoordsInLand(inBounds)
      expect(lat > inBounds.min.lat).toBeTruthy()
      expect(lat < inBounds.max.lat).toBeTruthy()
      expect(lng > inBounds.min.lng).toBeTruthy()
      expect(lng < inBounds.max.lng).toBeTruthy()
    }
  })
}, 10000)

describe('parseUserDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Handles undefined date as epoch=0', async () => {
    expect(await GameHelper.parseUserDate(undefined)).toEqual({ timeStamp: 0 })
  })

  it('Handles empty date as epoch=0', async () => {
    expect(await GameHelper.parseUserDate('')).toEqual({ timeStamp: 0 })
  })

  it('Parses "day" correctly', async () => {
    vi.setSystemTime(new Date('2000-01-17T16:01:23'))
    const dateInfo = await GameHelper.parseUserDate('day')
    expect(dateInfo.timeStamp).toEqual(
      GameHelper.dateToUnixTimestamp(new Date('2000-01-17T00:00:00'))
    )
  })

  it('Parses "week" correctly', async () => {
    const monday = '2024-04-15:01:23'
    vi.setSystemTime(new Date(monday))
    let dateInfo = await GameHelper.parseUserDate('week')
    expect(dateInfo.timeStamp).toEqual(GameHelper.dateToUnixTimestamp(new Date('2024-04-15:00:00')))
    const sunday = '2024-04-21:01:23'
    vi.setSystemTime(new Date(sunday))
    dateInfo = await GameHelper.parseUserDate('week')
    expect(dateInfo.timeStamp).toEqual(GameHelper.dateToUnixTimestamp(new Date('2024-04-15:00:00')))
  })

  it('Parses "month" correctly', async () => {
    vi.setSystemTime(new Date('2001-01-17T16:01:23'))
    const dateInfo = await GameHelper.parseUserDate('month')
    expect(dateInfo.timeStamp).toEqual(
      GameHelper.dateToUnixTimestamp(new Date('2001-01-01T00:00:00'))
    )
  })

  it('Parses "year" correctly', async () => {
    vi.setSystemTime(new Date('2002-04-17T16:01:23'))
    const dateInfo = await GameHelper.parseUserDate('year')
    expect(dateInfo.timeStamp).toEqual(
      GameHelper.dateToUnixTimestamp(new Date('2002-01-01T00:00:00'))
    )
  })
})
