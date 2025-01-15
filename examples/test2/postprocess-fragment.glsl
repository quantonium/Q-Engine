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
const float minViewDist = 5.;
const float maxViewDist = 10.;
const float minViewHeight = 1.;
const float maxViewHeight = 5.;

void main(void){
    vec4 results;
    fColor = texture(scene, abs(texCoords+vec2(0,cos((float(time)/100.)+(texCoords.x*10.))*.01)*vec2(1.,.9)));
    //fColor = texture(scene, mix(round(texCoords*vec2(scale, scale))/vec2(scale,scale),texCoords, length(texture(depth, round(texCoords*vec2(scale, scale))/vec2(scale,scale)))));
    //fColor = mix(texture(scene, texCoords), fogColor, 1.-clamp(((texture(depth, texCoords).r-minViewDist)/(maxViewDist-minViewDist))*clamp((texture(position, texCoords).y-minViewHeight)/(maxViewHeight-minViewHeight),0.,1.),0.,1.));
    //fColor = texture(depth, texCoords);
    //fColor = mix(fogColor, texture(scene, texCoords), clamp(((texture(position, texCoords).y-5.)),0.,1.));
    //fColor=(texture(position,texCoords)-vec4(1.,1.,0.,0.))/vec4(20.,1.,20.,1.);
    //fColor = texture(position, texCoords);
    /*//fColor = vec4(t.rgb, 1);
    if(d.b > minDepth)
        fColor = t;
    else{
        //fColor = vec4(1,0,0,1);
        fColor = mix(t, texture(scene, round(texCoords/vec2(5, 5))*vec2(5,5)), (minDepth-d.b)/minDepth);
        /*for(int x = 1; x < samples; x++){
            for(int y = 0; y < samples; y++){
                vec2 tx = texCoords+vec2(cos((float(y)/float(samples))*2.*3.14)*dist*(float(x)/float(samples)), sin((float(y)/float(samples))*2.*3.14)*dist*(float(x)/float(samples)));
                results = results + texture(scene, tx);
            }
        }
        fColor = results / (float(samples)*float(samples));
        //fColor = mix(t, results / (float(samples)*float(samples)), (d.b-minDepth)/scale);
    }*/
}