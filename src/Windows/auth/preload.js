const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("chatguessrApi", {
	/**
    * @param {import('@supabase/supabase-js').Session} session
	 */
	setSession(session) {
		ipcRenderer.send("set-session", session);
	},
});
