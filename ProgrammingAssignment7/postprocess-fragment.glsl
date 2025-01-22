#version 300 es

precision highp float;

uniform sampler2D scene;
uniform sampler2D depth; 
uniform sampler2D normal;
uniform sampler2D position;
uniform sampler2D color;
uniform sampler2D diffuse;
uniform sampler2D specular;
uniform sampler2D emissive;

uniform highp uint time; //total time since level load
uniform highp uint frameTime; //time between current and previous frame; delta time

//uniform sampler2D cameraAngle;

in vec2 texCoords;
out vec4 fColor;

const int samples = 4;
const float minDepth = .1;
const float dist = 3.;
const float scale = 50.;
const vec4 fogColor = vec4(.5, .5, .25, 1.);
const float minViewDist = 20.;
const float maxViewDist = 50.;
const float minViewHeight = 1.;
const float maxViewHeight = 5.;

void main(void){
    fColor = mix(texture(scene,texCoords), mix(texture(scene,texCoords)*fogColor, fogColor, clamp(texture(depth, texCoords).z-maxViewDist, 0., 1.)), clamp(texture(depth, texCoords).z-minViewDist, 0., 1.));
}