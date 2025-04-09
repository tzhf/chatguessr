import { getLocalStorage, setLocalStorage } from './useLocalStorage'

let globalMap: google.maps.Map | undefined = undefined
const mapReady = hijackMap()

let guessMarkers: google.maps.marker.AdvancedMarkerElement[] = []
let polylines: google.maps.Polyline[] = []

let satelliteLayer: google.maps.Map | undefined = undefined
let satelliteMarker: google.maps.marker.AdvancedMarkerElement | undefined = undefined
const satelliteCanvas = document.createElement('div')
satelliteCanvas.id = 'satelliteCanvas'

async function loadMarkerLibrary() {
  return (await google.maps.importLibrary('marker')) as unknown as google.maps.MarkerLibrary
}

async function drawRoundResults(
  location: Location_,
  roundResults: RoundResult[],
  limit: number = 100
) {
  const { AdvancedMarkerElement } = await loadMarkerLibrary()

  const map = globalMap

  const infoWindow = createInfoWindow()

  roundResults.forEach((result, index) => {
    if (index >= limit) return

    const guessMarkerContent = createCustomGuessMarker(result.player.avatar, index)
    const guessMarker = new AdvancedMarkerElement({
      map,
      position: result.position,
      content: guessMarkerContent
    })

    guessMarkerContent.addEventListener('mouseover', () => {
      infoWindow.setContent(`
        ${result.player.flag ? `<span class="flag-icon" style="background-image: url(flag:${result.player.flag})"></span>` : ''}
        <span class="username" style="color:${result.player.color}">${result.player.username}</span><br>
        ${result.score}<br>
        ${parseDistance(result.distance)}
      `)
      infoWindow.open(map, guessMarker)
    })
    guessMarkerContent.addEventListener('mouseout', () => {
      infoWindow.close()
    })

    guessMarkers.push(guessMarker)

    polylines.push(
      new google.maps.Polyline({
        path: [result.position, location],
        map,
        strokeColor: result.player.color,
        strokeWeight: 4,
        strokeOpacity: 0.6,
        geodesic: true
      })
    )
  })
}

async function drawPlayerResults(locations: Location_[], result: GameResultDisplay) {
  const { AdvancedMarkerElement } = await loadMarkerLibrary()

  const map = globalMap

  clearMarkers()

  const infoWindow = createInfoWindow()

  result.guesses.forEach((guess, index) => {
    if (!guess) return

    const guessMarkerContent = createCustomGuessMarker(result.player.avatar)
    const guessMarker = new AdvancedMarkerElement({
      map,
      position: guess,
      content: guessMarkerContent
    })

    guessMarkerContent.addEventListener('mouseover', () => {
      infoWindow.setContent(`
				${result.player.flag ? `<span class="flag-icon" style="background-image: url(flag:${result.player.flag})"></span>` : ''}
        <span class="username" style="color:${result.player.color}">${result.player.username}</span><br>
        ${result.scores[index]}<br>
				${parseDistance(result.distances[index]!)}
			`)
      infoWindow.open(map, guessMarker)
    })
    guessMarkerContent.addEventListener('mouseout', () => {
      infoWindow.close()
    })
    guessMarkers.push(guessMarker)

    polylines.push(
      new google.maps.Polyline({
        path: [guess, locations[index]],
        map,
        strokeColor: result.player.color,
        strokeWeight: 4,
        strokeOpacity: 0.6,
        geodesic: true
      })
    )
  })
}

function focusOnGuess(location: LatLng) {
  if (!globalMap) return
  globalMap.setCenter(location)
  globalMap.setZoom(8)
}

function createInfoWindow() {
  return new google.maps.InfoWindow({
    pixelOffset: new google.maps.Size(0, 10)
  })
}

function createCustomGuessMarker(avatar: string | null, index?: number) {
  const markerEl = document.createElement('div')
  markerEl.className = 'custom-guess-marker'

  const avatarImg = document.createElement('img')
  avatarImg.src = avatar ?? 'asset:avatar-default.jpg'
  avatarImg.className = 'custom-guess-marker--avatar'
  markerEl.appendChild(avatarImg)

  if (index !== undefined) {
    const labelText = document.createElement('span')
    labelText.textContent = `${index + 1}`

    const labelSpan = document.createElement('span')
    labelSpan.className = 'custom-guess-marker--label'
    labelSpan.appendChild(labelText)

    markerEl.appendChild(labelSpan)
  }

  return markerEl
}

function clearMarkers() {
  for (const marker of guessMarkers) {
    marker.map = null
  }
  for (const line of polylines) {
    line.setMap(null)
  }
  guessMarkers = []
  polylines = []
}

async function showSatelliteMap(location: LatLng) {
  await mapReady
  const { AdvancedMarkerElement } = await loadMarkerLibrary()

  const satelliteMode = getLocalStorage('cg_satelliteMode__settings', { boundsLimit: 10 })

  if (!document.body.contains(satelliteCanvas)) {
    document.querySelector('[data-qa="panorama"] [aria-label="Map"]')?.append(satelliteCanvas)
  }
  satelliteCanvas.style.display = 'block'

  satelliteLayer ??= new google.maps.Map(satelliteCanvas, {
    fullscreenControl: false,
    mapTypeId: google.maps.MapTypeId.SATELLITE
  })

  satelliteLayer.setOptions({
    mapId: 'SATELLITE_LAYER',
    restriction: {
      latLngBounds: getBounds(location, satelliteMode.boundsLimit),
      strictBounds: true
    }
  })

  satelliteLayer.setCenter(location)
  satelliteLayer.setZoom(15)

  if (satelliteMarker) satelliteMarker.map = null

  satelliteMarker = new AdvancedMarkerElement({
    position: location,
    map: satelliteLayer
  })
}

async function hideSatelliteMap() {
  await mapReady
  satelliteCanvas.style.display = 'none'
}

function centerSatelliteView(location: LatLng) {
  if (!satelliteLayer) return
  satelliteLayer.setCenter(location)
}

function getBounds(location: LatLng, limitInKm: number) {
  const meters = (limitInKm * 1000) / 2
  const earth = 6371.071
  const pi = Math.PI
  const m = 1 / (((2 * pi) / 360) * earth) / 1000

  const north = location.lat + meters * m
  const south = location.lat - meters * m
  const west = location.lng - (meters * m) / Math.cos(location.lat * (pi / 180))
  const east = location.lng + (meters * m) / Math.cos(location.lat * (pi / 180))

  return { north, south, west, east }
}

function parseDistance(distance: number) {
  return distance >= 1 ? distance.toFixed(1) + 'km' : Math.floor(distance * 1000) + 'm'
}

async function hijackMap() {
  const MAPS_API_URL = 'https://maps.googleapis.com/maps/api/js?'
  const MAPS_SCRIPT_SELECTOR = `script[src^="${MAPS_API_URL}"]`
  await new Promise((resolve) => {
    let bodyDone = false
    let headDone = false

    function checkBodyDone() {
      if (!bodyDone && document.body) {
        scriptObserver.observe(document.body, { childList: true })
        bodyDone = true
      }
    }
    function checkHeadDone() {
      if (!headDone && document.head) {
        scriptObserver.observe(document.head, { childList: true })
        headDone = true
      }
    }

    /**
     * Check if `element` is a Google Maps script tag and resolve the outer Promise if so.
     */
    function checkMapsScript(element: Element) {
      if (element.matches(MAPS_SCRIPT_SELECTOR)) {
        const onload = () => {
          pageObserver.disconnect()
          scriptObserver.disconnect()
          resolve(undefined)
        }
        // It may already be loaded :O
        if (typeof google !== 'undefined' && google?.maps?.Map) {
          onload()
        } else {
          element.addEventListener('load', onload)
        }
      }
    }

    const scriptObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const tmp of mutation.addedNodes) {
          if (tmp.nodeType === Node.ELEMENT_NODE) {
            checkMapsScript(tmp as Element)
          }
        }
      }
    })
    const pageObserver = new MutationObserver((_, observer) => {
      checkBodyDone()
      checkHeadDone()
      if (headDone && bodyDone) {
        observer.disconnect()
      }
    })

    pageObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    })

    // Do an initial check, we may be running in a fully loaded game already.
    checkBodyDone()
    checkHeadDone()
    const existingTag: HTMLElement | null = document.querySelector(MAPS_SCRIPT_SELECTOR)
    if (existingTag) checkMapsScript(existingTag)
  })

  await new Promise<void>((resolve, reject) => {
    const google = window.google
    const isGamePage = () =>
      location.pathname.startsWith('/results/') || location.pathname.startsWith('/game/')

    async function onMapUpdate(map: google.maps.Map) {
      try {
        if (!isGamePage()) return
        globalMap = map
        resolve()
      } catch (err) {
        console.error('GeoguessrHijackMap Error:', err)
        reject(err)
      }
    }

    google.maps.Map = class extends google.maps.Map {
      constructor(mapDiv: HTMLElement, opts: google.maps.MapOptions) {
        super(mapDiv, opts)
        this.addListener('idle', () => {
          if (globalMap == null) {
            onMapUpdate(this)
          }
        })
        this.addListener('maptypeid_changed', () => {
          // Save the map type ID so we can prevent GeoGuessr from resetting it
          setLocalStorage('cg_MapTypeId', this.getMapTypeId())
        })
      }

      setOptions(opts: google.maps.MapOptions) {
        // GeoGuessr's `setOptions` calls always include `backgroundColor`
        // so this is how we can distinguish between theirs and ours
        if (opts.backgroundColor) {
          opts.mapTypeId = getLocalStorage('cg_MapTypeId', opts.mapTypeId)
          opts.mapTypeControl = true
          opts.mapTypeControlOptions = {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_RIGHT
          }
        }
        super.setOptions(opts)
      }
    }
  })
}

export const rendererApi = {
  drawRoundResults,
  drawPlayerResults,
  focusOnGuess,
  clearMarkers,
  showSatelliteMap,
  hideSatelliteMap,
  centerSatelliteView
}
