vec3 motionBlur() {
    vec3 color = vec3(0.0);
    vec2 direction = vec2(vx, vy);
    const int window_size = 15;
    float coef = 1.0;
    for (int i = 0; i <= window_size; ++i) {
        float distance = float(i);
        float local_coef = exp(-1.0 / (1.0+distance*distance));
        coef += local_coef;
        color += texture2D(texture, vTexCoord + direction * 5.0 * distance * vec2(du, dv)).rgb * local_coef;
    }
    return color / coef;

}