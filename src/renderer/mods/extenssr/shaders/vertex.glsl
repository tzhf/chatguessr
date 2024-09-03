// Default vertex shader + no car script.
varying vec3 a;
varying vec3 eyeDirection;
uniform vec4 b;
attribute vec3 c;
attribute vec2 d;
uniform mat4 e;
void main() {
    vec4 g = vec4(c, 1);
    gl_Position = e * g;
    eyeDirection = vec3(d.x, d.y, 1.0) * length(c);
    a = vec3(d.xy * b.xy + b.zw, 1);
    a *= length(c);
}