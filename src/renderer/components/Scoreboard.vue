<template>
  <Vue3DraggableResizable
    v-model:x="position.x"
    v-model:y="position.y"
    v-model:w="position.w"
    v-model:h="position.h"
    :draggable="isDraggable"
    :minW="340"
    :minH="179"
    :parent="false"
    class="scoreboard"
    class-name-handle="scoreboard_handle"
    @drag-end="savePosition"
    @resize-end="savePosition"
  >
    <div class="scoreboard-header">
      <div class="scoreboard-settings">
        <button class="btn btn-icon" @click="toggleAutoScroll">
          <IconAutoScroll :fill="settings.autoScroll ? '#59f3b3' : 'white'" />
        </button>
        <button class="btn btn-icon" @click="isColumnVisibilityOpen = !isColumnVisibilityOpen">
          <IconGear :fill="isColumnVisibilityOpen ? '#59f3b3' : 'white'" />
        </button>
        <div v-if="isColumnVisibilityOpen" class="column-visibility">
          <button
            :class="['btn', { active: settings.streak }]"
            :disabled="isMultiGuess"
            @click="settings.streak = !settings.streak"
          >
            {{ round_columns[2].name }}
          </button>
          <button
            :class="['btn', { active: settings.distance }]"
            :disabled="isMultiGuess"
            @click="settings.distance = !settings.distance"
          >
            {{ round_columns[3].name }}
          </button>
          <button
            :class="['btn', { active: settings.score }]"
            :disabled="isMultiGuess"
            @click="settings.score = !settings.score"
          >
            {{ round_columns[4].name }}
          </button>
          <button
            :class="['btn', { active: settings.totalScore }]"
            @click="settings.totalScore = !settings.totalScore"
          >
            {{ round_columns[5].name }}
          </button>
        </div>
      </div>
      <div class="scoreboard-title">{{ title }} ({{ rows.length }})</div>
      <div style="width: 65px">
        <label :class="['switch-container', { hidden: gameState !== 'in-round' }]">
          <input type="checkbox" :checked="switchState" @input="(e) => toggleGuesses(e)" />
          <div class="switch"></div>
        </label>
      </div>
    </div>
    <div :class="['scoreboard-hint', { hidden: !isMultiGuess || gameState !== 'in-round' }]">
      Guess change allowed
    </div>
    <div :class="['mode-hint', { hidden: props.modeHelp.length === 0 || gameState !== 'in-round' }]">
      <p v-for="mode in props.modeHelp" :key="mode">{{ mode }}</p>
    </div>

    <input
      v-model.number="settings.scrollSpeed"
      type="range"
      min="5"
      max="50"
      :class="['scrollspeed-slider', { hidden: !settings.autoScroll }]"
      @mouseover="isDraggable = false"
      @mouseleave="isDraggable = true"
    />
    <div ref="tBody" class="table-container">
      <table>
        <thead>
          <tr>
            <th
              v-for="col in activeCols"
              :key="col.value"
              :class="{ sortable: col.sortable }"
              :style="{ width: col.width }"
              @click="sortByCol(col)"
            >
              {{ col.name }}
            </th>
          </tr>
        </thead>
        <tbody>
          <TransitionGroup name="scoreboard_rows">
            <tr v-for="row in rows" :key="row.player.username" @click="onRowClick(row)">
              <td v-for="col in activeCols" :key="col.value">
                <div
                  v-if="col.value === 'player'"
                  :class="[
                    'flex items-center gap-02',
                    { 'justify-center': activeCols.length <= 2 }
                  ]"
                >
                  <span
                    class="avatar"
                    :style="{
                      backgroundImage: `url(${row.player.avatar ?? 'asset:avatar-default.jpg'})`
                    }"
                  ></span>
                  <span class="username" :style="{ color: row.player.color }">
                    {{ row.player.username }}{{ row.modified ? '*' : '' }}
                  </span>
                  <span
                    v-if="row.player.flag"
                    class="flag"
                    :style="{
                      backgroundImage: `url('flag:${row.player.flag}')`
                    }"
                  ></span>
                  <span
                  v-if="row.isRandomPlonk"
                  :style="{
                      paddingLeft: '2px'
                    }">
                  🎲
                </span>
                </div>
                <div v-else>{{ row[col.value].display }}</div>
              </td>
            </tr>
          </TransitionGroup>
        </tbody>
      </table>
    </div>
  </Vue3DraggableResizable>
</template>

<script setup lang="ts">
import { shallowRef, shallowReactive, reactive, onMounted, toRef, watch, computed, nextTick } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import formatDuration from 'format-duration'
import { getLocalStorage, setLocalStorage } from '@/useLocalStorage'
import IconAutoScroll from '@/assets/icons/auto_scroll.svg'
import IconGear from '@/assets/icons/gear.svg'

const { chatguessrApi } = window
const props = defineProps<{
  gameState: GameState
  isMultiGuess: boolean
  modeHelp: string[]
  onRoundResultRowClick: (index: number, position: LatLng) => void
  onGameResultRowClick: (row: GameResultDisplay) => void
}>()

const tBody = shallowRef<HTMLDivElement | null>(null)
const isDraggable = shallowRef(true)
const isColumnVisibilityOpen = shallowRef(false)
const title = shallowRef('GUESSES')
const switchState = shallowRef(true)

const defaultPosition = { x: 20, y: 50, w: 340, h: 390 }
const position = shallowReactive(defaultPosition)

onMounted(async () => {
  await nextTick(); // Waits until the component is actually rendered, preventing potential null values

  Object.assign(
    position,
    getLocalStorage('cg_scoreboard__position', defaultPosition)
  )
})

const settings = reactive(
  getLocalStorage('cg_scoreboard__settings', {
    autoScroll: false,
    scrollSpeed: 15,
    streak: true,
    distance: true,
    score: true,
    totalScore: true
  })
)
watch(settings, () => {
  setLocalStorage('cg_scoreboard__settings', settings)
})

function savePosition() {

  // Setting scoreboard bounds manually because native draggable doesn't work
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const edgeBuffer = 64;

  const xMin = -edgeBuffer;
  const xMax = windowWidth - position.w + edgeBuffer;
  const yMin = -edgeBuffer;
  const yMax = windowHeight - position.h + edgeBuffer;

  if (position.x < xMin) { // Past left side
    position.x = xMin;
  } else if (position.x > xMax) { // Past right side
    position.x = xMax;
  }

  if (position.y < yMin) { // Past top
    position.y = yMin;
  } else if (position.y > yMax) { // Past bottom
    position.y = yMax;
  }

  setLocalStorage('cg_scoreboard__position', position)
}

type Column = {
  name: string
  value: string
  width: string
  sortable: boolean
}

const round_columns: Column[] = [
  { name: '#', value: 'index', width: '25px', sortable: true },
  { name: 'Player', value: 'player', width: '100%', sortable: false },
  { name: 'Streak', value: 'streak', width: '48px', sortable: true },
  { name: 'Distance', value: 'distance', width: '80px', sortable: true },
  { name: 'Score', value: 'score', width: '65px', sortable: true },
  { name: 'Total', value: 'totalScore', width: '65px', sortable: true }
]
const end_columns: Column[] = [
  { name: '#', value: 'index', width: '25px', sortable: true },
  { name: 'Player', value: 'player', width: '100%', sortable: false },
  { name: 'Streak', value: 'streak', width: '48px', sortable: true },
  { name: 'Distance', value: 'distance', width: '80px', sortable: true },
  { name: 'Score', value: 'score', width: '65px', sortable: true }
]
const activeRoundCols = computed(() =>
  props.gameState === 'in-round'
    ? props.isMultiGuess
      ? [round_columns[1]]
      : round_columns.filter(
          (f) => f.value === 'index' || f.value === 'player' || ( settings[f.value] === true && f.value !== 'totalScore' )
        )
    : round_columns.filter(
          (f) => f.value !== 'totalScore' || settings['totalScore'] === true
        )
)
const activeEndCols = computed(() =>
  props.gameState === 'in-round'
    ? props.isMultiGuess
      ? [end_columns[1]]
      : end_columns.filter(
          (f) => f.value === 'index' || f.value === 'player' || settings[f.value] === true
        )
    : end_columns
)
const activeCols = computed(() =>
  props.gameState === 'game-results' ? activeEndCols.value : activeRoundCols.value
)

const rows = shallowReactive<ScoreboardRow[]>([])

function onStartRound() {
  rows.length = 0
  title.value = 'GUESSES'
}
 
function renderGuess(guess: Guess) {
  const formatedRow = {
    index: { value: 0, display: '' },
    player: guess.player,
    streak: {
      value: guess.streak,
      display: guess.lastStreak ? guess.streak + ` [` + guess.lastStreak + `]` : guess.streak
    },
    distance: { value: guess.distance, display: toMeter(guess.distance) },
    score: { value: guess.score, display: guess.score },
    isRandomPlonk: guess.isRandomPlonk
  }
  rows.push(formatedRow)

  rows.sort((a, b) => a.distance!.value - b.distance!.value)
  for (let i = 0; i < rows.length; i++) {
    rows[i].index = { value: i + 1, display: i + 1 }
  }
}

function renderMultiGuess(guess: Guess) {
  const formatedRow = {
    player: guess.player,
    modified: guess.modified,
    isRandomPlonk: guess.isRandomPlonk
  }

  if (guess.modified) {
    const index = rows.findIndex((row) => row.player.username == guess.player.username)
    rows.splice(index, 1)
    // TODO maybe find a better soluion
    // Animation is not triggered if we push too fast because key:username is remaining in the DOM
    setTimeout(() => {
      rows.push(formatedRow)
    }, 50)
  } else {
    rows.push(formatedRow)
  }
}

function restoreGuesses(restoredGuesses: RoundResult[]) {
  const formatedRows = restoredGuesses.map((guess, i) => {
    return {
      index: { value: i + 1, display: i + 1 },
      player: guess.player,
      streak: {
        value: guess.streak,
        display: guess.lastStreak ? guess.streak + ` [` + guess.lastStreak + `]` : guess.streak
      },
      distance: { value: guess.distance, display: toMeter(guess.distance) },
      score: { value: guess.score, display: guess.score },
      isRandomPlonk: guess.isRandomPlonk
    }
  })
  Object.assign(rows, formatedRows)
}

function restoreMultiGuesses(players: Player[]) {
  const formatedRows = players.map((player) => {
    return { player: player }
  })
  Object.assign(rows, formatedRows)
}

function showRoundResults(round: number, roundResults: RoundResult[]) {
  const formatedRows = roundResults.map((result, i) => {
    return {
      index: { value: i + 1, display: i + 1 },
      player: result.player,
      streak: {
        value: result.streak,
        display: result.lastStreak ? result.streak + ` [` + result.lastStreak + `]` : result.streak
      },
      distance: {
        value: result.distance,
        display:
          result.score === 5000
            ? toMeter(result.distance) + ` [` + formatDuration(result.time * 1000) + `]`
            : toMeter(result.distance)
      },
      score: {
        value: result.score,
        display: result.score
      },
      totalScore:{
        value: result.totalScore,
        display: result.totalScore
      },
      position: result.position,
      isRandomPlonk: result.isRandomPlonk
    }
  })
  Object.assign(rows, formatedRows)

  title.value = `ROUND ${round} RESULTS`
  scrollToTop()
}

function showGameResults(gameResults: GameResult[]) {

  const formatedRows = gameResults.map((result, i) => {
    return {
      index: {
        value: i + 1,
        display: i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1
      },
      player: result.player,
      streak: {
        value: result.streak,
        display: result.streak
      },
      distance: {
        value: result.totalDistance,
        display: toMeter(result.totalDistance)
      },
      score: {
        value: result.totalScore,
        display: `${result.totalScore} [${result.guesses.filter(Boolean).length}]`
      },
      guesses: result.guesses,
      scores: result.scores,
      distances: result.distances,
      totalScore: result.totalScore,
      totalDistance: result.totalDistance
    }
  })
  Object.assign(rows, formatedRows)

  title.value = 'GAME RESULTS'
  scrollToTop()
}

function onRowClick(row: ScoreboardRow) {
  if (props.gameState === 'round-results' && row.index && row.position) {
    props.onRoundResultRowClick(row.index.value, row.position)
  } else if (props.gameState === 'game-results') {
    props.onGameResultRowClick(row as GameResultDisplay)
  }
}

function sortByCol(col: Column) {
  if (!col.sortable) return
  rows.sort((a, b) => {
    const x = a[col.value].value
    const y = b[col.value].value
    return isSorted(col.value) ? x - y : y - x
  })
}

function isSorted(col: string) {
  const arr: number[] = rows.map((row) => row[col].value)
  return JSON.stringify(arr) === JSON.stringify(arr.sort((a, b) => b - a))
}

const scrollSpeed = toRef(() => settings.scrollSpeed)
const { pause, resume } = useIntervalFn(
  () => {
    scroller()
  },
  scrollSpeed,
  { immediate: settings.autoScroll }
)

let direction = 0 // 0: down, 1: up
function scroller() {
  if (!tBody.value) return
  if (!direction) {
    const arrivedBottom =
      Math.abs(tBody.value.scrollHeight - tBody.value.clientHeight - tBody.value.scrollTop) <= 1
    if (!arrivedBottom) {
      tBody.value.scrollBy({ top: 1 })
    } else {
      pause()
      setTimeout(() => {
        direction = 1
        if (settings.autoScroll) resume()
      }, 2000)
    }
  } else {
    if (tBody.value.scrollTop != 0) {
      tBody.value.scrollBy({ top: -0.1 * tBody.value.scrollTop })
    } else {
      pause()
      setTimeout(() => {
        direction = 0
        if (settings.autoScroll) resume()
      }, 3000)
    }
  }
}

function scrollToTop() {
  pause()
  if (tBody.value) tBody.value.scrollTop = 0
  if (!settings.autoScroll) return
  setTimeout(() => {
    direction = 0
    resume()
  }, 3000)
}

function toggleAutoScroll() {
  settings.autoScroll = !settings.autoScroll
  settings.autoScroll ? resume() : pause()
}

function toggleGuesses(e: Event) {
  chatguessrApi.setGuessesOpen((e.target as HTMLInputElement).checked)
}

function setSwitchState(state: boolean) {
  switchState.value = state
}

function toMeter(distance: number) {
  return distance >= 1 ? distance.toFixed(1) + 'km' : Math.floor(distance * 1000) + 'm'
}

defineExpose({
  onStartRound,
  renderGuess,
  renderMultiGuess,
  restoreGuesses,
  restoreMultiGuesses,
  showRoundResults,
  showGameResults,
  setSwitchState
})
</script>

<style scoped>
.scoreboard {
  font-family: 'Montserrat', sans-serif;
  text-align: center;
  padding: 2px;
  color: #fff;
  font-size: 13px;
  background-color: var(--bg-dark-transparent);
  box-shadow: 2px 2px 7px -2px #000;
  border-radius: 5px;
  pointer-events: auto;
  user-select: none;
  cursor: move;
  z-index: 24;
}
.scoreboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 3px 0 3px;
}
.scoreboard-settings {
  width: 70px;
  display: flex;
  gap: 0.2rem;
}

.scoreboard-title {
  font-size: 16px;
}

.scoreboard-hint {
  font-size: 11px;
}

.mode-hint {
  padding-top: 4px;
  font-size: 11px;
}

.switch-container {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 22px;
  float: right;
}
.switch-container:hover {
  transition: box-shadow 0.3s;
  box-shadow: 2px 2px 5px -2px #000;
}
.switch-container input {
  display: none;
}
.switch {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 1px solid #000;
  border-radius: 4px;
  background-color: #e04352;
}
.switch:before {
  position: absolute;
  content: '';
  height: 15px;
  width: 15px;
  left: 2px;
  bottom: 3px;
  border-radius: 3px;
  background-color: #fff;
  transition: transform 0.2s;
  -webkit-transition: transform 0.2s;
}

.column-visibility {
  position: absolute;
  display: flex;
  gap: 0.19rem;
  margin-top: -7px;
  left: 75px;
  padding: 0.2rem;
  font-size: 12px;
  background-color: #000;
  border-radius: 5px;
  z-index: 999999;
}

.btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 65px;
  color: #fff;
  font-weight: 700;
  background-size: 200% auto;
  background-image: linear-gradient(to right, #2e2e2e 0%, #454545 51%, #2e2e2e 100%);
  border: 1px solid #000;
  transition: background-position 0.3s;
  -webkit-transition: background-position 0.3s;
}
.btn-icon {
  width: 32px;
  height: 22px;
}
.btn:hover:not([disabled]) {
  background-position: right center;
}
.btn.active:not([disabled]) {
  background-image: linear-gradient(to right, #1cd997 0%, #33b09b 51%, #1cd997 100%);
}

input:checked + .switch {
  background-color: #1cd997;
}
input:checked + .switch:before {
  transform: translateX(11px);
}

.table-container {
  height: calc(100% - 55px);
  overflow: auto;
}

.table-container::-webkit-scrollbar {
  display: none !important;
}
/* apparently we need scrollbar-width even though it's for FF */
.table-container {
  scrollbar-width: none; /* Firefox */
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-weight: bold;
}
thead {
  top: 0;
  position: sticky;
  background-color: rgba(0, 0, 0);
  z-index: 2;
}
tr {
  height: 30px;
}

tbody tr:nth-child(odd) {
  background-color: rgba(0, 0, 0, 0.1);
}
tbody tr:nth-child(even) {
  background-color: rgba(0, 0, 0, 0.2);
}
tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.3);
  transition: transform 0.1s;
  transform: scale(1.01);
}
th.sortable {
  cursor: pointer;
  transition: color 0.2s ease-in-out;
}
th.sortable:hover {
  color: rgb(180, 180, 180);
}

/* SCROLL SLIDER */
.scrollspeed-slider {
  height: 5px;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  border-radius: 5px;
  outline: none;
  opacity: 0.2;
  transition: opacity 0.3s;
  direction: rtl;
}
.scrollspeed-slider:hover {
  opacity: 1;
}
.scrollspeed-slider::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 30px;
  height: 7px;
  background: #63db85;
  border-radius: 5px;
  cursor: pointer;
}
.scrollspeed-slider::-moz-range-thumb {
  width: 30px;
  height: 7px;
  background: #63db85;
  cursor: pointer;
  border-radius: 5px;
}

/* ROWS ANIMATION */
.vdr-container:not(.dragging, .resizing) .scoreboard_rows-move {
  transition: transform 0.2s ease;
}

.scoreboard_rows-enter-active,
.scoreboard_rows-leave-active {
  transition: transform 0.2s ease;
}
.scoreboard_rows-enter-from,
.scoreboard_rows-leave-to {
  opacity: 0;
  transform: scale(0);
}

/* MODAL ANIMATION */
.scoreboard_modal-enter-active {
  animation: bounce-in 0.3s;
}
.scoreboard_modal-leave-active {
  animation: bounce-in 0.3s reverse;
}
@keyframes bounce-in {
  0% {
    transform: scale3d(0, 0, 0);
  }
  50% {
    transform: scale3d(1.2, 1.2, 1.2);
  }
  100% {
    transform: scale3d(1, 1, 1);
  }
}
</style>
