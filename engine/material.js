"use strict";

import {vec2, vec4} from "./common/MVnew.js"
import { loadFileAJAX } from "./common/helpers-and-types.js";

export const MATERIAL_FUNCTIONALITY = {
	DEBUG_DEPTH: -3,
	DEBUG_TEXCOORD: -2,
	NODRAW: -1,
	UNLIT_SOLID: 0,
	NOTEX: 1,
	PARALLAX: 2,
	PBR: 3,
	UNLIT_PARALLAX: 4,
	UNLIT_PBR: 5,
	OTHER: 255 //OTHER must be integrated into material manually
}

export const MATERIAL_PARAM = {
	COLOR: 0,
	DIFFUSE: 1,
	SPECULAR: 2,
	AMBMULT: 3,
	EMISSIVE: 4,
	SHINIPARA: 5,
	TXCSCLDISP: 6

}

/**
 * Material points to functionality that defines its functionality in the shader, as well as any necessary arguments, such as specular, diffuse, etc.
 * Default: functionality 0, parameters=[baseColor=(.5,.5,.5,1), diffuse = (.5,.5,.5,1), specular = (.5,.5,.5,1), ambient = (.5,.5,.5,1), emissive = (0,0,0,1) (emissive alpha unused), misc = (shininess=1,parallax min=0 (default 8),parallax max=0 (default 32),parallax scale=0 (default .1)), texCoord=(uScale=1, vScale=1, uAdd=0, vAdd=0)]
 */

export class Material {
	//functionality which defines functionality within the shader, such as transparency effects or texture usage
	functionality = MATERIAL_FUNCTIONALITY.UNLIT_SOLID

	//Uniform parameters which are fed into the shader
	parameters = new Map()

	maxLightCount = 16 //NOTE: THIS VALUE MUST MATCH THE SIZE OF THE LIGHT ARRAYS IN THE SHADERS

	//material priority indicates which order relative to other materials it should be rendered.
	//Higher = renders earlier. Typically set transparent materials to a negative priority since
	//they're dependent on non-transparent materials rendering first.
	priority = 0

	//the wgl program that this material uses
	program = null

	//the shaderprogramstorage which this material's program is located in.
	programStorage

	//WIP light mask which would allow materials to block or allow certain lights with a matching lightmask
	lightMask

	//all js objects which use this material to render. Must implement the render(renderer) function!
	_renderObjects = []

	//parameters: map mapping MATERIAL_PARAM to its value for the material
	//if parameters is null, go with the default: 1 color, .5 diffuse, .5 specular, .5 ambient, 0 emissive, 1 shininess, parallax 8-32 height 1, txc scale 1,1 disp 0,0
	//if parameters is not null, any value not in parameters will be set to its default
	//if program is null, uses the default program from storage
	constructor(storage, functionality = MATERIAL_FUNCTIONALITY.NOTEX, parameters = null, lightMask = 0x1, program=null) {
		if(program != null)
			this.program = program
		else this.program = storage.defaultShaderProgram
		this.programStorage = storage
		this.functionality = functionality
		this.parameters.set(MATERIAL_PARAM.COLOR, vec4(1,1,1,1))
			this.parameters.set(MATERIAL_PARAM.DIFFUSE, vec4(.5,.5,.5,1))
			this.parameters.set(MATERIAL_PARAM.SPECULAR, vec4(.5,.5,.5,1))
			this.parameters.set(MATERIAL_PARAM.AMBMULT, vec4(.5,.5,.5,1))
			this.parameters.set(MATERIAL_PARAM.AMBMULT, vec4(0,0,0,1))
			this.parameters.set(MATERIAL_PARAM.AMBMULT, vec4(1,8,32,1))
			this.parameters.set(MATERIAL_PARAM.TXCSCLDISP, vec4(1,1,0,0))
		if(parameters != null)
			parameters.keys().forEach(element => {
				this.parameters.set(element, parameters.get(element))
			});

		this.lightMask = lightMask
	}

	gl(){
		return this.programStorage.gl
	}

	setParameter(paramIndex, paramValue){
		this.parameters.set(paramIndex, paramValue)
	}
}

//BasicMaterial provides simple defaults for the Material superclass.
export class BasicMaterial extends Material{
	constructor(storage, baseColor = vec4(1,1,1,1), diffuse=1,specular=1,ambient=1, emissiveColor = vec4(0,0,0,1), shininess=1,txCoordScl=vec2(1,1),txCoordDisp=vec2(0,0)){
		param = new Map()
		param.set(MATERIAL_PARAM.COLOR, baseColor)
		param.set(MATERIAL_PARAM.DIFFUSE, vec4(diffuse, diffuse, diffuse, 1))
		param.set(MATERIAL_PARAM.SPECULAR, vec4(specular, specular, specular, 1))
		param.set(MATERIAL_PARAM.AMBMULT, vec4(ambient, ambient, ambient, 1))
		param.set(MATERIAL_PARAM.EMISSIVE, emissiveColor)
		param.set(MATERIAL_PARAM.SHINIPARA, vec4(shininess, 0, 0, 0))
		param.set(MATERIAL_PARAM.TXCSCLDISP, vec4(txCoordScl[0], txCoordScl[1], txCoordDisp[0], txCoordDisp[1]))

		super(storage, MATERIAL_FUNCTIONALITY.NOTEX, param)
	}
}

//A material that does not render
export class NoDraw extends Material {
	constructor(storage) {
		super(storage, MATERIAL_FUNCTIONALITY.NODRAW)
	}
}

//A basic material that's one color, unlit
export class SolidColorNoLighting extends Material {
	constructor(storage, color) {
		param = new Map()
		empty = vec4(0, 0, 0, 1)
		param.set(MATERIAL_PARAM.COLOR, color)
		param.set(MATERIAL_PARAM.DIFFUSE, empty)
		param.set(MATERIAL_PARAM.SPECULAR, empty)
		param.set(MATERIAL_PARAM.EMISSIVE, empty)
		param.set(MATERIAL_PARAM.AMBMULT, empty)
		super(storage, MATERIAL_FUNCTIONALITY.UNLIT_SOLID, param)
	}
}

//A material featuring a texture as the base color, with optional parallax
export class ScaledTexMat extends Material {
	constructor(storage,
		parallax=false,
		uScale = 1,
		vScale = 1,
		uDisp=0,
		vDisp=0,
		minLayers=8,
		maxLayers=32,
		heightScale=.1,
		parameters = new Map()){
			parameters.set(MATERIAL_PARAM.TXCSCLDISP, vec4(uScale, vScale, uDisp, vDisp))
			let shipara = parameters.get(MATERIAL_PARAM.SHINIPARA)
			if(shipara != null)
				parameters.set(MATERIAL_PARAM.SHINIPARA, vec4(shipara[0], minLayers, maxLayers, heightScale))
			else parameters.set(MATERIAL_PARAM.SHINIPARA, vec4(1, minLayers, maxLayers, heightScale))

			super(storage, MATERIAL_FUNCTIONALITY.NOTEX, parameters)
			if(parallax) this.functionality = MATERIAL_FUNCTIONALITY.PARALLAX;
			else this.functionality = MATERIAL_FUNCTIONALITY.PBR;
	}
}

//A material like ScaledTexMat but unlit
export class ScaledTexMatNoLight extends ScaledTexMat {
	constructor(storage, parallax=false, uScale = 1, vScale = 1, uDisp=0, vDisp=0, minLayers=8, maxLayers=32, heightScale=.1, parameters = new Map()){
		super(storage, parallax, uScale, vScale, uDisp, vDisp, minLayers, maxLayers, heightScale, parameters)
		if(parallax) this.functionality = MATERIAL_FUNCTIONALITY.UNLIT_PARALLAX;
		else this.functionality = MATERIAL_FUNCTIONALITY.UNLIT_PBR;
	}
}