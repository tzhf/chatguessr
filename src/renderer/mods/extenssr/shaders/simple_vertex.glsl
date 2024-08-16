// Default post processing vertex shader
attribute vec2 coordinates;
varying highp vec2 vTexCoord;
void main(void) {
    gl_Position = vec4(coordinates, 0.0, 1.0);
    vTexCoord = (coordinates + 1.0) * 0.5;
}