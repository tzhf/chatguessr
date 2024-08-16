// Default post processing fragment shader.
precision mediump float;
varying vec2 vTexCoord;
uniform sampler2D texture;
void main() {
    gl_FragColor = texture2D(texture, vTexCoord);
}