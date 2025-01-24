#version 300 es
precision highp float;

const uint LIGHT_COUNT=16; //ensures unifrom count is less than WebGL min
const uint SHADOWED_LIGHT_COUNT = 16; //1 light for each shadow map. Might want to perform shadows in supplementary stage.
const uint MAT_PROP_COUNT=7;
const float ATTENUATION_DROPOFF=.01;

//enums- match in js code!
const lowp int DEBUG_DEPTH=-3
const lowp int DEBUG_TEXCOORD=-2
const lowp int NODRAW=-1
const lowp int UNLIT_SOLID=0
const lowp int NOTEX=1
const lowp int PARALLAX=2
const lowp int PBR=3
const lowp int UNLIT_PARALLAX=4
const lowp int UNLIT_PBR=5
const lowp int OTHER=255

const lowp uint NOCHANGE=0
const lowp uint CLAMP=1
const lowp uint CLAMPNEGATIVE=2
const lowp uint ABS=3

const lowp uint AMB = 1
const lowp uint DIR = 2
const lowp uint SPOT = 4
const lowp uint POINT = 3
const lowp uint NONE = 0

const lowp uint COLOR = 0
const lowp uint DIFFUSE = 1
const lowp uint SPECULAR = 2
const lowp uint AMBMULT = 3
const lowp uint EMISSIVE = 4
const lowp uint SHINIPARA = 5
const lowp uint TXCSCLDISP = 6

in vec2 texCoord;
in mat3 TBN;

in vec3 positionT;
in vec3 positionVT;
in vec3 cameraPosT;
in vec3 cameraPosW;
in vec3 normalT;
in vec3 normalW;

flat in int matFunc;
in vec4 matProp[MAT_PROP_COUNT];
//in vec4 positionS;

layout(location=0) out vec4 fScene; //final scene output with lights and colors (no postprocessing)
layout(location=1) out vec4 fDepth; //depth map
layout(location=2) out vec4 fNormal; //surface normals
layout(location=3) out vec4 fPosition; //fragment coordinates
layout(location=4) out vec4 fColor; //surface color * ambient multiply
layout(location=5) out vec4 fDiffuse; //surface diffuse multiply
layout(location=6) out vec4 fSpecular; //surface specular multiply
layout(location=7) out vec4 fEmissive; //surface emissive color
//attribute int matFunc; //default = 0, constant values; 1 = texture, constant values; -1 = unlit solid color

//STRUCT SIZE: 
//Currently: 10?
//Optimized: 6
struct light
{
	//lowp vec3 TypeNegHandlNegHandlAlt
	//vec3 AngleAttenShini
	lowp uint type;//0=empty (default),  1=ambient, 2=directional, 3=point, 4=spot
	vec3 locationW, directionW;//direction ignored if not spotlight; location ignored if ambient or directional
	float angle;//spotlight only
	float attenuation;//ignored on ambient
	//bool lightmask[10];
	vec4 color;
	vec4 diffuseMultiply;//ignored on ambient
	vec4 specularMultiply;//ignored on ambient
	float shininess;//ignored on ambient
	lowp uint negativeHandler; //0=no change (allow negatives), 1=clamp (min 0), 2=clamp negative (max 0), 3=absolute value
	lowp uint negativeHandlerAlt; //same as negative handler but applies to specular only
};

uniform light lights[LIGHT_COUNT];
uniform int maxLightIndex;

uniform sampler2D baseImage;
uniform sampler2D normalMap;
uniform sampler2D depthMap;
uniform sampler2D diffuseMap;//light multiplier
uniform sampler2D roughnessMap;//light multiplier
uniform sampler2D emissiveImage;//emissive

//uniform sampler2D miscTextures[11];

vec2 parallax(vec2 tx, vec3 viewDir, vec3 norm, float minl, float maxl, float hs)
{
	float nl = mix(maxl, minl, max(dot(norm, viewDir), 0.0));
	//float nl=maxl; //TEST

	float layerDepth=1./nl;
	float currentLayerDepth=0.;
	vec2 deltaTexCoord=viewDir.xy * hs / (viewDir.z * nl);
	vec2 currentTexCoords=tx;
	
	float currentDepthMapValue=1.-texture(depthMap,currentTexCoords).r;
	
	while(currentDepthMapValue > currentLayerDepth)
    {
		// shift texture coordinates along direction of P
		currentLayerDepth+=layerDepth;
		currentTexCoords-=deltaTexCoord;
		// get depthmap value at current texture coordinates
		currentDepthMapValue=1.-texture(depthMap,currentTexCoords).r;
		// get depth of next layer
		
	}
	
	vec2 prevTexCoord=currentTexCoords+deltaTexCoord;
	float next=currentDepthMapValue-currentLayerDepth;
	float prev=1.-texture(depthMap,prevTexCoord).r-currentLayerDepth+layerDepth;
	float weight=next/(next-prev);
	return mix(currentTexCoords,prevTexCoord,weight);
}

struct sMat{
	vec4 ambient;
	vec4 diffuse;
	vec4 specular;
};

sMat getStandardLight(vec4 mp5, vec3 norm, vec3 pos, vec3 viewPos, bool tangentSpace){
	sMat r;
	r.ambient=vec4(0.,0.,0.,1.);
	r.diffuse=vec4(0.,0.,0.,1.);
	r.specular=vec4(0.,0.,0.,1.);
	vec3 N=normalize(norm);
	
	for(int x=0;x<=maxLightIndex;x++){
		switch(lights[x].type){
			case AMB://ambient
			switch(lights[x].negativeHandler){
				case CLAMP:
				r.ambient=vec4(r.ambient.r+max(0.,lights[x].color.r),
				r.ambient.g+max(0.,lights[x].color.g),
				r.ambient.b+max(0.,lights[x].color.b),
				r.ambient.a*lights[x].color.a);
				break;
				case CLAMPNEGATIVE:
				r.ambient=vec4(r.ambient.r+min(0.,lights[x].color.r),
				r.ambient.g+min(0.,lights[x].color.g),
				r.ambient.b+min(0.,lights[x].color.b),
				r.ambient.a*lights[x].color.a);
				break;
				case ABS:
				r.ambient=vec4(r.ambient.r+abs(lights[x].color.r),
				r.ambient.g+abs(lights[x].color.g),
				r.ambient.b+abs(lights[x].color.b),
				r.ambient.a*lights[x].color.a);
				break;
				case NOCHANGE:default:
				r.ambient=vec4(r.ambient.rgb+lights[x].color.rgb,r.ambient.a*lights[x].color.a);
			}
			break;

			case DIR://directional
			float NdotL = 0.;
			vec3 ld = vec3(-1,-1,1)*normalize(lights[x].directionW);
			if(tangentSpace)
				NdotL=dot(TBN*(ld),N);
			else NdotL=dot((ld),N);
			vec4 c=NdotL*(lights[x].color);
			switch(lights[x].negativeHandler){
				case CLAMP:
				r.diffuse=vec4(r.diffuse.r+max(0.,c.r),
				r.diffuse.g+max(0.,c.g),
				r.diffuse.b+max(0.,c.b),
				mix(r.diffuse.a,r.diffuse.a*lights[x].color.a,max(0.,NdotL)));
				break;
				case CLAMPNEGATIVE:
				r.diffuse=vec4(r.diffuse.r+min(0.,c.r),
				r.diffuse.g+min(0.,c.g),
				r.diffuse.b+min(0.,c.b),
				mix(r.diffuse.a,r.diffuse.a*lights[x].color.a,min(0.,NdotL)));
				break;
				case ABS:
				r.diffuse=vec4(r.diffuse.r+abs(c.r),
				r.diffuse.g+abs(c.g),
				r.diffuse.b+abs(c.b),
				mix(r.diffuse.a,r.diffuse.a*lights[x].color.a,abs(NdotL)));
				break;
				case NOCHANGE:default:
				r.diffuse=vec4(r.diffuse.rgb+c.rgb,mix(r.diffuse.a,r.diffuse.a*lights[x].color.a,NdotL));
			}
			break;

			case SPOT://spot
			//TODO: implement? For now just use point light implementation
			case POINT://point
			
			vec3 v_surfaceToLight = vec3(0.,0.,0.);
			if(tangentSpace)
				v_surfaceToLight=(TBN*(lights[x].locationW))-pos; //potentially expensive operation and repetitive per vertex but I can't figure out how to calculate it in vertex
			else v_surfaceToLight=(lights[x].locationW)-pos;
			float a = 1./(1.+((1./lights[x].attenuation)*length(v_surfaceToLight)));
			if(a > ATTENUATION_DROPOFF){
				vec3 v_surfaceToView=viewPos-pos;
				vec3 surfaceToLightDirection=normalize(v_surfaceToLight);
				vec3 surfaceToViewDirection=normalize(v_surfaceToView);
				vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

				float diffuse=dot(N,surfaceToLightDirection);
				float specular=0.;

				if((diffuse>0.&&lights[x].negativeHandler==1)||(diffuse<0.&&lights[x].negativeHandler==2)||(lights[x].negativeHandler!=2&&lights[x].negativeHandler!=1)){
					
					switch(lights[x].negativeHandlerAlt){
						case CLAMP:
						specular=max(dot(N, halfVector),0.);
						break;
						case CLAMPNEGATIVE:
						specular=min(dot(N, halfVector),0.);
						break;
						case ABS:
						specular=abs(dot(N, halfVector));
						break;
						case NOCHANGE:default:
						specular=dot(N, halfVector);
					}
					specular=pow(specular,lights[x].shininess*mp5.r);
				}
				vec4 tmpDiff=a*(lights[x].color*lights[x].diffuseMultiply*diffuse);
				vec4 tmpSpec=a*(specular*lights[x].color*lights[x].specularMultiply);

				switch(lights[x].negativeHandler){
					case CLAMP:
					r.diffuse=vec4(max(0.,tmpDiff.r)+r.diffuse.r,
					max(0.,tmpDiff.g)+r.diffuse.g,
					max(0.,tmpDiff.b)+r.diffuse.b,
					mix(r.diffuse.a,lights[x].color.a*lights[x].diffuseMultiply.a*r.diffuse.a,max(0.,diffuse)));
					
					break;
					case CLAMPNEGATIVE:
					r.diffuse=vec4(min(0.,tmpDiff.r)+r.diffuse.r,
					min(0.,tmpDiff.g)+r.diffuse.g,
					min(0.,tmpDiff.b)+r.diffuse.b,
					mix(r.diffuse.a,lights[x].color.a*lights[x].diffuseMultiply.a*r.diffuse.a,min(0.,diffuse)));
					
					break;
					case ABS:
					r.diffuse=vec4(abs(tmpDiff.r)+r.diffuse.r,
					abs(tmpDiff.g)+r.diffuse.g,
					abs(tmpDiff.b)+r.diffuse.b,
					mix(r.diffuse.a,lights[x].color.a*lights[x].diffuseMultiply.a*r.diffuse.a,abs(diffuse)));
					
					case NOCHANGE:default:
					r.diffuse=vec4(tmpDiff.rgb+r.diffuse.rgb,mix(r.diffuse.a,lights[x].color.a*lights[x].diffuseMultiply.a*r.diffuse.a,diffuse));
					
				}

				switch(lights[x].negativeHandlerAlt){
					case CLAMP:
					r.specular=vec4(max(0.,tmpSpec.r)+r.specular.r,
					max(0.,tmpSpec.g)+r.specular.g,
					max(0.,tmpSpec.b)+r.specular.b,
					mix(r.specular.a,lights[x].color.a*lights[x].specularMultiply.a*r.specular.a,max(0.,specular)));
					break;
					case CLAMPNEGATIVE:
					r.specular=vec4(min(0.,tmpSpec.r)+r.specular.r,
					min(0.,tmpSpec.g)+r.specular.g,
					min(0.,tmpSpec.b)+r.specular.b,
					mix(r.specular.a,lights[x].color.a*lights[x].specularMultiply.a*r.specular.a,min(0.,specular)));
					break;
					case ABS:
					r.specular=vec4(abs(tmpSpec.r)+r.specular.r,
					abs(tmpSpec.g)+r.specular.g,
					abs(tmpSpec.b)+r.specular.b,
					mix(r.specular.a,lights[x].color.a*lights[x].specularMultiply.a*r.specular.a,abs(specular)));
					break;
					case NOCHANGE: default:
					r.specular=vec4(tmpSpec.rgb+r.specular.rgb,mix(r.specular.a,lights[x].color.a*lights[x].specularMultiply.a*r.specular.a,specular));

				}
			}

			default:
			break;
		}
	}
	return r;
}

vec4 standardMaterial(vec4 mp[MAT_PROP_COUNT], vec3 norm, vec3 pos, vec3 viewPos, bool tangentSpace){
	sMat mat = getStandardLight(mp[5], norm, pos, viewPos, tangentSpace);
	fNormal = vec4(norm, 1);
	vec4 amb = mat.ambient*mp[3];
	vec4 dif = mat.diffuse*mp[1];
	vec4 spe = mat.specular*mp[2];
	vec4 tmp=vec4(((amb*mp[0])+(dif*mp[0])+(spe)+mp[4]).rgb,
	mix(1., amb.a, length(amb))*mix(1., dif.a, length(dif))*mix(1., spe.a, length(spe))*mp[0].a);
	fSpecular = mp[2];
	fDiffuse = mp[1];
	fColor = mp[0]*mp[3];
	fEmissive = mp[4];
	fDepth = gl_FragCoord;
	return vec4(max(tmp.r,0.),max(tmp.g,0.),max(tmp.b,0.),clamp(tmp.a,0.,1.));
}

//no parallax
vec4 standardImage(vec4 mp[MAT_PROP_COUNT], vec3 pos, vec2 tx, vec3 viewPos, bool tangentSpace){
	vec3 norm = ((texture(normalMap, tx).rgb)*2.-1.)*vec3(-1,1,1);
	fNormal = vec4(norm, 1);
	sMat mat = getStandardLight(mp[5], norm, pos, viewPos, tangentSpace);
	vec4 txDiff = texture(diffuseMap, tx); //AO map
	//vec4 txDiff = vec4(1.,1.,1.,1.);
	vec4 txSpec = texture(roughnessMap, tx)*mp[2];
	//vec4 txSpec = vec4(vec3(1.,1.,1.)-txRough.rgb,txRough.a);
	//vec4 txSpec = vec4(1.,1.,1.,1.);
	vec4 txBase = texture(baseImage, tx)*mp[0];
	vec4 txEmissive = texture(emissiveImage, tx)*mp[4];
	vec4 amb = mat.ambient*mp[3]*txDiff;
	vec4 dif = mat.diffuse*mp[1];
	vec4 spe = mat.specular*txSpec;
	vec4 tmp=vec4(((amb*txBase)+(dif*txBase)+(spe)+txEmissive).rgb,
	mix(1., amb.a, length(amb))*mix(1., dif.a, length(dif))*mix(1., spe.a, length(spe))*txBase.a);
	fSpecular = txSpec;
	fDiffuse = mp[1];
	fColor = txBase*mp[3]*txDiff;
	fEmissive = txEmissive;
	return vec4(max(tmp.r,0.),max(tmp.g,0.),max(tmp.b,0.),clamp(tmp.a,0.,1.));
}

void main(void){
	fPosition = vec4(positionT, 1);
	vec2 txc = (texCoord*vec2(matProp[TXCSCLDISP][0], matProp[TXCSCLDISP][1]))+vec2(matProp[TXCSCLDISP][2], matProp[TXCSCLDISP][3]);
	float d = 1.-texture(depthMap, txc).r;
	//vec2 txc = texCoord;
	switch(matFunc){
		case DEBUG_DEPTH: //debug- draw depth
		fScene = fDepth;
		fColor = matProp[COLOR]*matProp[AMBMULT];
		fNormal = vec4(normalT, 1);
		fSpecular = matProp[SPECULAR];
		fDiffuse = matProp[DIFFUSE];
		fEmissive = matProp[EMISSIVE];
		fDepth = gl_FragCoord;
		break;
		case DEBUG_TEXCOORD: //debug- draw texcoord
		fScene = vec4(txc, 0., 1.);
		fNormal = vec4(normalT, 1);
		fColor = matProp[COLOR]*matProp[AMBMULT];
		fSpecular = matProp[SPECULAR];
		fDiffuse = matProp[DIFFUSE];
		fEmissive = matProp[EMISSIVE];
		fDepth = gl_FragCoord;
		break;
		case NODRAW: //nodraw. Doesn't even put anything into postprocess
		return;

		case NOTEX: //no texture
		fScene=standardMaterial(matProp, normalT, positionT, cameraPosT, true);
		fNormal = vec4(normalT, 1);
		fDepth = gl_FragCoord;
		break;

		case PARALLAX: //parallaxed texture
		txc = parallax(txc, -normalize((cameraPosT*vec3(1,1,1))-positionT)*vec3(1,1,-1), normalT, matProp[SHINIPARA][1], matProp[SHINIPARA][2], matProp[SHINIPARA][3]);
		fDepth = vec4(gl_FragCoord.rgb-(vec3(d, d, d)), gl_FragCoord.a*texture(depthMap, txc).a);
		//break;

		case PBR: //texture, no parallax
		fScene = standardImage(matProp, positionT, txc, cameraPosT, true);
		if(matFunc == 3){
			fDepth = gl_FragCoord;
		}
		break;

		case UNLIT_PARALLAX: //unlit texture, parallax
		txc = parallax(txc, -normalize((cameraPosT*vec3(1,1,1))-positionT)*vec3(1,1,-1), normalT, matProp[SHINIPARA][1], matProp[SHINIPARA][2], matProp[SHINIPARA][3]);
		fDepth = vec4(gl_FragCoord.rgb-(vec3(d, d, d)), gl_FragCoord.a*texture(depthMap, txc).a);

		case UNLIT_PBR: //unlit texture, no parallax
		fScene = texture(baseImage, txc) * matProp[COLOR];
		fColor = texture(baseImage, txc) * matProp[COLOR]*matProp[AMBMULT];
		fSpecular = matProp[SPECULAR];
		fDiffuse = matProp[DIFFUSE];
		fEmissive = matProp[EMISSIVE];
		if(matFunc == 5){
			fNormal = vec4(normalT, 1);
			fDepth = gl_FragCoord;
		}
		break;

		case UNLIT_SOLID: default: //solid color no lighting
		fScene=matProp[COLOR];
		fNormal = vec4(normalT, 1);
		fColor = matProp[COLOR]*matProp[AMBMULT];
		fSpecular = matProp[SPECULAR];
		fDiffuse = matProp[DIFFUSE];
		fEmissive = matProp[EMISSIVE];
		fDepth = gl_FragCoord;
		break;
	}
	
	
}