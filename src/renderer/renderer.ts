import { createApp } from 'vue'
import Vue3DraggableResizable from 'vue3-draggable-resizable'
import Frame from './components/Frame.vue'
import ModsControls from './components/Mods/Controls.vue'
import './assets/styles.css'

import './mods/extenssrPostProcessing'
import './mods/extenssrMenuItemsPlugin'

// MAIN FRAME
const wrapper = document.createElement('div')
document.body.append(wrapper)

createApp(Frame)
  .use(Vue3DraggableResizable)
  .mount(wrapper)
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })

// MODS CONTROLS
const modsControls = document.createElement('div')
modsControls.id = 'mods-controls'
createApp(ModsControls).mount(modsControls)

const appendModsControlsComponent = () => {
  const targetElement: HTMLElement | null = document.querySelector(
    '[class^="community-map-block_header__"]'
  )
  if (targetElement) {
    const wrapperExists = document.getElementById('mods-controls')
    if (!wrapperExists) {
      targetElement.after(modsControls)
    }
  }
}

const observer = new MutationObserver(() => {
  appendModsControlsComponent()
})
observer.observe(document.body, { childList: true, subtree: true })
