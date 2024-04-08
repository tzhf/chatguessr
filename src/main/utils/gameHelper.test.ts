import { describe, it, expect } from 'vitest'
import * as GameHelper from './gameHelper'

describe('getCountryCode', () => {
  // These are not political opinions, but checks to ensure we match whatever decisions
  // GeoGuessr has made, even when those decisions are bad.

  it('identifies the country', async () => {
    const korea = { lat: 37.00990352577917, lng: 128.60820945116575 }
    await expect(GameHelper.getCountryCode(korea)).resolves.toBe('KR')
    const luxNearBorder = { lat: 50.18241242506854, lng: 6.022353016459996 }
    await expect(GameHelper.getCountryCode(luxNearBorder)).resolves.toBe('LU')
    const nearNorthPole = { lat: 87.94532231211203, lng: 102.72437132716654 }
    await expect(GameHelper.getCountryCode(nearNorthPole)).resolves.toBe(undefined)
  })
  it('counts islands near China under TW rule as Taiwan', async () => {
    const kinmen = { lat: 24.478693881519966, lng: 118.30351505188996 }
    await expect(GameHelper.getCountryCode(kinmen)).resolves.toBe('TW')
    const lienchiang = { lat: 26.1640452690357, lng: 119.91813403003158 }
    await expect(GameHelper.getCountryCode(lienchiang)).resolves.toBe('TW')
    const dongyin = { lat: 26.37011790575555, lng: 120.48353606410257 }
    await expect(GameHelper.getCountryCode(dongyin)).resolves.toBe('TW')
  })
  it('counts HK/Macao as China', async () => {
    const hongKong = { lat: 22.424952693214557, lng: 114.12527863797602 }
    await expect(GameHelper.getCountryCode(hongKong)).resolves.toBe('CN')
    const macao = { lat: 22.17174108804142, lng: 113.53648510492957 }
    await expect(GameHelper.getCountryCode(macao)).resolves.toBe('CN')
  })
  it('counts Israel/Palestine as the same country', async () => {
    const il = await GameHelper.getCountryCode({ lat: 32.034961561407215, lng: 34.75764745886409 })
    const ps = await GameHelper.getCountryCode({ lat: 31.862835854507576, lng: 35.456499397290635 })
    expect(il).toBe(ps)
  })
  it('counts Åland as Finland', async () => {
    const aland = { lat: 60.41415638472204, lng: 20.309877225436857 }
    await expect(GameHelper.getCountryCode(aland)).resolves.toBe('FI')
  })
  it('counts Lesotho as Lesotho', async () => {
    const ls = { lat: -29.496987596535757, lng: 28.212890625 }
    expect(await GameHelper.getCountryCode(ls)).toBe('LS')
  })
  it("counts Campione d'Italia as Italy", async () => {
    const campione = { lat: 45.9689301700563, lng: 8.97377014160156 }
    expect(await GameHelper.getCountryCode(campione)).toBe('IT')
  })
  it('counts San Marino', async () => {
    const sanMarino = { lat: 43.937461690316646, lng: 12.47222900390625 }
    expect(await GameHelper.getCountryCode(sanMarino)).toBe('SM')
  })
  it('counts Vatican City', async () => {
    const vatican = { lat: 41.903363034132724, lng: 12.452659606933594 }
    expect(await GameHelper.getCountryCode(vatican)).toBe('VA')
  })
  it('Baarle-Nassau and Baarle-Hertog are resolved properly', async () => {
    const nl = { lat: 51.439391, lng: 4.931514 }
    const be = { lat: 51.445161, lng: 4.94144 }
    expect(await GameHelper.getCountryCode(nl)).toBe('NL')
    expect(await GameHelper.getCountryCode(be)).toBe('BE')
  })
  it('the Vennbahn is resolved properly', async () => {
    const de = { lat: 50.563848, lng: 6.211089 }
    const be = { lat: 50.563992, lng: 6.231465 }
    expect(await GameHelper.getCountryCode(de)).toBe('DE')
    expect(await GameHelper.getCountryCode(be)).toBe('BE')
  })
  it('counts Llívia as spain', async () => {
    const es = { lat: 42.465134, lng: 1.976742 }
    expect(await GameHelper.getCountryCode(es)).toBe('ES')
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
})
