import {aliasConfig} from './aliasing'
import CanvasManager from './canvas_manager'
import type PostProcessingController from './post_processing_controller'

type ExtenssrOverrides = {
    controller: PostProcessingController,
}
export type ElementCreatorFactory = (elementName: string) => HTMLElement

export function injectionStartup(controller: PostProcessingController): ExtenssrOverrides {
    const elementCreator = document.createElement
    const elementFactory: ElementCreatorFactory =
        (elementName: string): HTMLElement => elementCreator.apply(document, [elementName as any])
    // Currently, we're only supporting webgl 1 backed post processing.
    const webGLStrings = ['webgl', 'experimental-webgl', 'moz-webgl', 'webkit-3d']
    const detectWebGLSupport = (): boolean => {
        // This is a necessary, but not sufficient condition.
        if (!window.WebGLRenderingContext) {
            return false
        }
        const canvas = elementFactory('canvas') as HTMLCanvasElement
        for (const s of webGLStrings) {
            const ctx = canvas.getContext(s)
            if (ctx) {
                return true
            }
        }
        return false
    }

    const supportsWebGL = detectWebGLSupport()
    if (!supportsWebGL) {
        // TODO: Notify all settings code to grey out attempts at using post processing.
    } else {
        // Lessgoooooooooo
        const manager = new CanvasManager(elementFactory, controller)
        // Now wrap it up.
        aliasConfig(document, {
            //@ts-ignore
            createElement: (oldCreateElement) => (function(...args) {
                // const hasUnityScript = document.querySelectorAll('mmap,kmap,sat-map,msmap,ymaps,lmap').length > 0
                if (args[0] && typeof args[0] === 'string' && args[0].toLowerCase() === 'canvas') {
                    return manager.createNewCanvas()
                }
                return oldCreateElement.apply(document, args)
            })
        })
    }
    return {
        controller
    }
}

export default ExtenssrOverrides;
