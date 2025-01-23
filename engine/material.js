"use strict";

import {vec2, vec4} from "./common/MVnew.js"

/**
 * Material points to index that defines its functionality in the shader, as well as any necessary arguments, such as specular, diffuse, etc.
 * Default: index 0, parameters=[baseColor=(.5,.5,.5,1), diffuse = (.5,.5,.5,1), specular = (.5,.5,.5,1), ambient = (.5,.5,.5,1), emissive = (0,0,0,1) (emissive alpha unused), misc = (shininess=1,parallax min=0 (default 8),parallax max=0 (default 32),parallax scale=0 (default .1)), texCoord=(uScale=1, vScale=1, uAdd=0, vAdd=0)]
 */

export class Material {
    //index which defines functionality within the shader, such as transparency effects or texture usage
    index

    //Uniform parameters which are fed into the shader
    parameters

    //private vars used if the material is ticked
    _prevIndex
    _prevParameters
    _updated

    //WIP light mask which would allow materials to block or allow certain lights with a matching lightmask
    lightMask

    //Custom defined ShaderProgram to load when using this material. If null, works with the buffer's default program.
    shaderProgram = null
    constructor(index = 1, parameters = [vec4(.5, .5, .5, 1), vec4(.5, .5, .5, 1), vec4(.5, .5, .5, 1), vec4(.5, .5, .5, 1), vec4(0,0,0,1), vec4(1, 8, 32, .1), vec4(1, 1, 0, 0)], lightMask = 0x1) {
        this.index = index
        this.parameters = parameters
        this.lightMask = lightMask
    }
}

//BasicMaterial provides simple defaults for the Material superclass.
export class BasicMaterial extends Material{
    constructor(baseColor = vec4(1,1,1,1), diffuse=1,specular=1,ambient=1, emissiveColor = vec4(0,0,0,1), shininess=1,txCoordScl=vec2(1,1),txCoordDisp=vec2(0,0)){
        super(1, [baseColor, 
            vec4(diffuse, diffuse, diffuse, 1), 
            vec4(specular, specular, specular, 1), 
            vec4(ambient, ambient, ambient, 1), 
            emissiveColor,
            vec4(shininess, 0, 0, 0), 
            vec4(txCoordScl[0], txCoordScl[1], txCoordDisp[0], txCoordDisp[1])])
    }
}

//A material that does not render
export class NoDraw extends Material {
    constructor() {
        super(-1)
    }
}

//A basic material that's one color, unlit
export class SolidColorNoLighting extends Material {
    constructor(color) {
        super(0, [vec4(color[0], color[1], color[2], color[3]),
        vec4(0, 0, 0, 1),
        vec4(0, 0, 0, 1),
        vec4(0, 0, 0, 1),
        vec4(0, 0, 0, 1),
        vec4(1, 8, 32, .1),
        vec4(1, 1, 0, 0)])
    }
}

//A material featuring a texture as the base color, with optional parallax
export class ScaledTexMat extends Material {
    constructor(parallax=false, uScale = 1, vScale = 1, uDisp=0, vDisp=0, minLayers=8, maxLayers=32, heightScale=.1, parameters = [vec4(1, 1, 1, 1), vec4(.5, .5, .5, 1), vec4(1, 1, 1, 1), vec4(1, 1, 1, 1), vec4(0,0,0,1), vec4(1, 8, 32, .1), vec4(1, 1, 0, 0)]){
        super(1, [parameters[0], parameters[1], parameters[2], parameters[3], parameters[4], vec4(parameters[5][0], minLayers, maxLayers, heightScale), vec4(uScale, vScale, uDisp, vDisp)])
        if(parallax) this.index = 2;
        else this.index = 3;
    }
}

//A material like ScaledTexMat but unlit
export class ScaledTexMatNoLight extends ScaledTexMat {
    constructor(parallax=false, uScale = 1, vScale = 1, uDisp=0, vDisp=0, minLayers=8, maxLayers=32, heightScale=.1, parameters = [vec4(1, 1, 1, 1), vec4(.5, .5, .5, 1), vec4(1, 1, 1, 1), vec4(1, 1, 1, 1), vec4(0,0,0,1), vec4(1, 8, 32, .1), vec4(1, 1, 0, 0)]){
        super(parallax, uScale, vScale, uDisp, vDisp, minLayers, maxLayers, heightScale, parameters)
        if(parallax) this.index = 4;
        else this.index = 5;
    }
}