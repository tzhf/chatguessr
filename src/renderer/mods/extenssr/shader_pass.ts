import type {Scope, ScopeIndex} from '@shaderfrog/glsl-parser/dist/parser/parser'
import {parser} from '@shaderfrog/glsl-parser'
import {UniformType } from './uniform'
import type {Uniform} from './uniform'
//@ts-ignore
import hash from 'string-hash'
import defaultFragment from './shaders/simple_fragment.glsl?raw'
import defaultVertex from './shaders/simple_vertex.glsl?raw'

export type ErrorLocation = {
    start: {
        offset: number,
        line: number,
        column: number
    },
    end: {
        offset: number,
        line: number,
        column: number
    }
}

export class ShaderError {
    message: string
    location?: ErrorLocation
    constructor(message: string, location: ErrorLocation | undefined = undefined) {
        this.message = message
        this.location = location
    }
}

export class ShaderPass {
    rawString: string
    uniformNames: string[]
    functionName: string
    takesInput: boolean
    private constructor(rawString: string, functionName: string, takesInput: boolean, uniformNames: string[]) {
        this.rawString = rawString
        this.functionName = functionName
        this.takesInput = takesInput
        this.uniformNames = uniformNames.slice()
    }
    static fromString(rawString: string): ShaderPass | ShaderError {
        try {
            const ast = parser.parse(rawString, { quiet: true })
            const levelOneScopes = ast.scopes.filter(scope => scope.parent && scope.parent.name === 'global')
            if (levelOneScopes.length != 1) {
                return new ShaderError(`Shader must contain exactly one function! Instead, it has ${levelOneScopes.length}: ${JSON.stringify(levelOneScopes.map(scope => scope.name))}`)
            }
            const topLevelScope = levelOneScopes[0]
            const scopes: Scope[] = []
            let toCheck: Scope[] = []
            toCheck.push(topLevelScope)
            while (toCheck.length) {
                const scope = toCheck.pop()!
                scopes.push(scope)
                toCheck = toCheck.concat(ast.scopes.filter(otherScope => otherScope.parent && otherScope.parent === scope))
            }
            const functionName = topLevelScope.name
            const allVariables = scopes.flatMap(scope => Object.entries(scope.bindings)).filter(([_, data]) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fullData = data as any as ScopeIndex & { initializer: { type: string } }
                return fullData.initializer.type === 'identifier' || fullData.initializer.type === 'parameter_declaration'
            }).map(([key, _]) => key)
            const takesInput = allVariables.includes('inputColor')
            const uniforms = allVariables
                .filter(name => !['texture', 'inputColor', 'vTexCoord'].includes(name))
                .filter(name => !name.startsWith('gl_'))
            return new ShaderPass(rawString, functionName, takesInput, uniforms)
        } catch (e) {
            //@ts-ignore
            return new ShaderError(e.message, e.location)
        }
    }
}

export interface IToggleableShaderPass {
    pass: ShaderPass
    enabled: boolean
    setEnabled(enabled: boolean): void
}

export class ToggleableShaderPass implements IToggleableShaderPass {
    pass: ShaderPass
    enabled: boolean
    constructor(pass: ShaderPass, enabled = false) {
        this.pass = pass
        this.enabled = enabled
    }
    setEnabled(enabled: boolean): void {
        this.enabled = enabled
    }

}

export type PassUpdateFunc = (_: StorageToggleableShaderPass) => void
type  ForceDisableFunc = () => Promise<void>
export class StorageToggleableShaderPass implements IToggleableShaderPass {
    pass: ShaderPass
    enabled: boolean
    updateFunc: PassUpdateFunc
    forceDisable: ForceDisableFunc
    private constructor(pass: ShaderPass, enabled: boolean, updateFunc: PassUpdateFunc, forceDisable: ForceDisableFunc) {
        this.pass = pass
        this.enabled = enabled
        this.updateFunc = updateFunc
        this.forceDisable = forceDisable
    }
    setEnabled(enabled: boolean): void {
        this.enabled = enabled
        this.updateFunc(this)
    }
}
export enum ShaderType {
    VERTEX,
    FRAGMENT
}
export type ShaderInfo = {
    rawString: string,
    type: ShaderType,
    uniforms: Uniform[]
}
export class Shader {
    info: ShaderInfo
    hashString: string
    constructor(info: ShaderInfo) {
        this.info = info
        this.hashString = hash(this.info.rawString) as string
    }
    compileInWebGL(context: WebGLRenderingContext): WebGLShader | ShaderError {
        const shader = context.createShader(this.info.type === ShaderType.VERTEX ? context.VERTEX_SHADER : context.FRAGMENT_SHADER)
        context.shaderSource(shader!, this.info.rawString)
        context.compileShader(shader!)
        const error = context.getShaderInfoLog(shader!)!
        if (error.length > 0) {
            return new ShaderError(error)
        }
        return shader!
    }
    static defaultVertex(): Shader {
        return new Shader({ rawString: defaultVertex, type: ShaderType.VERTEX, uniforms: [] })
    }
    static defaultFragment(): Shader {
        return new Shader(Shader.defaultFragmentInfo())
    }
    static defaultFragmentInfo(): ShaderInfo {
        return { rawString: defaultFragment, type: ShaderType.FRAGMENT, uniforms: [] }
    }
    static createProgram(context: WebGLRenderingContext, fragment: Shader = Shader.defaultFragment(), vertex: Shader = Shader.defaultVertex()): WebGLProgram | ShaderError {
        const program = context.createProgram()!
        const vertexShader = vertex.compileInWebGL(context)
        if (vertexShader instanceof ShaderError) {
            return vertexShader
        }
        const fragmentShader = fragment.compileInWebGL(context)
        if (fragmentShader instanceof ShaderError) {
            return fragmentShader
        }
        context.attachShader(program, vertexShader)
        context.attachShader(program, fragmentShader)
        context.linkProgram(program)
        const message = context.getProgramInfoLog(program)!
        if (message.length > 0) {
            return new ShaderError(message)
        }
        return program
    }
}

const BAKED_IN_UNIFORMS = new Map<string, Uniform>([
    ['texture', { name: 'texture', type: UniformType.TEX }],
    ['mask', { name: 'mask', type: UniformType.TEX }],
    ['du', { name: 'du', type: UniformType.FLOAT }],
    ['dv', { name: 'dv', type: UniformType.FLOAT }],
    ['vx', { name: 'vx', type: UniformType.FLOAT }],
    ['vy', { name: 'vy', type: UniformType.FLOAT }],
    ['globalTime', { name: 'globalTime', type: UniformType.FLOAT }],
])

export function CombinePasses(passes: ShaderPass[], knownUniforms: Map<string, Uniform>): ShaderInfo | ShaderError {
    const orderedPasses = passes.filter(pass => !pass.takesInput).concat(passes.filter(pass => pass.takesInput))
    if (orderedPasses.length == 0) {
        return Shader.defaultFragmentInfo()
    }
    if (orderedPasses.filter((pass) => !pass.takesInput).length > 1) {
        return new ShaderError('Multipass shader has multiple passes that don\'t take input.')
    }
    if (!orderedPasses.every(pass => pass.uniformNames.every(uniformName => knownUniforms.has(uniformName) || BAKED_IN_UNIFORMS.has(uniformName)))) {
        const unkownUniforms = orderedPasses.flatMap(pass => pass.uniformNames).filter(uniformName => !knownUniforms.has(uniformName) && !BAKED_IN_UNIFORMS.has(uniformName))
        return new ShaderError(`Multipass shader has unkown uniforms: ${unkownUniforms.join(', ')}`)
    }
    const requiredUniforms = new Set<string>()
    requiredUniforms.add('texture')
    orderedPasses.forEach(pass => pass.uniformNames.forEach(name => requiredUniforms.add(name)))
    const uniforms = Array.from(requiredUniforms).map(name => knownUniforms.get(name) ?? BAKED_IN_UNIFORMS.get(name)!)
    return {
        rawString: `precision highp float;
                    varying vec2 vTexCoord;
                    // Declare all uniforms.
                    ${uniforms.map(uniform => {
            let s = 'uniform '
            if (!uniform) {
                throw "WTF"
            }
            switch (uniform.type) {
                case UniformType.FLOAT: {
                    s += 'float'
                    break
                }
                case UniformType.VEC2: {
                    s += 'vec2'
                    break
                }
                case UniformType.VEC3: {
                    s += 'vec3'
                    break
                }
                case UniformType.TEX: {
                    s += 'sampler2D'
                    break
                }
                case UniformType.INTVEC: {
                    s += 'int'
                    break
                }
            }
            s += ` ${uniform.name}`
            if (uniform.vecSize) {
                s += `[${uniform.vecSize}]`
            }
            s += ';'
            return s
        }).join('\n')}
                    // Declare all functions.
                    ${orderedPasses.map(pass => pass.rawString).join('\n')}
                    void main() {
                    ${orderedPasses.map((pass, idx) => {
            if (idx == 0) {
                if (!pass.takesInput) {
                    return `vec3 color = ${pass.functionName}();`
                }
                return `vec3 color = texture2D(texture, vTexCoord).rgb;
                            color = ${pass.functionName}(color);`
            }
            return `color = ${pass.functionName}(color);`
        }).join('\n')}
                    gl_FragColor = vec4(color, 1.0);
                    }`,
        type: ShaderType.FRAGMENT,
        uniforms: uniforms.filter(uniformName => !BAKED_IN_UNIFORMS.has(uniformName.name))
    }
}
