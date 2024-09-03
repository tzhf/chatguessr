vec3 toon(vec3 inputColor) {
    return floor(inputColor * toonScale) / toonScale;
}