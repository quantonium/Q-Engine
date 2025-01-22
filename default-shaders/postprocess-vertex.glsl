#version 300 es

precision highp float;

in vec2 inPointsL;
out vec2 texCoords;

uniform highp uint time; //total time since level load
uniform highp uint frameTime; //time between current and previous frame; delta time

void main(void){
    gl_Position = vec4(inPointsL, -1, 1);
    texCoords = (inPointsL/vec2(2,2))+vec2(.5,.5);
}