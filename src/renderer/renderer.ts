import { createApp } from 'vue'
import Vue3DraggableResizable from 'vue3-draggable-resizable'
import Frame from './components/Frame.vue'
import './assets/styles.css'

import './mods/extenssrMenuItemsPlugin'
import './mods/noCarNoCompass'
import './mods/blinkMode'
import './mods/satelliteMode'

const wrapper = document.createElement('div')
document.body.append(wrapper)

createApp(Frame)
  .use(Vue3DraggableResizable)
  .mount(wrapper)
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
