#version 300 es

precision highp float;

layout(location=0) in vec2 inPointsL;
out vec2 texCoords;

void main(void){
    gl_Position = vec4(inPointsL, -1, 1);
    texCoords = (inPointsL/vec2(2,2))+vec2(.5,.5);
}