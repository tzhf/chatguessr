// Default fragment shader + no car script.
precision highp float;
const float h = 3.1415926;
varying vec3 a;
varying vec3 eyeDirection;
uniform vec4 b;
uniform float f;
uniform float hideCar;
uniform sampler2D g;
void main() {
    vec2 texCoord = a.xy / a.z;
    vec4 color = vec4(texture2D(g, texCoord).rgb, f);
    vec2 normalizedEyeDirection = eyeDirection.xy / a.z;
    normalizedEyeDirection.x = abs(normalizedEyeDirection.x * 4.0 - 2.0);
    normalizedEyeDirection.x = smoothstep(0.0, 1.0, normalizedEyeDirection.x > 1.0 ? 2.0 - normalizedEyeDirection.x : normalizedEyeDirection.x);
    float carMask = step(normalizedEyeDirection.y, mix(0.6, 0.7, normalizedEyeDirection.x));
    color.rgb = mix(vec3(0.6, 0.6, 0.6), color.rgb, clamp(0.0, 1.0, carMask + hideCar));
    gl_FragColor = color;
}