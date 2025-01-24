"use strict";

import {Primitive} from "./primitive.js"
import { vec3, vec4 } from "../common/MVnew.js";
import { Quaternion } from "../common/helpers-and-types.js";

//values for handleNegative
export const LIGHT_NEGATIVE_HANDLER = {
	NOCHANGE : 0,
	CLAMP : 1,
	CLAMPNEGATIVE : 2,
	ABS : 3
}

export const LIGHT_TYPE = {
	AMB: 1,
	DIR: 2,
	SPOT: 4,
	POINT: 3,
	NONE: 0
}

export class AmbientLight extends Primitive{
	static _lights = [];

	//light's emission color
	color;

	//lightmask to filter out certain materials
	lightmask = 0x1;

	_id;

	//type of light defines if it's a point, directional, or spot light
	_type = LIGHT_TYPE.AMB

	//how to handle negative values generated by this light source. Valid responses are "noChange", "clamp" (min light 0), "clampNegative" (max light 0), "abs". If other or null, default to "noChange"
	handleNegative

	//if true, the light emits
	enabled = true
	
	/**
	 * 
	 * @param {*} b brightness/color of light
	 * @param {*} m bitwise mask indicating how many channels the light casts onto (up to 256)
	 * @param {*} n how to handle negative values generated by this light source. Valid responses are "noChange", "clamp" (min light 0), "clampNegative" (max light 0), "abs". If other or null, default to "noChange"
	 */
	constructor(c, m, n=LIGHT_NEGATIVE_HANDLER.CLAMP, e = true){
		super({pos: vec3(0,0,0), rot: Quaternion(0,1,0,0), scl: vec3(1,1,1)})
		this.handleNegative = n
		this.color = c
		this.lightmask = m
		var i = 0;
		for(i = 0; AmbientLight._lights[i] != null; i++){}
		AmbientLight._lights[i] = this
		this._id = i
		this.enabled = e
		
		
	}

	destroyLight(){
		AmbientLight._lights[this._id] = null;
		delete this;
	}

	static getLights(){
		return AmbientLight._lights
	}
}

/**
 * dummy class for convienence
 */
export class Light extends AmbientLight{
	constructor(c, m, n=LIGHT_NEGATIVE_HANDLER.NOCHANGE, e = true){
		super(c, m, n, e)
	}
}

export class DirectionalLight extends AmbientLight{

	_shadowMap;
	/**
	 * 
	 * @param {*} t transform of light (directional only accounts rotation)
	 * @param {*} c color of light
	 * @param {*} m bitwise mask indicating how many channels the light casts onto (up to 256)
	 */
	constructor(t, c, m, n=LIGHT_NEGATIVE_HANDLER.CLAMP, e = true){
		super(c, m, n, e)
		this.transform = t
		this.color = c
		this.lightmask = m
		this._type = LIGHT_TYPE.DIR
	}


}

export class PointLight extends AmbientLight{
	attenuation;
	diffuseMultiply = vec4(1,1,1,1)
	specularMultiply = vec4(1,1,1,1)
	shininess = 1
	handleNegativeAlt;
	/**
	 * 
	 * @param {*} t transform of light (scale not accounted)
	 * @param {*} b brightness/color of light
	 * @param {*} m bitwise mask indicating how many channels the light casts onto (up to 256)
	 * @param {*} a linear attenuation of light
	 */
	constructor(t, c, m, a, s = 1, n=LIGHT_NEGATIVE_HANDLER.CLAMP, na=LIGHT_NEGATIVE_HANDLER.CLAMP, e = true){
		super(c, m, n, e)
		this.transform = t
		this.attenuation = a
		this._type = LIGHT_TYPE.POINT
		this.shininess = s
		this.handleNegativeAlt = na
	}
}

export class SpotLight extends PointLight{
	angle;
	/**
	 * 
	 * @param {*} t transform of light (scale not accounted)
	 * @param {*} b brightness/color of light
	 * @param {*} m bitwise mask indicating how many channels the light casts onto (up to 256)
	 * @param {*} a linear attenuation of light. If zero, has infinite attenuation
	 * @param {*} h angle of spread of the spotlight
	 */
	constructor(t, c, m, a, s = 1, h = 90, n=LIGHT_NEGATIVE_HANDLER.CLAMP, na=LIGHT_NEGATIVE_HANDLER.CLAMP, e = true){
		super(t, c, m, a, s, n, na, e)
		this.angle = h
		this._type = LIGHT_TYPE.SPOT
	}
}

export function getLights() {
	return AmbientLight._lights;
}