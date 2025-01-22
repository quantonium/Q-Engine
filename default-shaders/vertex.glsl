#version 300 es

precision highp float;

const int LIGHT_COUNT=64;
const int MAT_PROP_COUNT=7;

in vec3 inPointsL;
in vec3 inNormalL;
in vec2 inTexCoord;
in vec3 inTangentL;
//in vec3 inBiTangent;
//attribute vec3 inNormal;
in int inMatIndex;
in vec4 inMatProp0;//screw GLSL ES not supporting in attribute arrays
in vec4 inMatProp1;
in vec4 inMatProp2;
in vec4 inMatProp3;
in vec4 inMatProp4;
in vec4 inMatProp5;
in vec4 inMatProp6;

uniform vec3 inCameraScale;
uniform mat4 viewMatrix;
uniform mat4 projMatrix;
uniform mat4 normalMatrix;
uniform mat4 modelMatrix;
uniform vec3 inCameraPosW;

uniform highp uint time; //total time since level load
uniform highp uint frameTime; //time between current and previous frame; delta time

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
out vec3 positionW;
out vec4 positionL; //includes depth + non-projected camera scaled XY adjusted to viewMatrix

out mat3 TBN;
flat out int matIndex;
out vec4 matProp[MAT_PROP_COUNT];


void main(void) {
    vec4 coordsW = modelMatrix * (vec4(inPointsL, 1.) * vec4(1,1,-1,1)) * vec4(1, 1, -1, 1);
    gl_Position = projMatrix * viewMatrix * coordsW * (vec4(1.,1.,1.,1.) / vec4(inCameraScale, 1.));
    vec3 T = normalize((normalMatrix*vec4(inTangentL, 0.)).xyz*vec3(-1,1,-1)); //tangent
    //vec3 T = normalize(inTangent);
    vec3 N = normalize((normalMatrix*(vec4(inNormalL, 0.) * vec4(1,1,-1,1))).xyz*vec3(1,1,-1)); //normal
    //vec3 N = normalize(inNormal);
    T=normalize(T - dot(T, N) * N); //bitangent
    vec3 B = cross(N, T)*vec3(-1, -1,-1);

    TBN = transpose(mat3(T, B, N));

    //position = tsMatrix*(uModelViewMatrix*aPosition).xyz;
    //view = tsMatrix*vec3(0.0, 0.0, 0.0);
    //normal = tsMatrix*N;
    positionW = coordsW.xyz;
    vec4 tmp = (viewMatrix * coordsW * (vec4(1.,1.,1.,1.) / vec4(inCameraScale, 1.)));
    positionL = vec4(tmp.r, tmp.g, length(inCameraPosW.xyz-coordsW.xyz), tmp.a);

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

    matIndex = inMatIndex;

    texCoord = inTexCoord;

    
}