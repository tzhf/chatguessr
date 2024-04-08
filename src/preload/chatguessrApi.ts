import { ipcRenderer } from 'electron'

declare global {
  interface Window {
    chatguessrApi: typeof chatguessrApi
  }
}

export const chatguessrApi = {
  setGuessesOpen(open: boolean) {
    if (open) {
      ipcRenderer.send('open-guesses')
    } else {
      ipcRenderer.send('close-guesses')
    }
  },

  startNextRound() {
    ipcRenderer.send('next-round-click')
  },

  returnToMapPage() {
    ipcRenderer.send('return-to-map-page')
  },

  getSettings(): Promise<Settings> {
    return ipcRenderer.invoke('get-settings')
  },

  saveSettings(settings: Settings) {
    ipcRenderer.send('save-settings', settings)
  },

  getBannedUsers(): Promise<{ username: string }[]> {
    return ipcRenderer.invoke('get-banned-users')
  },

  addBannedUser(username: string) {
    ipcRenderer.send('add-banned-user', username)
  },

  deleteBannedUser(username: string) {
    ipcRenderer.send('delete-banned-user', username)
  },

  appDataPathExists(subdir?: string): Promise<string | false> {
    return ipcRenderer.invoke('app-data-path-exists', subdir)
  },

  importAudioFile(): Promise<unknown> {
    return ipcRenderer.invoke('import-audio-file')
  },

  onGameStarted(
    callback: (
      isMultiGuess: boolean,
      restoredGuesses: RoundResult[] | Player[],
      location: Location_
    ) => void
  ) {
    return ipcRendererOn('game-started', callback)
  },

  onGameQuit(callback: () => void) {
    return ipcRendererOn('game-quitted', callback)
  },

  onReceiveGuess(callback: (guess: Guess) => void) {
    return ipcRendererOn('render-guess', callback)
  },

  onReceiveMultiGuesses(callback: (guess: Guess) => void) {
    return ipcRendererOn('render-multiguess', callback)
  },

  onShowRoundResults(
    callback: (
      round: number,
      location: Location_,
      roundResults: RoundResult[],
      markerLimit: number
    ) => void
  ) {
    return ipcRendererOn('show-round-results', callback)
  },

  onShowGameResults(callback: (locations: Location_[], gameResults: GameResult[]) => void) {
    return ipcRendererOn('show-game-results', callback)
  },

  onStartRound(callback: (location: Location_) => void) {
    return ipcRendererOn('next-round', callback)
  },

  onRefreshRound(callback: (location: Location_) => void) {
    return ipcRendererOn('refreshed-in-game', callback)
  },

  onGuessesOpenChanged(callback: (open: boolean) => void) {
    const remove = [
      ipcRendererOn('switch-on', () => callback(true)),
      ipcRendererOn('switch-off', () => callback(false))
    ]
    return () => {
      for (const unlisten of remove) {
        unlisten()
      }
    }
  },

  reconnect(): void {
    ipcRenderer.send('reconnect')
  },

  replaceSession(): void {
    ipcRenderer.invoke('replace-session')
  },

  getTwitchConnectionState(): Promise<TwitchConnectionState> {
    return ipcRenderer.invoke('get-twitch-connection-state')
  },

  onTwitchConnectionStateChange(callback: (state: TwitchConnectionState) => void) {
    return ipcRendererOn('twitch-connection-state', callback)
  },

  onTwitchError(callback: (err: unknown) => void) {
    return ipcRendererOn('twitch-error', callback)
  },

  getSocketConnectionState(): Promise<SocketConnectionState> {
    return ipcRenderer.invoke('get-socket-connection-state')
  },

  onSocketConnected(callback: () => void) {
    return ipcRendererOn('socket-connected', callback)
  },

  onSocketDisconnected(callback: () => void) {
    return ipcRendererOn('socket-disconnected', callback)
  },

  clearStats(): void {
    ipcRenderer.send('clear-stats')
  },

  getCurrentVersion(): Promise<string> {
    return ipcRenderer.invoke('get-current-version')
  }
}

function ipcRendererOn(event: string, callback: (...args: any[]) => void) {
  const listener = (_event: unknown, ...args: unknown[]) => {
    callback(...args)
  }

  ipcRenderer.on(event, listener)
  return () => ipcRenderer.off(event, listener)
}
