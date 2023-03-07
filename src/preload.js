"use strict";

require("./errorReporting");

const { contextBridge, ipcRenderer } = require("electron");

import { qs, createEl } from "./utils/domUtils";
import { createApp } from "vue";
import Frame from "./components/Frame.vue";

const Settings = require("./utils/Settings");

/** @typedef {import('./types').LatLng} LatLng */
/** @typedef {import('./types').Guess} Guess */

/** @type {import("./types").ChatguessrApi} */
const chatguessrApi = {
    init,
    startNextRound() {
        ipcRenderer.send("next-round-click");
    },
    returnToMapPage() {
        ipcRenderer.send("return-to-map-page");
    },
};

contextBridge.exposeInMainWorld("chatguessrApi", chatguessrApi);

/**
 * @param {import('./types').RendererApi} rendererApi
 */
function init(rendererApi) {
    rendererApi.drParseNoCar();
    rendererApi.blinkMode();
    rendererApi.satelliteMode();

    const wrapper = document.createElement("div");
    document.body.append(wrapper);

    const app = createApp(Frame, {
        rendererApi,
        ipcRenderer,
    });
    app.mount(wrapper);
}
