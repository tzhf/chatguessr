vec3 water() {
    vec2 uv = vTexCoord;
    const vec2 d = vec2(0.5);
    float r = length(uv - d);
    const float pi = 3.14159265359;
    uv.x += du * 50.0 * cos(sin(r * 2.0 * pi) * 5.0 * pi);
    uv.y += dv * 50.0 * sin(sin(r * 2.0 * pi) * 5.0 * pi);
    return texture2D(texture, uv).rgb;
}