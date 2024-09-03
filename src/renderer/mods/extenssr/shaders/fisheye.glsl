vec3 fishEye() {
    float aspect = du/dv;
    vec2 distorsion = vTexCoord - vec2(0.5);
    distorsion.x *= aspect;
    float len = length(distorsion);
    float k1 = .7;
    float k2 = 1.0;
    float k3 = -6.4;
    
    distorsion 
        = distorsion*k1 
        + distorsion*len*k2 
        + distorsion*len*len*k3;
    distorsion.x /= aspect;
    return texture2D(texture, distorsion + vec2(0.5)).rgb;
}