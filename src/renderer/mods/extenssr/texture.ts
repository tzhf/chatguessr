export default class Texture {
    webglContext: WebGLRenderingContext
    textureId: WebGLTexture
    constructor(gl: WebGLRenderingContext) {
        this.webglContext = gl
        this.textureId = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, this.textureId)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    }
    fromCanvas(canvas: HTMLCanvasElement): void {
        const gl = this.webglContext
        gl.bindTexture(gl.TEXTURE_2D, this.textureId)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
    }
    fromBuffer(width: number, height: number, buffer: Uint8Array): void {
        const gl = this.webglContext
        gl.bindTexture(gl.TEXTURE_2D, this.textureId)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,gl.RGBA, gl.UNSIGNED_BYTE, buffer)
    }
    bindToActiveTexture(activeTexture: number): void {
        const gl = this.webglContext
        //@ts-ignore
        gl.activeTexture(gl['TEXTURE' + activeTexture])
        gl.bindTexture(gl.TEXTURE_2D, this.textureId)
    }
}
