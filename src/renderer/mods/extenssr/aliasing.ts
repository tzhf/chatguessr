// @ts-ignore
export function aliasCall(target, methodName, newWrapper) {
    target[methodName] = newWrapper(target[methodName])
}
// @ts-ignore
export function aliasConfig(target, config): void {
    for (const methodName in config) {
        const wrapper = config[methodName]
        if (typeof wrapper === 'function') {
            aliasCall(target, methodName, wrapper)
        }
    }
}
