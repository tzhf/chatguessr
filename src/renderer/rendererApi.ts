import { getLocalStorage, setLocalStorage } from './useLocalStorage'

let globalMap: google.maps.Map | undefined = undefined
const mapReady = hijackMap()

let guessMarkers: google.maps.Marker[] = []
let polylines: google.maps.Polyline[] = []

let satelliteLayer: google.maps.Map | undefined = undefined
let satelliteMarker: google.maps.Marker | undefined = undefined
const satelliteCanvas = document.createElement('div')
satelliteCanvas.id = 'satelliteCanvas'

function drawRoundResults(location: Location_, roundResults: RoundResult[], limit: number = 100) {
  const map = globalMap
  const infowindow = new google.maps.InfoWindow()

  roundResults.forEach((result, index) => {
    if (index >= limit) return

    const guessMarker = new google.maps.Marker({
      map,
      position: result.position,
      icon: makeIcon(result.player.avatar),
      label: {
        className: 'guess-marker-label',
        text: `${index + 1}`
      },
      optimized: true
    })
    guessMarker.addListener('mouseover', () => {
      infowindow.setContent(`
        ${result.player.flag ? `<span class="flag-icon" style="background-image: url(flag:${result.player.flag})"></span>` : ''}
        <span class="username" style="color:${result.player.color}">${result.player.username}</span><br>
        ${result.score}<br>
        ${toMeter(result.distance)}
      `)
      infowindow.open(map, guessMarker)
    })
    guessMarker.addListener('mouseout', () => {
      infowindow.close()
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

function drawPlayerResults(locations: Location_[], result: GameResultDisplay) {
  const map = globalMap
  clearMarkers()

  const infowindow = new google.maps.InfoWindow()
  const icon = makeIcon(result.player.avatar)

  result.guesses.forEach((guess, index) => {
    if (!guess) return
    // We cannot apply classes if 'optimized' is set to true, anyway it's just 5 markers here
    const guessMarker = new google.maps.Marker({ map, position: guess, icon, optimized: false })
    guessMarker.addListener('mouseover', () => {
      infowindow.setContent(`
				${result.player.flag ? `<span class="flag-icon" style="background-image: url(flag:${result.player.flag})"></span>` : ''}
        <span class="username" style="color:${result.player.color}">${result.player.username}</span><br>
        ${result.scores[index]}<br>
				${toMeter(result.distances[index]!)}
			`)
      infowindow.open(map, guessMarker)
    })
    guessMarker.addListener('mouseout', () => {
      infowindow.close()
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

function makeIcon(_avatar: string | null): google.maps.Icon {
  const avatar = _avatar ?? 'asset:avatar-default.jpg'
  return {
    url: avatar + '#custom_marker',
    scaledSize: new google.maps.Size(32, 32),
    anchor: new google.maps.Point(16, 16),
    labelOrigin: new google.maps.Point(27, 27)
  }
}

function clearMarkers() {
  for (const marker of guessMarkers) {
    marker.setMap(null)
  }
  for (const line of polylines) {
    line.setMap(null)
  }
  guessMarkers = []
  polylines = []
}

async function showSatelliteMap(location: LatLng) {
  await mapReady

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
    restriction: {
      latLngBounds: getBounds(location, satelliteMode.boundsLimit),
      strictBounds: true
    }
  })

  satelliteLayer.setCenter(location)
  satelliteLayer.setZoom(15)

  satelliteMarker?.setMap(null)

  satelliteMarker = new google.maps.Marker({
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

function toMeter(distance: number) {
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

    function onMapUpdate(map: google.maps.Map) {
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
