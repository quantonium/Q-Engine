#version 300 es

precision highp float;

const int LIGHT_COUNT=16;
const int MAT_PROP_COUNT=7;

//important: for VAOs to work the locations must be consistent between different shaders!
layout(location=0) in vec3 inPointsL;
layout(location=1) in vec3 inNormalL;
layout(location=2) in vec2 inTexCoord;
layout(location=3) in vec3 inTangentL;
//in vec3 inBiTangent;
//attribute vec3 inNormal;
layout(location=4) in int inMatFunc;
layout(location=5) in vec4 inMatProp0;//screw GLSL ES not supporting in attribute arrays
layout(location=6) in vec4 inMatProp1;
layout(location=7) in vec4 inMatProp2;
layout(location=8) in vec4 inMatProp3;
layout(location=9) in vec4 inMatProp4;
layout(location=10) in vec4 inMatProp5;
layout(location=11) in vec4 inMatProp6;

uniform vec3 inCameraScale;
uniform mat4 viewMatrix;
uniform mat4 projMatrix;
uniform mat4 normalMatrix;
uniform mat4 modelMatrix;
uniform mat4 MVPMatrix; //proj*view*model, loaded in CPU for optimization
uniform vec3 inCameraPosW;

//varying vec3 normal;
out vec2 texCoord;
//varying vec3 view;
//varying vec3 position;
out vec3 positionT;
out vec3 positionVT;
//out vec4 positionS;
out vec3 cameraPosT;
out vec3 cameraPosW;
out vec3 normalT;
out vec3 normalW;

out mat3 TBN;
flat out int matFunc;
out vec4 matProp[MAT_PROP_COUNT];


void main(void) {
	vec4 coordsW = modelMatrix * (vec4(inPointsL, 1.) * vec4(1,1,-1,1)) * vec4(1, 1, -1, 1);
	
	//gl_Position = projMatrix * viewMatrix * coordsW * (vec4(1.,1.,1.,1.) / vec4(inCameraScale, 1.));
	gl_Position = MVPMatrix * vec4(inPointsL, 1.) * (vec4(1.,1.,1.,1.) / vec4(inCameraScale, 1.));
	vec3 T = normalize((normalMatrix*vec4(inTangentL, 0.)).xyz*vec3(-1,1,-1));
	//vec3 T = normalize(inTangent);
	vec3 N = normalize((normalMatrix*(vec4(inNormalL, 0.) * vec4(1,1,-1,1))).xyz*vec3(1,1,-1));
	//vec3 N = normalize(inNormal);
	T=normalize(T - dot(T, N) * N);
	vec3 B = cross(N, T)*vec3(-1, -1,-1);

	TBN = transpose(mat3(T, B, N));

	//position = tsMatrix*(uModelViewMatrix*aPosition).xyz;
	//view = tsMatrix*vec3(0.0, 0.0, 0.0);
	//normal = tsMatrix*N;
	positionT = TBN*(coordsW.xyz);
	positionVT = TBN * (viewMatrix * coordsW).xyz;
	//positionS = gl_Position;
	cameraPosT = TBN*inCameraPosW;
	cameraPosW=inCameraPosW;
	normalT = TBN*N;
	normalW = N;

	

	matProp[0] = inMatProp0;
	matProp[1] = inMatProp1;
	matProp[2] = inMatProp2;
	matProp[3] = inMatProp3;
	matProp[4] = inMatProp4;
	matProp[5] = inMatProp5;
	matProp[6] = inMatProp6;

	matFunc = inMatFunc;

	texCoord = inTexCoord;

	
}