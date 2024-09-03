vec3 drunk() {
    const float pi    = 3.1415926;
    const float blurStart = 1.0;
    const float blurWidth = 0.1;
    const int nsamples = 9;

    vec2 center = vec2(0.5) + 0.2 *  vec2(cos(2.0 * pi * 1.3 * globalTime), sin(2.0 * pi * 1.3 * globalTime));
	vec2 uv = vTexCoord - center;    
    float precompute = blurWidth * (1.0 / float(nsamples - 1));
    vec3 radialBlur = vec3(0.0);

    for(int i = 0; i < nsamples; i++)
    {
        float scale = blurStart + (float(i)* precompute);
        radialBlur += texture2D(texture, uv * scale + center).rgb;
    }
    radialBlur /= float(nsamples);
    vec3 deltaColor   = texture2D(texture, vTexCoord + vec2(cos(globalTime * 1.9 * pi) * du * 15.0, sin(globalTime * 1.6 * pi) * dv * 10.0)).rgb;
    return mix(radialBlur, deltaColor, 0.5 + (sin(2.5 * pi * globalTime) + 1.0) * 0.035);
}
