vec3 pixelate() {
    vec2 texCoord = vec2(ivec2(vTexCoord * scaling)) / scaling;
    texCoord.x = float(int(texCoord.x * scaling)) / scaling;
    texCoord.y = float(int(texCoord.y * scaling)) / scaling;
    return texture2D(texture, texCoord).rgb;
}
