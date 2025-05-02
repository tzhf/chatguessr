import { reactive, watch } from 'vue'
import { defaultSettings } from '../shared/settings/defaultSettings'

const settings = reactive<Settings>({ ...defaultSettings })

watch(settings, () => {
  window.chatguessrApi.saveSettings(JSON.parse(JSON.stringify(settings)))
})

// Initialize once, immediately
;(async () => {
  const storedSettings = await window.chatguessrApi.getSettings()
  Object.assign(settings, storedSettings)
})()

export function useSettings() {
  return { settings }
}
