import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('chatguessrApi', {
  startAuth() {
    ipcRenderer.invoke('start-auth')
  },
  setSession(session: import('@supabase/supabase-js').Session) {
    ipcRenderer.send('set-session', session)
  }
})
