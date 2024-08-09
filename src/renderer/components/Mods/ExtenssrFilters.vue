<script setup lang="ts">
import { reactive, watch } from 'vue'
import { getLocalStorage, setLocalStorage } from '../../useLocalStorage'

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

const toggleNoCompassMode = () => {
  if (settings.noCompass) {
    document.head.append(compassRemover)
  } else {
    compassRemover.remove()
  }
}

const toggleMode = (property: keyof typeof settings) => {
  if (window.ppController) {
    window.pp[property] = settings[property]
    window.ppController.updateState(window.pp)
  }
}
const toggleGrayscaleMode = () => {
  document.body.style.filter = settings.grayscale ? 'grayscale(100%)' : 'none'
}

const toggleToonMode = () => {
  if (window.ppController) {
    window.pp.toon = settings.toon
    window.pp.toonScale = settings.toonScale
    window.ppController.updateState(window.pp)
  }
}

const togglePixelateMode = () => {
  if (window.ppController) {
    window.pp.pixelate = settings.pixelate
    window.pp.pixelScale = settings.pixelScale
    window.ppController.updateState(window.pp)
  }
}
</script>

<template>
  <div class="section_sizeMedium mb-1">
    <div class="bars_root bars_center">
      <div class="bars_before"></div>
      <span class="bars_content"><h3>Extenssr filters</h3></span>
      <div class="bars_after"></div>
    </div>

    <div style="display: flex; justify-content: space-between">
      <div class="flex flex-col gap-05">
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
            @change="toggleNoCompassMode"
          />
          <label class="game-options_optionLabel">No compass</label>
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
      </div>

      <div class="flex flex-col gap-05">
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
            v-model="settings.pixelate"
            type="checkbox"
            class="toggle_toggle"
            @change="togglePixelateMode"
          />
          <label class="game-options_optionLabel">Pixelate</label>
        </div>
      </div>

      <div class="flex flex-col gap-05">
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

        <div class="flex items-center gap-05">
          <input
            v-model="settings.toon"
            type="checkbox"
            class="toggle_toggle"
            @change="toggleToonMode()"
          />
          <label class="game-options_optionLabel">Toon</label>
        </div>
      </div>
    </div>
  </div>
</template>
