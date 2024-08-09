vec3 aiMask(vec3 inputColor) {
    return mix(inputColor.rgb, vec3(0.6, 0.6, 0.6), texture2D(mask, vTexCoord).rgb);
}