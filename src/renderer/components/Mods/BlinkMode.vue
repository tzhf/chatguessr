<script setup lang="ts">
import { reactive, watch } from 'vue'
import { getLocalStorage, setLocalStorage } from '../../useLocalStorage'

const settings = reactive(
  getLocalStorage('cg_blinkMode__settings', {
    enabled: false,
    timeLimit: 0.8,
    roundDelay: 1
  })
)
watch(settings, () => {
  setLocalStorage('cg_blinkMode__settings', settings)
})

const toggleBlinkMode = () => {
  if (!settings.enabled) {
    try {
      showPanoramaCached()
    } catch {}
  }
}

let mapRoot: HTMLElement | null = null
function getMapRoot() {
  return document.querySelector('[data-qa=panorama]') as HTMLElement
}

function hidePanorama() {
  mapRoot = getMapRoot() || mapRoot
  hidePanoramaCached()
}

function hidePanoramaCached() {
  mapRoot!.style.filter = 'brightness(0%)'
}

function showPanorama() {
  mapRoot = getMapRoot() || mapRoot
  showPanoramaCached()
}

function showPanoramaCached() {
  mapRoot!.style.filter = 'brightness(100%)'
}

function isLoading() {
  return (
    document.querySelector('[class^="fullscreen-spinner_root__"]') ||
    !document.querySelector('.widget-scene-canvas')
  )
}

let wasBackdropThereOrLoading = false
function isBackdropThereOrLoading() {
  return isLoading() || document.querySelector('[class^="result-layout_root__"]')
}

let showTimeoutID: NodeJS.Timeout
let hideTimeoutID: NodeJS.Timeout
function triggerBlink() {
  hidePanorama()
  clearTimeout(showTimeoutID)
  showTimeoutID = setTimeout(showPanorama, settings.roundDelay * 1000)
  clearTimeout(hideTimeoutID)
  hideTimeoutID = setTimeout(hidePanorama, (settings.timeLimit + settings.roundDelay) * 1000)
}

const observer = new MutationObserver(() => {
  if (settings.enabled) {
    if (isBackdropThereOrLoading()) {
      wasBackdropThereOrLoading = true
      if (!isLoading()) hidePanorama()
    } else if (wasBackdropThereOrLoading) {
      wasBackdropThereOrLoading = false
      triggerBlink()
    }
  }
})

observer.observe(document.body, {
  subtree: true,
  childList: true
})
</script>

<template>
  <div class="section_sizeMedium mb-1">
    <div class="bars_root bars_center">
      <div class="bars_before"></div>
      <span class="bars_content"><h3>Blink Mode settings</h3></span>
      <div class="bars_after"></div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2rem">
      <div class="flex items-center gap-05">
        <input
          v-model="settings.enabled"
          type="checkbox"
          class="toggle_toggle"
          @change="toggleBlinkMode()"
        />
        <label class="game-options_optionLabel">Enabled</label>
      </div>

      <label>
        <span class="game-options_optionLabel">Time</span>
        <input
          v-model.number="settings.timeLimit"
          type="range"
          class="custom-slider"
          min="0.1"
          max="5"
          step="0.1"
        />
        <span class="game-options_optionLabel">{{ settings.timeLimit }} sec</span>
      </label>

      <label>
        <span class="game-options_optionLabel">Round delay</span>
        <input
          v-model.number="settings.roundDelay"
          type="range"
          class="custom-slider"
          min="0.1"
          max="5"
          step="0.1"
        />
        <span class="game-options_optionLabel">{{ settings.roundDelay }} sec</span>
      </label>
    </div>
  </div>
</template>
