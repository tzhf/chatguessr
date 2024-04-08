import fs from 'fs'
import { join } from 'path'
import { contextBridge, ipcRenderer } from 'electron'
import whenDomReady from 'when-dom-ready'

const impl = fs.readFileSync(join(__dirname, 'auth_impl.js'), 'utf8')

whenDomReady().then(() => {
  const script = document.createElement('script')
  script.type = 'module'
  script.innerHTML = impl
  document.body.appendChild(script)
})

contextBridge.exposeInMainWorld('chatguessrApi', {
  startAuth() {
    ipcRenderer.invoke('start-auth')
  },
  setSession(session: import('@supabase/supabase-js').Session) {
    ipcRenderer.send('set-session', session)
  }
})
