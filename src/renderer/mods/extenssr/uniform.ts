export enum UniformType {
    FLOAT,
    VEC2,
    VEC3,
    TEX,
    INT,
    INTVEC
}

export type Uniform = {
    name: string
    type: UniformType
    vecSize?: number
    value?: number[]
}

export interface UpdatableUniform {
    uniform: Uniform
    updateUniform(uniform: Uniform): void
}

export type UniformUpdateFunc = (_: Uniform) => void

export class StorageUpdatableUniform implements UpdatableUniform {
    uniform: Uniform
    paused = false
    pausedUniform: Uniform | null = null
    func: UniformUpdateFunc
    private constructor(name: string, type: UniformType, func: UniformUpdateFunc, value: number[] | undefined = undefined) {
        this.uniform = {name, type, value}
        this.func = func
    }
    pause(paused: boolean): void {
        const oldPaused = this.paused
        this.paused = paused
        if (this.paused && !oldPaused && this.pausedUniform !== null) {
            this.uniform = this.pausedUniform
        }
        if (!this.paused) {
            this.pausedUniform = null
        }
    }
    updateUniform(uniform: Uniform): void {
        if (this.paused) {
            this.pausedUniform = this.uniform
        } 
        this.uniform = uniform
        this.func(this.uniform)
    }
}
