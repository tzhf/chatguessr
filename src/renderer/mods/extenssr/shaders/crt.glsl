vec3 crt() {
    vec3 color = vec3(texture2D(texture, vTexCoord).r, texture2D(texture, vec2(du * 5.0, dv * 10.0) + vTexCoord).g, texture2D(texture, vec2(du * 10.0, dv * 5.0) + vTexCoord).b);
    const float freq = 0.125 * 3.1415926;
    color *= length(sin(gl_FragCoord.xy * freq));
    color = pow(color, vec3(2.2));
    return color;
}