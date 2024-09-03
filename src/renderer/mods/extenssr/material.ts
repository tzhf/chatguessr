import { Shader } from './shader_pass'
import { UniformType } from './uniform'
import type {Uniform} from './uniform'

export default class Material {
    webglContext: WebGLRenderingContext
    program: WebGLProgram

    locations: Map<string, WebGLUniformLocation> = new Map()

    // TODO: add safety checks.
    constructor(webglContext: WebGLRenderingContext, fragment: Shader = Shader.defaultFragment()) {
        this.webglContext = webglContext
        const program = Shader.createProgram(webglContext, fragment)
        const numUniforms = webglContext.getProgramParameter(program, webglContext.ACTIVE_UNIFORMS) as number
        for (let i = 0; i < numUniforms; ++i) {
            const info = webglContext.getActiveUniform(program, i)!
            let name = info.name
            if (name.endsWith('[0]')) {
                name = name.substring(0, name.indexOf('['))
            }
            const location = webglContext.getUniformLocation(program, name)!
            this.locations.set(name, location)
        }
        this.program = program
        // TODO: not sure how often this needs to run.
        const coords = webglContext.getAttribLocation(program, 'coordinates')
        webglContext.vertexAttribPointer(coords, 2, webglContext.FLOAT, false, 0, 0)
        webglContext.enableVertexAttribArray(coords)
    }
    setUniforms(uniforms: Map<string, Uniform>): void {
        const gl = this.webglContext
        gl.useProgram(this.program)
        for (const [name, uniform] of uniforms) {
            if (!this.locations.has(name)) {
                continue
            }
            switch(uniform.type) {
                case UniformType.FLOAT: {
                    gl.uniform1fv(this.locations.get(uniform.name)!, uniform.value!)
                    break
                }
                case UniformType.VEC2: {
                    gl.uniform2fv(this.locations.get(uniform.name)!, uniform.value!)
                    break
                }
                case UniformType.VEC3: {
                    gl.uniform3fv(this.locations.get(uniform.name)!, uniform.value!)
                    break
                }
                case UniformType.TEX: {
                    gl.uniform1iv(this.locations.get(uniform.name)!, uniform.value!)
                    break
                }
                case UniformType.INTVEC: {
                    gl.uniform1iv(this.locations.get(uniform.name)!, uniform.value!)
                    break
                }
            }
        }
    }
}
