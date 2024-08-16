import { UniformType } from './uniform'
import type { Uniform } from './uniform'
import type { Dirtifier, OffscreenContext } from './webgl_context_wrapper'
// import AiOverlay from './ai_overlay'
import Texture from './texture'
import Material from './material'
import { Shader, type ShaderInfo } from './shader_pass'

export class PostprocessHandler {
    canvas: HTMLCanvasElement
    webglContext: WebGLRenderingContext
    offscreenCanvas: HTMLCanvasElement
    offscreenContext: OffscreenContext

    texture: Texture
    coords: WebGLBuffer | null = null

    currentMaterialHash: string = ''
    defaultMaterial: Material
    shaders: Map<string, Material> = new Map()
    uniforms: Map<string, Uniform> = new Map()

    // aiOverlay: AiOverlay
    dirtifier: Dirtifier
    startTime = Date.now()

    hasAnimations = false

    constructor(canvas: HTMLCanvasElement, webglContext: WebGLRenderingContext, offscreenCanvas: HTMLCanvasElement, offscreenContext: OffscreenContext, dirtifier: Dirtifier) {
        this.canvas = canvas
        this.webglContext = webglContext
        this.offscreenCanvas = offscreenCanvas
        this.offscreenContext = offscreenContext
        this.dirtifier = dirtifier
        this.uniforms.set('du',  { name: 'du', type: UniformType.FLOAT, value: [1.0] })
        this.uniforms.set('dv', { name: 'dv', type: UniformType.FLOAT, value: [1.0] })
        this.uniforms.set('globalTime', { name: 'globalTime', type: UniformType.FLOAT, value: [0.0] })
        this.uniforms.set('texture', { name: 'texture', type: UniformType.TEX, value: [0] })
        this.uniforms.set('mask', { name: 'mask', type: UniformType.TEX, value: [1] })
        this.uniforms.set('vx', {name: 'vx', type: UniformType.FLOAT, value: [0.0]})
        this.uniforms.set('vy', {name: 'vy', type: UniformType.FLOAT, value: [0.0]})
        this.#createBuffers()
        this.texture = new Texture(webglContext)
        // this.aiOverlay = new AiOverlay(offscreenCanvas, webglContext, dirtifier)

        this.defaultMaterial = new Material(webglContext)
    }

    updateSpeed(vx: number, vy: number) {
        this.uniforms.set('vx', {name: 'vx', type: UniformType.FLOAT, value: [vx]})
        this.uniforms.set('vy', {name: 'vy', type: UniformType.FLOAT, value: [vy]})
    }

    toggleCar(hide: boolean) {
        if (this.offscreenContext.hideCar != hide) {
            this.offscreenContext.hideCar = hide
            // TODO: Artificially toggle a refresh
        }
    }

    updateMaterial(shaderInfo: ShaderInfo) {
        const shader = new Shader(shaderInfo)
        if (!this.shaders.has(shader.hashString)) {
            this.shaders.set(shader.hashString, new Material(this.webglContext, shader))
        }
        // const material = this.shaders.get(shader.hashString)!;
        // if (material.locations.has('mask')) {
        //     this.aiOverlay.initModel().then(() => {
        //     this.aiOverlay.enabled = true
        //     })
        // } else {
        //     this.aiOverlay.enabled = false
        // }
        shader.info.uniforms.forEach(uniform => {
            this.uniforms.set(uniform.name, uniform)
        })
        this.currentMaterialHash = shader.hashString
        requestAnimationFrame(() => this.onOfscreenCanvasDrawn())
        
    }

    #createBuffers(): void {
        const gl = this.webglContext
        this.coords = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.coords)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, 1, 1, 1, -1, -1, -1]), gl.STATIC_DRAW)
    }
    #currentMaterial(): Material {
        if (!this.currentMaterialHash) {
            this.currentMaterialHash = ''
        }
        if (this.currentMaterialHash === '') {
            return this.defaultMaterial
        }
        return this.shaders.get(this.currentMaterialHash)!
    }
    #updateBakedInValues(): void {
        // this.aiOverlay.recomputeMask()
        this.texture.fromCanvas(this.offscreenCanvas)
        this.texture.bindToActiveTexture(0)
        // this.aiOverlay.maskTexture.bindToActiveTexture(1)
        // TODO: move this to resize event listener.
        this.uniforms.get('du')!.value = [1.0 / this.canvas.width]
        this.uniforms.get('dv')!.value = [1.0 / this.canvas.height]
        this.uniforms.get('globalTime')!.value = [(Date.now() - this.startTime) / 1000.0]

    }
    onOfscreenCanvasDrawn(): void {
        const gl = this.webglContext
        this.#updateBakedInValues()
        const material = this.#currentMaterial()
        material.setUniforms(this.uniforms)
        this.hasAnimations = material.locations.has('globalTime') || material.locations.has('vx') || material.locations.has('vy')
        gl.viewport(0, 0, this.canvas.width, this.canvas.height)
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
    }
}
