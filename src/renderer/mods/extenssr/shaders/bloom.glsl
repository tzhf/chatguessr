vec3 bloom(vec3 inputColor) {
    vec3 color = vec3(0.0);
    const float oneOver121 = 1.0 / 121.0;
    const vec3 grayCoefs = vec3(0.2126, 0.7152, 0.0722);
    for (int i = -5; i <= 5; ++i)
    for (int j = -5; j <= 5; ++j) {
        vec3 comp = texture2D(texture, vTexCoord + 5.0 * vec2(du, dv) * vec2(i, j)).rgb;
        float brightness = dot(comp, grayCoefs);
        color += comp * step(.8, brightness) * oneOver121;
    }
    return inputColor + color;
}