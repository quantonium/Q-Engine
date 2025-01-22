#version 300 es
precision highp float;

const int LIGHT_COUNT=64;

uniform highp uint time; //total time since level load
uniform highp uint frameTime; //time between current and previous frame; delta time

struct light
{
	lowp int type;//0=empty (default),  1=ambient, 2=directional, 3=point, 4=spot
	vec3 locationW, directionW;//direction ignored if not spotlight; location ignored if ambient or directional
	float angle;//spotlight only
	float attenuation;//ignored on ambient
	//bool lightmask[10];
	vec4 color;
	vec4 diffuseMultiply;//ignored on ambient
	vec4 specularMultiply;//ignored on ambient
	float shininess;//ignored on ambient
	lowp int negativeHandler; //0=no change (allow negatives), 1=clamp (min 0), 2=clamp negative (max 0), 3=absolute value
	lowp int negativeHandlerAlt; //same as negative handler but applies to specular only
};

uniform light lights[LIGHT_COUNT];
uniform int maxLightIndex;