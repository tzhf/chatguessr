import path from 'path'
import { BrowserWindow, shell } from 'electron'

const isDev = process.env.npm_lifecycle_event === 'dev'

// Create the Auth window.
export default async function createAuthWindow(
  parentWindow: BrowserWindow,
  options: { authUrl?: string | null | undefined; clearStorageData: boolean }
) {
  const win = new BrowserWindow({
    height: 800,
    parent: parentWindow,
    show: false,
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, './auth_preload.js'),
      devTools: isDev ? true : false,
      // Use a separate browser session so we can force log people out of
      // Twitch without logging them out of GeoGuessr.
      partition: 'persist:backendAuth',
      sandbox: false
    }
  })
  win.setMenuBarVisibility(false)

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('did-navigate', (_event, url) => {
    // If we can go through the auth process without user interaction, we would end up at /streamer/redirect.
    // We don't need to show the window at all then.
    const isTwitchHeadlessUrl = url.startsWith('https://id.twitch.tv/oauth2/authorize?client_id')
    const isSuccessfulRedirectUrl = url.includes('streamer/redirect#access_token')
    if (!isTwitchHeadlessUrl && !isSuccessfulRedirectUrl) {
      win.show()
    }
  })

  if (options.clearStorageData) {
    await win.webContents.session.clearStorageData()
  }

  win.loadURL(options.authUrl ?? `file://${path.join(__dirname, `../../src/auth/index.html`)}`)

  if (isDev) win.webContents.openDevTools()

  return win
}
