import { aliasConfig } from './aliasing'
import type PostProcessingController from './post_processing_controller'
import WebGLContextWrapper from './webgl_context_wrapper'
import type { ContextObserver } from './webgl_context_wrapper'

export type ElementCreatorFactory = (elementName: string) => HTMLElement
export type ContextCreator = (...args: any) => RenderingContext

export default class CanvasManager {
    factory: ElementCreatorFactory
    lastContextId = 0
    createdContexts: Map<number, WebGLContextWrapper> = new Map()
    controller: PostProcessingController
    constructor(factory: ElementCreatorFactory, controller: PostProcessingController) {
        this.factory = factory
        this.controller = controller
    }
    createNewCanvas(): HTMLCanvasElement {
        const canvas = this.factory('canvas') as HTMLCanvasElement
        const thees: CanvasManager = this
        aliasConfig(canvas, {
            getContext: (oldGetContext: { apply: (arg0: HTMLCanvasElement, arg1: any[]) => RenderingContext }) => (function(...args: any[]) {
                if (canvas.getAttribute('data-engine') !== null) {
                    return oldGetContext.apply(canvas, args)
                }
                const creator: ContextCreator = function(...newArgs) {
                    return oldGetContext.apply(canvas, newArgs)
                }
                return thees.onContextRequested(canvas, creator, args)
            })
        })
        return canvas
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onContextRequested(canvas: HTMLCanvasElement, contextCreator: ContextCreator, args: any[]): RenderingContext {
        const contextType = args[0] as string
        // OK, this could be a canvas used to render Streetview
        if (contextType.includes('webgl')) {
            // Create a backing offscreen canvas.
            const backingCanvas = this.factory('canvas') as HTMLCanvasElement
            const options = args[1] || {}
            const backingContext = backingCanvas.getContext(contextType, options) as WebGLRenderingContext

            // Wrap up the context and 
            this.wrapContext(canvas, contextCreator, backingCanvas, backingContext)
            return backingContext
        }
        return contextCreator(args)
    }

    wrapContext(canvas: HTMLCanvasElement, contextCreator: ContextCreator, offscreenCanvas: HTMLCanvasElement, offscreenContext: WebGLRenderingContext): void {
        const wrapper = new WebGLContextWrapper(canvas, contextCreator, offscreenCanvas, offscreenContext, this.controller)
        const id = this.lastContextId++
        const observer: ContextObserver = {
            onRelease: () => {
                this.createdContexts.delete(id)
            }
        }
        wrapper.setObserver(observer)
        this.createdContexts.set(id, wrapper)
    }
}
