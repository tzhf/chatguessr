vec3 flash(vec3 inputColor) {
    return mix(vec3(1.0), inputColor, smoothstep(0.1, 0.75, (globalTime - flashStart) / 1.25));
}