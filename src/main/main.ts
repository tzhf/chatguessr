import fs from 'fs'
import { join } from 'path'
import { app, BrowserWindow, ipcMain, protocol, dialog } from 'electron'
import { updateElectronApp } from 'update-electron-app'

import createMainWindow from './MainWindow'
import createAuthWindow from '../auth/AuthWindow'
import GameHandler from './GameHandler'
import { database } from './utils/Database'
import { supabase } from './utils/useSupabase'
import { store } from './utils/store'
import { loadCustomFlags, findFlagFile } from './lib/flags/flags'
import { version } from '../../package.json'

if (process.platform == 'win32') updateElectronApp()

const appDataPath = app.getPath('userData')
const dbPath = join(appDataPath, 'scores.db')
const db = database(dbPath)

// This method will be called when Electron has finished initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  serveAssets()
  await serveFlags()

  const mainWindow = createMainWindow()

  const gameHandler = new GameHandler(db, mainWindow, {
    async requestAuthentication() {
      await authenticateWithTwitch(gameHandler, mainWindow)
    }
  })

  ipcMain.handle('get-twitch-connection-state', () => gameHandler.getTwitchConnectionState())
  ipcMain.handle('get-socket-connection-state', () => gameHandler.getSocketConnectionState())
  ipcMain.handle('replace-session', async () => {
    await supabase.auth.signOut()
    await authenticateWithTwitch(gameHandler, mainWindow)
  })

  ipcMain.handle('app-data-path-exists', (_event, subdir) => {
    let _path = appDataPath
    if (subdir) _path = join(appDataPath, subdir)
    if (!fs.existsSync(_path)) return false
    return _path
  })

  ipcMain.handle('import-audio-file', async () => {
    return new Promise((resolve, reject) => {
      dialog
        .showOpenDialog(mainWindow, {
          title: 'Import audio file',
          buttonLabel: 'Import audio File',
          filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg'] }]
        })
        .then((result) => {
          if (result.canceled) return resolve(null)

          const filePath = result.filePaths[0]
          if (!filePath) return reject('Error locating path')

          const targetDirectory = join(appDataPath, 'timer')
          if (!fs.existsSync(targetDirectory)) {
            fs.mkdir(targetDirectory, (err) => {
              if (err) return reject(err)
            })
          }

          const data = fs.readFileSync(filePath)
          // not saving the extension here so we can overwrite audio files having different extensions without extra logic
          fs.writeFile(join(targetDirectory, 'timer_alert'), data, (err) => {
            if (err) return reject(err)

            resolve(join(targetDirectory, 'timer_alert'))
          })
        })
        .catch((err) => {
          reject(err)
        })
    })
  })

  ipcMain.handle('get-current-version', () => version)

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      store.set('session', session)
    } else if (event === 'SIGNED_OUT') {
      store.delete('session')
    }
  })

  await authenticateWithTwitch(gameHandler, mainWindow)
})

async function authenticateWithTwitch(gameHandler: GameHandler, parentWindow: BrowserWindow) {
  const hasSession = !!store.get('session')?.access_token

  const authConfig = await supabase.auth.signInWithOAuth({
    provider: 'twitch',
    options: {
      redirectTo: new URL('/streamer/redirect', `https://${import.meta.env.VITE_CG_PUBLIC_URL}`)
        .href,
      scopes: ['chat:read', 'chat:edit', 'whispers:read'].join(' ')
    }
  })

  // If we have an existing session, we try to go through the login flow without user interaction.
  // This way users don't have to sign in manually every time they open ChatGuessr.
  const authUrl = hasSession ? authConfig.data.url : undefined

  const authWindow = await createAuthWindow(parentWindow, {
    authUrl,
    clearStorageData: !hasSession
  })

  const startAuth = () => {
    supabase.auth.signOut().finally(() => {
      // @ts-expect-error
      authWindow.loadURL(authConfig.data.url)
    })
  }

  const setSession = (_event: Electron.IpcMainEvent, session: Session) => {
    supabase.auth.setSession(session)
    gameHandler.authenticate(session)

    authWindow.close()
  }

  ipcMain.once('set-session', setSession)
  ipcMain.handle('start-auth', startAuth)
  authWindow.on('closed', () => {
    ipcMain.off('set-session', setSession)
    ipcMain.removeHandler('start-auth')
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows o
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

// Serve assets to 'asset:' file protocol
// Assets must be placed in the public folder
function serveAssets() {
  const assetDir = join(__dirname, './assets')
  protocol.interceptFileProtocol('asset', (request, callback) => {
    const assetFile = join(assetDir, new URL(request.url).pathname)
    if (!assetFile.startsWith(assetDir)) {
      callback({ statusCode: 404, data: 'Not Found' })
    } else {
      callback({ path: assetFile })
    }
  })
}

async function serveFlags() {
  await loadCustomFlags()

  protocol.interceptFileProtocol('flag', async (request, callback) => {
    const name = request.url.replace(/^flag:/, '')
    try {
      callback(await findFlagFile(name))
    } catch (err: any) {
      callback({ statusCode: 500, data: err.message })
    }
  })
}
