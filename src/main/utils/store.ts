import ElectronStore from 'electron-store'

type Schema = {
  settings: Settings
  session: Session | null
}

export const store: ElectronStore<Schema> = new ElectronStore()
