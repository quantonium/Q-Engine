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

//uniform sampler2D cameraAngle;

in vec2 texCoords;
out vec4 fColor;

void main(void){
    vec4 t = texture(scene, texCoords);
    //fColor = vec4(t.rgb, 1);
    fColor = t;
}