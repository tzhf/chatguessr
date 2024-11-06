<template>
  <div :class="['cg-frame-container', { hidden: gameState === 'none' }]">
    <transition name="scoreboard_modal">
      <Scoreboard
        v-show="widgetVisibility.scoreboardAndGgInterfaceVisible"
        ref="scoreboard"
        :game-state
        :is-multi-guess
        :is-b-r-mode
        :mode-help
        :on-round-result-row-click
        :on-game-result-row-click
      />
    </transition>
    <div id="debugElement" style="background: hotpink; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 1.5rem; display:none;">
      <b>Debug stuff!</b>
      <div id="map" style="height: 400px; width: 100%;"></div>
    <div id="pano" style="height: 400px; width: 100%;"></div>


    </div>
    <Timer
      :game-state
      :class="{ hidden: gameState !== 'in-round' || !widgetVisibility.timerVisible }"
    />
  </div>

  <div class="cg-menu">
    <button
      :class="['cg-button', twitchConnectionState.state]"
      title="Settings"
      @click="settingsVisible = true"
    >
      <IconGear />
    </button>

    <button class="cg-button" title="Show/Hide Leaderboard" @click="leaderboardVisible = true">
      <IconLeaderboard />
    </button>

    <button
      class="cg-button"
      title="Show/Hide timer"
      :hidden="gameState === 'none'"
      @click="widgetVisibility.timerVisible = !widgetVisibility.timerVisible"
    >
      <IconTimerVisible v-if="widgetVisibility.timerVisible" />
      <IconTimerHidden v-else />
    </button>

    <button
      class="cg-button"
      title="Show/Hide Scoreboard"
      :hidden="gameState === 'none'"
      @click="widgetVisibility.scoreboardAndGgInterfaceVisible = !widgetVisibility.scoreboardAndGgInterfaceVisible"
    >
      <IconScoreboardVisible v-if="widgetVisibility.scoreboardAndGgInterfaceVisible" />
      <IconScoreboardHidden v-else />
    </button>
    
    <button
      class="cg-button"
      title="Randomplonk for Streamer"
      :hidden="gameState === 'none'"
      @click="onStreamerRandomplonk"
    >
      <IconDice v-if="widgetVisibility.scoreboardAndGgInterfaceVisible" />
      <IconDice v-else />
    </button>

    <button
      class="cg-button"
      title="Center view"
      :hidden="!satelliteMode.value.enabled || gameState !== 'in-round'"
      @click="onClickCenterSatelliteView"
    >
      <IconStartFlag />
    </button>
  </div>

  <Suspense>
    <Modal :is-visible="settingsVisible" @close="settingsVisible = false">
      <Settings :socket-connection-state :twitch-connection-state />
    </Modal>
  </Suspense>

  <Suspense>
    <Modal :is-visible="leaderboardVisible" @close="leaderboardVisible = false">
      <Leaderboard />
    </Modal>
  </Suspense>
</template>

<script lang="ts" setup>
import { shallowRef, reactive, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useStyleTag } from '@vueuse/core'
import { getLocalStorage, setLocalStorage } from '@/useLocalStorage'

import Settings from './Settings.vue'
import Modal from './ui/Modal.vue'
import Scoreboard from './Scoreboard.vue'
import Leaderboard from './Leaderboard/Leaderboard.vue'
import Timer from './Timer.vue'

import IconDice from '@/assets/icons/dice.svg'
import IconGear from '@/assets/icons/gear.svg'
import IconLeaderboard from '@/assets/icons/leaderboard.svg'
import IconTimerVisible from '@/assets/icons/timer_visible.svg'
import IconScoreboardVisible from '@/assets/icons/scoreboard_visible.svg'
import IconScoreboardHidden from '@/assets/icons/scoreboard_hidden.svg'
import IconTimerHidden from '@/assets/icons/timer_hidden.svg'
import IconStartFlag from '@/assets/icons/start_flag.svg'

import { rendererApi } from '../rendererApi'
const { chatguessrApi } = window



// probably not necessary
// defineOptions({
//   inheritAttrs: false
// })

const scoreboard = shallowRef<InstanceType<typeof Scoreboard> | null>(null)
const settingsVisible = shallowRef(false)
const leaderboardVisible = shallowRef(false)

const gameState = shallowRef<GameState>('none')
const isMultiGuess = shallowRef<boolean>(false)
const isBRMode = shallowRef<boolean>(false)
const modeHelp = shallowRef<string[]>([])
const guessMarkersLimit = shallowRef<number | null>(null)
const currentLocation = shallowRef<LatLng | null>(null)
const gameResultLocations = shallowRef<Location_[] | null>(null)
var MWStreetViewInstance


const widgetVisibility = reactive(
  getLocalStorage('cg_widget__visibility', {
    scoreboardVisible: true,
    scoreboardAndGgInterfaceVisible: true,
    timerVisible: true
  })
)
watch(widgetVisibility, () => {
  setLocalStorage('cg_widget__visibility', widgetVisibility)
  if(!widgetVisibility.scoreboardAndGgInterfaceVisible) {
    gameStatusRemover.load()
  }
  else {
    gameStatusRemover.unload()
  }
})

// removing game status element and map
const gameStatusRemover = useStyleTag('[class^="game_status"], [class^="game_guessMap"] { display: none; }', {
  id: 'cg-game-status-remover',
  manual: true
})



const satelliteMode = {
  // Manual implementation of `ref()` API
  // As `useLocalStorage` does not receive storage events from the non-vue UI script
  // TODO(@ReAnnannanna): Replace this with `useLocalStorage` when the pregame UI script is using Vue
  get value(): { enabled: boolean } {
    return getLocalStorage('cg_satelliteMode__settings', { enabled: false })
  }
}

// Remove the game's own markers while on a results screen (where we draw our own)
const markerRemover = useStyleTag(
  '[data-qa="result-view-top"] [data-qa="guess-marker"], [class^="coordinate-result-map_line__"] { display: none; }',
  {
    id: 'cg-marker-remover',
    manual: true
  }
)
const removeMarkers = computed(
  () => gameState.value === 'round-results' || gameState.value === 'game-results'
)
watch(
  removeMarkers,
  (load) => {
    if (load) {
      markerRemover.load()
    } else {
      markerRemover.unload()
    }
  },
  { immediate: true }
)

// Remove the game's controls when in satellite mode.
const gameControlsRemover = useStyleTag(
  '[class^="styles_columnTwo__"], [class^="styles_controlGroup__"], [data-qa="compass"], [class^="panorama-compass_"] { display: none !important; }',
  {
    id: 'cg-game-controls-remover',
    manual: true
  }
)
// `satelliteMode` is not actually reactive, but the actual change we're interested in is in `gameState` anyways.
const removeGameControls = computed(() => gameState.value !== 'none' && satelliteMode.value.enabled)
watch(
  removeGameControls,
  (load) => {
    if (load) {
      gameControlsRemover.load()
    } else {
      gameControlsRemover.unload()
    }
  },
  { immediate: true }
)

onBeforeUnmount(
  chatguessrApi.onGameStarted((_isMultiGuess, _isBRMode, _modeHelp, restoredGuesses, location) => {
    isMultiGuess.value = _isMultiGuess
    isBRMode.value = _isBRMode
    console.log("isBRMode", isBRMode.value)
    modeHelp.value = _modeHelp
    gameState.value = 'in-round'

    currentLocation.value = location
    if (satelliteMode.value.enabled) {
      rendererApi.showSatelliteMap(location)
    } else {
      rendererApi.hideSatelliteMap()
    }

    scoreboard.value!.onStartRound()
    if (restoredGuesses.length > 0) {
      if (isMultiGuess.value) {
        scoreboard.value!.restoreMultiGuesses(restoredGuesses as Player[])
      } else {
        scoreboard.value!.restoreGuesses(restoredGuesses as RoundResult[])
      }
    }
  })
)

function getClosestHeadingPano(currentHeading: number, streetViewInstance): string | boolean{
  let links = streetViewInstance.getLinks()
  let linksByDistance: { heading: number, distance: number, panoId: string }[] = []
  links.map(link=>{
    let heading = link.heading
    let distance = Math.abs(heading - currentHeading)
    linksByDistance.push({heading: heading, distance: distance, panoId: link.pano})
  })
  let closestDistance = Math.min(...linksByDistance.map(link=>link.distance))
  if(closestDistance > 60){
    return false
  }
  let closestLink = linksByDistance.find(link=>link.distance === closestDistance)
  if(!closestLink) return false
  return closestLink.panoId
}

onBeforeUnmount(
  chatguessrApi.onStartRound(() => {
    gameState.value = 'in-round'
    rendererApi.clearMarkers()
    scoreboard.value!.onStartRound()
  })
)
onBeforeUnmount(
  chatguessrApi.onRefreshRound((location) => {
    // this condition prevents gameState to switch to 'in-round' if 'onRefreshRound' is triggered (happens sometimes) on round results screen
    // this is because of "did-frame-finish-load" based logic, ideally we would want something else
    if (gameState.value !== 'round-results') gameState.value = 'in-round'
    currentLocation.value = location
    if (satelliteMode.value.enabled) {
      rendererApi.showSatelliteMap(location)
    }
  })
)
declare global {
  interface Window {
    initialize: () => void;
  }
}
onBeforeUnmount(
  chatguessrApi.onMoveForward(() => {
    // get latlng of pano in front of us
    let pov = MWStreetViewInstance.getPov()
    console.log("initial heading", pov.heading)
    let pano = getClosestHeadingPano(pov.heading, MWStreetViewInstance)
    if(!pano) return
    console.log("closest heading", pano)
    MWStreetViewInstance.setPano(pano)
    console.log(MWStreetViewInstance, "MWStreetViewInstance")

return 0



    function initialize() {
  let fenway = { lat: 48.196102579488475, lng: 16.21028423309326};
  const mapElement = document.getElementById("map") as HTMLElement;
  const map = new google.maps.Map(mapElement, {
    center: fenway,
    zoom: 14
  });
  const panoElement = document.getElementById("pano") as HTMLElement;






const request = {
  location: fenway,
  preference: google.maps.StreetViewPreference.NEAREST, // Set the preference
  radius: 5000 // Search within a 50-meter radius
};

const streetViewService = new google.maps.StreetViewService();
let closestPanoId;
let lat;
let lng;
streetViewService.getPanorama(request, (panoramaData, status) => {
  console.log("panoramaData", panoramaData)
  console.log("status", status)
  if (status === google.maps.StreetViewStatus.OK) {
    console.log("panoramaData", panoramaData)
    if(!panoramaData) return
    if(!panoramaData.location) return
    closestPanoId = panoramaData.location.pano;
    if(!panoramaData.location.latLng) return
    lat = panoramaData.location.latLng.lat();
    lng = panoramaData.location.latLng.lng();
    console.log('Closest Street View panorama ID:', closestPanoId);
    fenway = { lat: lat, lng: lng};
console.log("fenway", fenway)


const panorama = new google.maps.StreetViewPanorama(
    panoElement,
    {
      position: fenway,
      pov: {
        heading: 34,
        pitch: 10
      },
      
    }
  );
  map.setStreetView(panorama);

  } else {
    console.error('Street View data is not available for this location.');
  }
});





}

window.initialize = initialize
window.initialize()
console.log("after init")

    })
)

onBeforeUnmount(
  
chatguessrApi.onMoveBackward(()=>{
  let pov = MWStreetViewInstance.getPov()
  let heading = (pov.heading + 180) % 360
  let pano = getClosestHeadingPano(heading, MWStreetViewInstance)
  if(!pano) return
  MWStreetViewInstance.setPano(pano)
  })
)

onBeforeUnmount(
  chatguessrApi.onPanLeft((degrees) => {
    let pov = MWStreetViewInstance.getPov()
    let heading = pov.heading
    let pitch = pov.pitch
    let newHeading = heading - degrees
    MWStreetViewInstance.setPov({heading: newHeading, pitch: pitch})
  })
)
onBeforeUnmount(
  chatguessrApi.onPanRight((degrees) => {
    let pov = MWStreetViewInstance.getPov()
    let heading = pov.heading
    let pitch = pov.pitch
    let newHeading = heading + degrees
    MWStreetViewInstance.setPov({heading: newHeading, pitch: pitch})
  })
)
onBeforeUnmount(
  chatguessrApi.onPanUp((degrees) => {
    let pov = MWStreetViewInstance.getPov()
    let heading = pov.heading
    let pitch = pov.pitch
    let newPitch = pitch + degrees
    
    if(newPitch > 89) newPitch = 89
    MWStreetViewInstance.setPov({heading: heading, pitch: newPitch})
  })
)
onBeforeUnmount(
  chatguessrApi.onPanDown((degrees) => {
    let pov = MWStreetViewInstance.getPov()
    let heading = pov.heading
    let pitch = pov.pitch
    let newPitch = pitch - degrees
    if(newPitch < -89) newPitch = -89
    MWStreetViewInstance.setPov({heading: heading, pitch: newPitch})
  })
)
onBeforeUnmount(
  chatguessrApi.onZoomIn((value) => {
    let zoom = MWStreetViewInstance.getZoom()
    let newZoom = zoom + value
    MWStreetViewInstance.setZoom(newZoom)
  })
)
onBeforeUnmount(
  chatguessrApi.onZoomOut((value) => {
    let zoom = MWStreetViewInstance.getZoom()
    let newZoom = zoom - value
    MWStreetViewInstance.setZoom(newZoom)
  })
)

onBeforeUnmount(
  chatguessrApi.onRetrieveMyLastLoc(async (location, username) => {
    function computeDistanceBetween(coords1, coords2) {
      return google.maps.geometry.spherical.computeDistanceBetween(
        coords1,
        coords2,
      );
    }
    function makeMapsUrlPanoId(panoId: string): string {
      return `https://www.google.com/maps/@?api=1&map_action=pano&pano=${panoId}`
    }

    let searchRadius = 250000
    let radius = searchRadius
    let oldRadius = searchRadius
    let pano = {
      radius: 0,
      url: ''
    }
    //let closestPanoId;
    const streetViewService = new google.maps.StreetViewService();
    while (true) {
      try {
      let panorama = await streetViewService.getPanorama({
        location: {lat: location.lat, lng: location.lng},
        preference: google.maps.StreetViewPreference.NEAREST, // Set the preference
        source: google.maps.StreetViewSource.OUTDOOR, // Get outdoor panoramas
        radius: radius // Search within a 5000-meter radius
      });
      if(!panorama) return
      if(!panorama.data) return
      if(!panorama.data.location) return
      radius = computeDistanceBetween({lat: location.lat, lng: location.lng}, panorama.data.location.latLng);
      pano.radius = radius;
      pano.url = makeMapsUrlPanoId(panorama.data.location.pano);
 
      if (oldRadius && radius >= oldRadius) break;
      oldRadius = radius;
    } catch (e) {
      console.error(e)
      break;
    }
  }
  chatguessrApi.returnMyLastLoc(pano.url, username)        











  })
)

onBeforeUnmount(
  chatguessrApi.onGameQuit(() => {
    gameState.value = 'none'
    rendererApi.clearMarkers()
  })
)

onBeforeUnmount(
  chatguessrApi.onReceiveGuess((guess) => {
    scoreboard.value!.renderGuess(guess)
  })
)

onBeforeUnmount(
  chatguessrApi.onReceiveMultiGuesses((guess) => {
    try {
    guess["index"] = 0
    guess["totalScore"] = 0
    scoreboard.value!.renderMultiGuess(guess)
    } catch (e) {
      console.error(e)
    }
  })
)

onBeforeUnmount(
  chatguessrApi.onShowRoundResults((round, location, roundResults, _guessMarkersLimit) => {
    gameState.value = 'round-results'
    guessMarkersLimit.value = _guessMarkersLimit

    rendererApi.drawRoundResults(location, roundResults, _guessMarkersLimit)
    scoreboard.value!.showRoundResults(round, roundResults)
  })
)

onBeforeUnmount(
  chatguessrApi.onShowGameResults((locations, gameResults) => {
    gameState.value = 'game-results'
    gameResultLocations.value = locations

    rendererApi.drawPlayerResults(locations, gameResults[0])
    scoreboard.value!.showGameResults(gameResults)
  })
)

onBeforeUnmount(
  chatguessrApi.onGuessesOpenChanged((open) => {
    scoreboard.value!.setSwitchState(open)
  })
)

function onRoundResultRowClick(index: number, position: LatLng) {
  if (guessMarkersLimit.value && index <= guessMarkersLimit.value) {
    rendererApi.focusOnGuess(position)
  }
}
function onGameResultRowClick(row: GameResultDisplay) {
  if (gameResultLocations.value) {
    rendererApi.drawPlayerResults(gameResultLocations.value, row)
  }
}

function onClickCenterSatelliteView() {
  if (currentLocation.value) rendererApi.centerSatelliteView(currentLocation.value)
}
async function onStreamerRandomplonk() {
  let latlng = await chatguessrApi.getRandomPlonkLatLng()
  let {lat,lng} = {lat: latlng.lat, lng: latlng.lng}
    
 

 
    // Okay well played Geoguessr u got me there for a minute, but below should work.
    // Below is the only intentionally complicated part of the code - it won't be simplified or explained for good reason.
    // let element = document.getElementsByClassName("guess-map_canvas__JAHHT")[0]
    let element = document.querySelectorAll('[class^="guess-map_canvas__"]')[0]

    let keys = Object.keys(element)
    let key = keys.find(key => key.startsWith("__reactFiber$"))
    if (!key) return
    let props = element[key]
    let x = props.return.return.memoizedProps.map.__e3_.click
    let objectKeys = Object.keys(x)
    let y = objectKeys[objectKeys.length - 1]
 
    const z = {
        latLng:{
            lat: () => lat,
            lng: () => lng,
        }
    }
 
    const xy = x[y]
    const a = Object.keys(x[y])
 
    for(let i = 0; i < a.length ;i++){
        let q = a[i]
        if (typeof xy[q] === "function"){
            xy[q](z)
        }
    }
    window.setTimeout(() => {
        // click button element with data-qa="perform-guess"
        const buttonElement = document.querySelector('[data-qa="perform-guess"]')
        buttonElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }, 200)
}

/** Load and update twitch connection state. */
const twitchConnectionState = useTwitchConnectionState()
function useTwitchConnectionState() {
  const conn = shallowRef<TwitchConnectionState>({ state: 'disconnected' })

  onMounted(async () => {
    const state = await chatguessrApi.getTwitchConnectionState()
    conn.value = state


    function overrideOnLoad(googleScript, observer, overrider) {
	const oldOnload = googleScript.onload
	googleScript.onload = (event) => {
			const google = window.google
			if (google) {
					observer.disconnect()
					overrider(google)
			}
			if (oldOnload) {
					oldOnload.call(googleScript, event)
			}
	}
}
 
function grabGoogleScript(mutations) {
	for (const mutation of mutations) {
			for (const newNode of mutation.addedNodes) {
					const asScript = newNode
					if (asScript && asScript.src && asScript.src.startsWith('https://maps.googleapis.com/')) {
							return asScript
					}
			}
	}
	return null
}
 
function injecter(overrider) {
	if (document.documentElement)
	{
			injecterCallback(overrider);
	}
}
 
function injecterCallback(overrider)
{
	new MutationObserver((mutations, observer) => {
			const googleScript = grabGoogleScript(mutations)
			if (googleScript) {
					overrideOnLoad(googleScript, observer, overrider)
			}
	}).observe(document.documentElement, { childList: true, subtree: true })
}
 

	injecter(() => {
		google.maps.StreetViewPanorama = class extends google.maps.StreetViewPanorama {
      constructor(...args: any[]) {
          super(...args as [any, ...any[]]);
					MWStreetViewInstance = this;
			}
		}
	});

console.log(MWStreetViewInstance, "MWStreetViewInstance")




  })

  onBeforeUnmount(
    chatguessrApi.onTwitchConnectionStateChange((state) => {
      conn.value = state
    })
  )

  onBeforeUnmount(
    chatguessrApi.onTwitchError((err) => {
      conn.value = { state: 'error', error: err }
    })
  )

  return conn
}

/** Load and update socket connection state. */
const socketConnectionState = useSocketConnectionState()
function useSocketConnectionState() {
  const conn = shallowRef<SocketConnectionState>({ state: 'disconnected' })

  onMounted(async () => {
    const state = await chatguessrApi.getSocketConnectionState()
    conn.value = state
  })

  onBeforeUnmount(
    chatguessrApi.onSocketConnected(() => {
      conn.value.state = 'connected'
    })
  )
  onBeforeUnmount(
    chatguessrApi.onSocketDisconnected(() => {
      conn.value.state = 'disconnected'
    })
  )

  return conn
}
</script>

<style scoped>
[hidden] {
  display: none !important;
}

.cg-frame-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
}

.cg-menu {
  position: fixed;
  display: flex;
  flex-direction: column;
  gap: 5px;
  top: 120px;
  right: 7px;
  z-index: 1;
}

.cg-button {
  display: flex;
  width: 2.7rem;
  height: 2.7rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 50px;
  cursor: pointer;
  transition: 0.2s;
}

.cg-button:hover {
  background: rgba(0, 0, 0, 0.5);
}
.cg-button:active {
  transform: scale(0.9);
}

.cg-button.disconnected {
  background: red;
}

.cg-button.connecting {
  background: blue;
}

/* Vue draggable-resizable */
.drv,
.vdr-container {
  border: none;
  z-index: 2;
}
</style>
