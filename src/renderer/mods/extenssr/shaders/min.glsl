vec3 minFilter() {
    float minR = 1.0;
    float minG = 1.0;
    float minB = 1.0;

    const int windowSize = 11;
    const int windowRadius = windowSize / 2;
    const int minWindow = -windowRadius;
    const int maxWindow = windowRadius;
    for (int y = minWindow; y <= maxWindow; ++y) {
        for (int x = minWindow; x <= maxWindow; ++x) {
            // Use a circular window
            if ((x * x + y * y) > (windowRadius * windowRadius)) {
                continue;
            }
            vec3 color = texture2D(texture, vTexCoord + vec2(du * float(x), dv * float(y))).rgb;
            minR = min(color.r, minR);
            minG = min(color.g, minG);
            minB = min(color.b, minB);
            
        }
    }
    return vec3(minR, minG, minB);
}