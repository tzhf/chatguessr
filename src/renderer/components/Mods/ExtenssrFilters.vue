<script setup lang="ts">
import { reactive, watch } from 'vue'
import { getLocalStorage, setLocalStorage } from '../../useLocalStorage'
import { defaultPP } from '@/mods/extenssr/post_processing_controller'

const settings = reactive(
  getLocalStorage('cg_filters__settings', {
    hideCar: false,
    noCompass: false,
    water: false,
    scramble: false,
    pixelate: false,
    pixelScale: 100,
    grayscale: false,
    toon: false,
    toonScale: 7,
    crt: false,
    min: false
  })
)
// Set initial post processing values
if (window.pp) {
  const ppKeys = Object.keys(window.pp)
  for (const key of Object.keys(settings)) {
    if (ppKeys.includes(key)) {
      window.pp[key] = settings[key]
    }
  }
  if (window.ppController) {
    try {
      window.ppController.updateState(window.pp)
    } catch (e) {
      window.pp = defaultPP()
      for (const key of Object.keys(window.pp)) {
        settings[key] = window.pp[key]
      }
      window.ppController.updateState(window.pp)
    }
  }
}

watch(settings, () => {
  setLocalStorage('cg_filters__settings', settings)
})

const createStyleElement = (css: string) => {
  const style = document.createElement('style')
  style.textContent = css
  return style
}

const compassRemover = createStyleElement(
  '[data-qa="compass"], [class^="panorama-compass_"] { display: none; }'
)

if (settings.noCompass) document.head.append(compassRemover)

if (settings.grayscale) {
  const next = document.querySelector('#__next') as HTMLElement
  if (next) {
    next.style.filter = 'grayscale(100%)'
  }
}

const toggleNoCompassMode = () => {
  if (settings.noCompass) {
    document.head.append(compassRemover)
  } else {
    compassRemover.remove()
  }
}

const toggleGrayscaleMode = () => {
  const nextApp = document.querySelector('#__next') as HTMLElement
  if (nextApp) {
    nextApp.style.filter = settings.grayscale ? 'grayscale(100%)' : 'none'
  }
}

const toggleMode = (property: keyof typeof settings) => {
  if (window.ppController) {
    window.pp[property] = settings[property]
    try {
      window.ppController.updateState(window.pp)
    } catch (e) {
      console.log('Whoops, try to get back to a sane state')
      window.pp = defaultPP()
      for (const key of Object.keys(window.pp)) {
        settings[key] = window.pp[key]
      }
      window.ppController.updateState(window.pp)
      return
    }
    // Fixup after updating the state; some settings are mutually exclusive
    for (const key of Object.keys(settings)) {
      if (key !== property && settings[key] !== window.pp[key]) {
        // exclude noCompass and grayscale
        if (key === 'noCompass' || key === 'grayscale') return
        settings[key] = window.pp[key]
      }
    }
  }
}

const onToonScaleChange = () => {
  if (window.ppController) {
    window.pp.toonScale = settings.toonScale
    toggleMode('toon')
  }
}

const onPixelScaleChange = () => {
  if (window.ppController) {
    window.pp.pixelScale = settings.pixelScale
    toggleMode('pixelate')
  }
}
</script>

<template>
  <div class="section_sizeMedium">
    <div class="bars_root bars_center">
      <div class="bars_before"></div>
      <span class="bars_content"><h3>Extenssr filters</h3></span>
      <div class="bars_after"></div>
    </div>

    <div class="flex flex-col gap-03">
      <div class="flex items-center gap-05">
        <input
          v-model="settings.hideCar"
          type="checkbox"
          class="toggle_toggle"
          @change="toggleMode('hideCar')"
        />
        <label class="game-options_optionLabel">No car</label>
      </div>

      <div class="flex items-center gap-05">
        <input
          v-model="settings.noCompass"
          type="checkbox"
          class="toggle_toggle"
          @change="toggleNoCompassMode()"
        />
        <label class="game-options_optionLabel">No compass</label>
      </div>

      <div class="flex items-center" style="justify-content: space-between">
        <div class="flex items-center gap-05">
          <input
            v-model="settings.toon"
            type="checkbox"
            class="toggle_toggle"
            @change="toggleMode('toon')"
          />
          <label class="game-options_optionLabel">Toon</label>
        </div>

        <input
          v-model.number="settings.toonScale"
          type="range"
          class="custom-slider reverse"
          min="1"
          max="20"
          step="0.1"
          @input="onToonScaleChange()"
        />
      </div>

      <div class="flex items-center" style="justify-content: space-between">
        <div class="flex items-center gap-05">
          <input
            v-model="settings.pixelate"
            type="checkbox"
            class="toggle_toggle"
            @change="toggleMode('pixelate')"
          />
          <label class="game-options_optionLabel">Pixelate</label>
        </div>

        <input
          v-model.number="settings.pixelScale"
          type="range"
          class="custom-slider reverse"
          min="1"
          max="500"
          step="1"
          @input="onPixelScaleChange()"
        />
      </div>

      <div class="flex items-center gap-05">
        <input
          v-model="settings.water"
          type="checkbox"
          class="toggle_toggle"
          @change="toggleMode('water')"
        />
        <label class="game-options_optionLabel">Water Filter</label>
      </div>

      <div class="flex items-center gap-05">
        <input
          v-model="settings.grayscale"
          type="checkbox"
          class="toggle_toggle"
          @change="toggleGrayscaleMode"
        />
        <label class="game-options_optionLabel">Grayscale</label>
      </div>

      <div class="flex items-center gap-05">
        <input
          v-model="settings.scramble"
          type="checkbox"
          class="toggle_toggle"
          @change="toggleMode('scramble')"
        />
        <label class="game-options_optionLabel">Scramble</label>
      </div>

      <div class="flex items-center gap-05">
        <input
          v-model="settings.crt"
          type="checkbox"
          class="toggle_toggle"
          @change="toggleMode('crt')"
        />
        <label class="game-options_optionLabel">Crt</label>
      </div>

      <div class="flex items-center gap-05">
        <input
          v-model="settings.min"
          type="checkbox"
          class="toggle_toggle"
          @change="toggleMode('min')"
        />
        <label class="game-options_optionLabel">Min</label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section_sizeMedium {
  width: 400px;
  padding: 0 1rem 1rem 1rem;
}
.section_sizeMedium .custom-slider {
  margin: 0;
  width: 150px;
}
</style>
