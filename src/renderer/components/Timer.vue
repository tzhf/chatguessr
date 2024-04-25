<template>
  <Vue3DraggableResizable
    v-model:x="position.x"
    v-model:y="position.y"
    :draggable="!settingsVisibility"
    :resizable="false"
    :parent="true"
    style="transform: translateX(50%)"
    @drag-end="setLocalStorage('cg_timer__position', position)"
  >
    <div
      class="timer"
      @mouseover="iconsVisibility = true"
      @mouseleave="!settingsVisibility ? (iconsVisibility = false) : true"
    >
      <div
        :style="{
          fontFamily: settings.fontFamily,
          fontSize: settings.fontSize + 'px',
          color: settings.color,
          textShadow: `${settings.shadowOffsetX}px ${settings.shadowOffsetY}px ${settings.shadowBlur}px ${settings.shadowColor}`,
          WebkitTextStroke: `${settings.borderWidth}px ${settings.borderColor}`,
          paddingBottom: '0.5rem',
          cursor: 'move'
        }"
      >
        <div>{{ display }}</div>
        <div v-if="isTimeToPlonk">{{ settings.timeToPlonkMsg }}</div>
      </div>

      <div :class="iconsVisibility ? 'expanded' : 'collapsed'">
        <div class="flex items-center justify-center gap-05">
          <IconStart v-if="!isStarted || isPaused" @click="start" />
          <IconPause v-else @click="pause" />
          <IconStop v-if="isStarted" @click="reset" />
          <IconGearStroke @click="settingsVisibility = !settingsVisibility" />
        </div>
      </div>

      <div
        :class="['timer-settings', settingsVisibility ? 'expanded' : 'collapsed']"
        :hidden="!settingsVisibility"
      >
        <label class="form__group"
          >Start timer at round start :
          <input v-model="settings.autoStart" type="checkbox" />
        </label>
        <label class="form__group"
          >Close guesses when time's up :
          <input v-model="settings.autoCloseGuesses" type="checkbox" />
        </label>
        <hr />

        <label class="form__group"
          >Time ({{ settings.timeLimit }} sec) :
          <input
            v-model.number="settings.timeLimit"
            type="range"
            min="5"
            max="600"
            step="5"
            @input="reset()"
          />
        </label>
        <label class="form__group"
          >Time's up message :
          <input v-model="settings.timesUpMsg" type="text" spellcheck="false" />
        </label>
        <label class="form__group"
          >Time to plonk ({{ settings.timeToPlonk }} sec) :
          <input
            v-model.number="settings.timeToPlonk"
            type="range"
            min="5"
            :max="settings.timeLimit"
            step="5"
            @input="reset()"
          />
        </label>
        <label class="form__group"
          >Time to plonk message :
          <input v-model="settings.timeToPlonkMsg" type="text" spellcheck="false" />
        </label>
        <hr />

        <label class="form__group"
          >Play sound when it's time to plonk :
          <input v-model="settings.playAudio" type="checkbox" />
        </label>
        <div class="form__group">
          <label>Load audio file :</label>
          <div class="flex items-center justify-center gap-05">
            <button class="btn bg-primary" type="button" @click="handleImportAudioFile">
              Import
            </button>
            <IconAudio v-if="audioPath" class="icon" @click="playAudio()" />
          </div>
        </div>
        <label class="form__group"
          >Sound volume ({{ settings.audioVolume * 100 }} %) :
          <input v-model.number="settings.audioVolume" type="range" min="0" max="1" step="0.1" />
        </label>
        <hr />

        <label class="form__group"
          >Font :
          <select v-model="settings.fontFamily">
            <option
              v-for="font in availableFonts"
              :key="font"
              :value="font"
              :style="{ fontFamily: font }"
            >
              {{ font }}
            </option>
          </select>
        </label>
        <label class="form__group"
          >Font size ({{ settings.fontSize }}px) :
          <input v-model="settings.fontSize" type="range" min="10" max="170" />
        </label>
        <label class="form__group"
          >Color :
          <input v-model="settings.color" type="color" />
        </label>
        <hr />

        <label class="form__group"
          >Border width ({{ settings.borderWidth }}px) :
          <input v-model="settings.borderWidth" type="range" min="0" max="10" step="0.1" />
        </label>
        <label class="form__group"
          >Border color :
          <input v-model="settings.borderColor" type="color" />
        </label>
        <hr />

        <label class="form__group"
          >Shadow offset X ({{ settings.shadowOffsetX }}px) :
          <input v-model="settings.shadowOffsetX" type="range" min="-20" max="20" step="1" />
        </label>
        <label class="form__group"
          >Shadow offset Y ({{ settings.shadowOffsetY }}px) :
          <input v-model="settings.shadowOffsetY" type="range" min="-20" max="20" step="1" />
        </label>
        <label class="form__group"
          >Shadow blur ({{ settings.shadowBlur }}px) :
          <input v-model="settings.shadowBlur" type="range" min="0" max="20" step="1" />
        </label>
        <label class="form__group"
          >Shadow color :
          <input v-model="settings.shadowColor" type="color" />
        </label>
      </div>
    </div>
  </Vue3DraggableResizable>
</template>

<script setup lang="ts">
import { shallowRef, watch, reactive, onMounted } from 'vue'
import { getLocalStorage, setLocalStorage } from '@/useLocalStorage'
import IconStart from '@/assets/icons/start.svg'
import IconPause from '@/assets/icons/pause.svg'
import IconStop from '@/assets/icons/stop.svg'
import IconGearStroke from '@/assets/icons/gear_stroke.svg'
import IconAudio from '@/assets/icons/audio.svg'

const { chatguessrApi } = window
const props = defineProps<{
  gameState: GameState
}>()
watch(
  () => props.gameState,
  (gameState) => {
    if (gameState === 'in-round') {
      reset()
      if (settings.autoStart) start()
    } else {
      reset()
    }
  }
)

const position = reactive(getLocalStorage('cg_timer__position', { x: 450, y: 50 }))
const settings = reactive(
  getLocalStorage('cg_timer__settings', {
    timeLimit: 90,
    timeToPlonk: 30,
    timesUpMsg: "Time's Up",
    timeToPlonkMsg: '🌍 Plonk Now 🌍',
    autoStart: false,
    autoCloseGuesses: false,
    playAudio: false,
    audioVolume: 1,
    fontFamily: 'Lucida Console',
    fontSize: '50',
    color: '#59f3b3',
    borderWidth: '0.7',
    borderColor: '#ffffff',
    shadowOffsetX: '4',
    shadowOffsetY: '4',
    shadowBlur: '0',
    shadowColor: '#a159ff'
  })
)
watch(settings, () => {
  if (settings.timeToPlonk >= settings.timeLimit) settings.timeToPlonk = settings.timeLimit
  setLocalStorage('cg_timer__settings', settings)
})

const display = shallowRef('00:00')
const isStarted = shallowRef(false)
const isPaused = shallowRef(false)
const isTimeToPlonk = shallowRef(false)

const audioPath = shallowRef<string | false>(false)
const availableFonts = shallowRef()
const settingsVisibility = shallowRef(false)
const iconsVisibility = shallowRef(false)

let targetTimestamp = 0
let pausedDifference = 0
let frameInterval = () => {}

onMounted(async () => {
  audioPath.value = await chatguessrApi.appDataPathExists('\\timer\\timer_alert')

  updateDisplay(settings.timeLimit * 1000)

  await document.fonts.ready
  const fontsAvailable = new Set()
  const fontsList = new Set(
    [
      // Windows 10
      'Arial',
      'Arial Black',
      'Bahnschrift',
      'Calibri',
      'Cambria',
      'Cambria Math',
      'Candara',
      'Comic Sans MS',
      'Consolas',
      'Constantia',
      'Corbel',
      'Ebrima',
      'Franklin Gothic Medium',
      'Gabriola',
      'Gadugi',
      'Georgia',
      'HoloLens MDL2 Assets',
      'Impact',
      'Ink Free',
      'Javanese Text',
      'Leelawadee UI',
      'Lucida Console',
      'Lucida Sans Unicode',
      'Malgun Gothic',
      'Microsoft Himalaya',
      'Microsoft JhengHei',
      'Microsoft New Tai Lue',
      'Microsoft PhagsPa',
      'Microsoft Sans Serif',
      'Microsoft Tai Le',
      'Microsoft YaHei',
      'Microsoft Yi Baiti',
      'MingLiU-ExtB',
      'Mongolian Baiti',
      'MS Gothic',
      'MV Boli',
      'Myanmar Text',
      'Nirmala UI',
      'Palatino Linotype',
      'Segoe MDL2 Assets',
      'Segoe Print',
      'Segoe Script',
      'Segoe UI',
      'SimSun',
      'Sitka',
      'Sylfaen',
      'Symbol',
      'Tahoma',
      'Times New Roman',
      'Trebuchet MS',
      'Verdana',
      'Yu Gothic',
      // macOS
      'American Typewriter',
      'Andale Mono',
      'Arial',
      'Arial Black',
      'Arial Narrow',
      'Arial Rounded MT Bold',
      'Arial Unicode MS',
      'Avenir',
      'Avenir Next',
      'Avenir Next Condensed',
      'Baskerville',
      'Big Caslon',
      'Bodoni 72',
      'Bodoni 72 Oldstyle',
      'Bodoni 72 Smallcaps',
      'Bradley Hand',
      'Brush Script MT',
      'Chalkboard',
      'Chalkboard SE',
      'Chalkduster',
      'Charter',
      'Cochin',
      'Comic Sans MS',
      'Copperplate',
      'Courier',
      'Courier New',
      'Didot',
      'DIN Alternate',
      'DIN Condensed',
      'Futura',
      'Geneva',
      'Georgia',
      'Gill Sans',
      'Helvetica',
      'Helvetica Neue',
      'Herculanum',
      'Hoefler Text',
      'Impact',
      'Lucida Grande',
      'Luminari',
      'Marker Felt',
      'Menlo',
      'Microsoft Sans Serif',
      'Monaco',
      'Noteworthy',
      'Optima',
      'Palatino',
      'Papyrus',
      'Phosphate',
      'Rockwell',
      'Savoye LET',
      'SignPainter',
      'Skia',
      'Snell Roundhand',
      'Tahoma',
      'Times',
      'Times New Roman',
      'Trattatello',
      'Trebuchet MS',
      'Verdana',
      'Zapfino'
    ].sort()
  )

  for (const font of fontsList.values()) {
    if (document.fonts.check(`12px "${font}"`)) {
      fontsAvailable.add(font)
    }
  }
  availableFonts.value = [...fontsAvailable.values()]
})

const start = () => {
  isStarted.value = true
  isPaused.value = false

  const nowTimestamp = Date.now()
  let targetTime = settings.timeLimit * 1000

  if (pausedDifference) {
    targetTime = pausedDifference
    pausedDifference = 0
  }

  targetTimestamp = nowTimestamp + targetTime

  frameInterval = () => {
    if (!isStarted.value) return

    if (!isTimeToPlonk.value && targetTimestamp - Date.now() < settings.timeToPlonk * 1000) {
      isTimeToPlonk.value = true
      if (settings.playAudio) playAudio()
    }

    if (targetTimestamp - Date.now() < 1) {
      reset()
      if (settings.timesUpMsg) display.value = settings.timesUpMsg
      if (settings.autoCloseGuesses) chatguessrApi.setGuessesOpen(false)
    } else updateDisplay()

    requestAnimationFrame(frameInterval)
  }
  frameInterval()
}

const pause = () => {
  isPaused.value = true

  const nowTimestamp = Date.now()
  pausedDifference = Math.abs(targetTimestamp - nowTimestamp)
  frameInterval = () => {}
}

const reset = () => {
  pause()

  isStarted.value = false
  isPaused.value = false
  isTimeToPlonk.value = false

  const nowTimestamp = Date.now()
  targetTimestamp = nowTimestamp + settings.timeLimit * 1000
  pausedDifference = 0

  updateDisplay()
}

const updateDisplay = (targetTime?: number) => {
  const nowTimestamp = Date.now()
  if (targetTime !== undefined) {
    targetTimestamp = nowTimestamp + targetTime
  }

  const time = Math.abs(Date.now() - targetTimestamp) / 1000
  const numM = Math.floor(time / 60) % 60
  const numS = Math.floor(time % 60)
  display.value = numM.toString().padStart(2, '0') + ':' + numS.toString().padStart(2, '0')
}

const playAudio = () => {
  if (!audioPath.value) return
  const audio = new Audio(audioPath.value)
  audio.volume = settings.audioVolume
  audio.play()
}

const handleImportAudioFile = async () => {
  try {
    const path = await chatguessrApi.importAudioFile()
    if (path) {
      audioPath.value = path + '?cb=' + new Date().getTime()
    }
  } catch (err) {
    console.error(err)
  }
}
</script>

<style scoped>
.timer {
  height: 30px;
  width: fit-content;
  line-height: 1;
  text-align: center;
  text-wrap: nowrap;
  transform: translateX(-50%);
  user-select: none;
}

.timer * {
  pointer-events: auto;
}

.timer-settings {
  width: 380px;
  margin: 0.5rem auto;
  padding: 0.8rem;
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  color: #ffffff;
  background-color: var(--bg-dark-transparent);
  box-shadow: rgb(0, 0, 0) 2px 2px 7px -2px;
  border-radius: 0.5rem;
}

svg {
  width: 20px;
  height: 20px;
  transition: transform ease-in-out 150ms;
  cursor: pointer;
}
svg:hover {
  transform: scale(1.1);
}
svg:active {
  transform: scale(0.8);
}
.expanded {
  opacity: 1;
  animation: fadeIn 150ms ease-out forwards;
}
.collapsed {
  opacity: 0;
  animation: fadeOut 150ms ease-out forwards;
}

@keyframes fadeIn {
  0% {
    display: none;
    opacity: 0;
  }
  1% {
    display: block;
  }
  100% {
    display: block;
    opacity: 1;
  }
}
@keyframes fadeOut {
  0% {
    display: block;
    opacity: 1;
  }
  99% {
    display: block;
  }
  100% {
    display: none;
    opacity: 0;
  }
}
</style>
