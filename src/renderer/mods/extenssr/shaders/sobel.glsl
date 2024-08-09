vec3 sobel(vec3 inputColor) {
    float top_left     = length(texture2D(texture, vTexCoord + vec2(-du, +dv)).rgb);
    float above        = length(texture2D(texture, vTexCoord + vec2(0.0, +dv)).rgb);
    float top_right    = length(texture2D(texture, vTexCoord + vec2(+du, +dv)).rgb);
    float left         = length(texture2D(texture, vTexCoord + vec2(-du, 0.0)).rgb);
    float right        = length(texture2D(texture, vTexCoord + vec2(+du, 0.0)).rgb);
    float bottom_left  = length(texture2D(texture, vTexCoord + vec2(-du, -dv)).rgb);
    float below        = length(texture2D(texture, vTexCoord + vec2(0.0, -dv)).rgb);
    float bottom_right = length(texture2D(texture, vTexCoord + vec2(+du, -dv)).rgb);

    float X = +top_left - top_right + 2.0 * left - 2.0 * right + bottom_left - bottom_right;
    float Y = -top_left - 2.0 * above - top_right + bottom_left + 2.0 * below + bottom_right;

    float sobel = sqrt(X * X + Y * Y);
    const vec3 edgeColor = vec3(0.0);
    return mix(inputColor.rgb, edgeColor, sobel);
}