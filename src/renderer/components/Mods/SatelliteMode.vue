<script setup lang="ts">
import { reactive, watch } from 'vue'
import { getLocalStorage, setLocalStorage } from '../../useLocalStorage'

const settings = reactive(
  getLocalStorage('cg_satelliteMode__settings', {
    enabled: false,
    boundsLimit: 10
  })
)
watch(settings, () => {
  setLocalStorage('cg_satelliteMode__settings', settings)
})
</script>

<template>
  <div class="section_sizeMedium">
    <div class="bars_root bars_center">
      <div class="bars_before"></div>
      <span class="bars_content"><h3>Satellite Mode</h3></span>
      <div class="bars_after"></div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2rem">
      <div class="flex items-center gap-05">
        <input v-model="settings.enabled" type="checkbox" class="toggle_toggle" />
        <label class="game-options_optionLabel">Enabled</label>
      </div>

      <label style="grid-column: 3">
        <span class="game-options_optionLabel">Limit</span>
        <input
          v-model.number="settings.boundsLimit"
          type="range"
          class="custom-slider"
          min="1"
          max="500"
          step="1"
        />
        <span class="game-options_optionLabel">{{ settings.boundsLimit }} km</span>
      </label>
    </div>
  </div>
</template>