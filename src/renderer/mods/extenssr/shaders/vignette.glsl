vec3 vignette(vec3 inputColor) {
    const float pi = 3.1415926;
    return inputColor * vec3(1.0 - pow(length(vTexCoord - vec2(0.5)) * 1.3 + .1, .4 + (sin(globalTime * .75 * pi ) + 1.0) * 0.5));
}