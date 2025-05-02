import { defaultSettings } from '../../shared/settings/defaultSettings'
import { store } from './store'

const storedSettings = store.get('settings')

const settings = Object.assign({}, defaultSettings, storedSettings)

const saveSettings = (newSettings: Settings): void => {
  Object.assign(settings, newSettings)
  store.set('settings', settings)
}

export { settings, saveSettings }
