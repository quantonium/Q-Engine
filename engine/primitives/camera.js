"use strict"

import {Primitive} from "./primitive.js"
import {SolidColorNoLighting} from "../material.js"
import { ortho, perspective, vec3, vec2, lookAt} from "../common/MVnew.js";
import { eulerToQuat, forward, up} from "../common/helpers-and-types.js";

/**
 * representation of a view, targeting an (optional) buffer
 */
export class Camera extends Primitive {
	static _cameras = [];

	//Debug point info to feed into opengl for manual rendering
	debugPoints = []
	debugColors = []
	debugTypes = []
	debugOffsets = []

	//If true, camera renders in wireframe instead of shaded
	wireframe = false

	//If true, all lights are disabled
	noLighting = false

	//If true, shows the Bounds of all objects
	showBounds = false

	//If true, camera will render engine-only geometry such as the axes
	renderEngine = false
	noTexture = false
	noParallax = false
	render = true
	enabled = true
	_bufs = []
	fov = 90

	//if true, camera is in orthographic mode
	ortho = false
	range = [.1, 200000]
	currentProjMat = null

	clearDebug() {
		this.debugPoints = []
		this.debugColors = []
		this.debugTypes = []
		this.debugOffsets = []
	}

	getProjMat() {
		return this.ortho ? ortho(-this._fov / 2, this._fov / 2, -(this._fov / 2) * this._aspect, (this._fov / 2) * this._aspect, this._range[0], this._range[1]) : perspective(this._fov, this._aspect, this._range[0], this._range[1])
	}

	getViewMat() {
		//var rotMat = null
		//var t = this._getModelMat(true)
		/*//bufferedConsoleLog(t)
		var rotQuat = Quaternion(t.rot.w, t.rot.x, t.rot.y, -t.rot.z)
		rotMat = quatToMat4(rotQuat);
		//(eulerToQuat(vec3(this._transform.rot[0]+90, -(this._transform.rot[1]-90), this._transform.rot[2])));
		rotMat = mult(rotMat, scale(1 / t.scl[0], 1 / t.scl[1], 1 / t.scl[2]))
		rotMat = mult(rotMat, translate(-t.pos[0], -t.pos[1], -t.pos[2]))
		

		return rotMat*/
		var tmp = this.getWorldTransform()
		return lookAt(tmp.pos, add(tmp.pos,forward(tmp.rot)), up(tmp.rot), true)
	}

	/**
	 * Determines whether or not the points are within the view of the _Camera, to determine whether or not to acutally include 
	 * @param {*} points 
	 */
	_inView(points) {
		//TODO
	}

	/**
	 * Pushes all points in every Object in scene to its buffer(s)
	 * @param wireframe if true, display all geometry as gl.LINE_LOOP
	 * @param showBounds if true, show Bounds of all geometry
	 * @param renderAfter true if Camera should be immediately rendered to its view after pushing data to buffer
	 */
	_pushToBuffers() {
		if (this.enabled) {
			this._bufs.forEach((f) => {
				f._clearBuffers();
				var p = this.getWorldTransform(true);
				f._setViewMatrix(this.getViewMat(), p.pos, p.scl)
				f._setProjMatrix(this._currentProjMat);
				//add objects for camera to render

				_objects.forEach((o) => {
					if (((o.bufferMask & o.cameraMask & f.bufferMask & this.cameraMask) != 0) && ((this.renderEngine && o.isEngine) || !o._isEngine)) {
						if (o.visible) {
							o._setGraphicsData(f, this);
							if(this._render) f._renderData();
						}
					}
				});
				var x = 0
				for (var o = 0; o < this.debugOffsets.length; o++) {
					f._types.push(this.debugTypes[o])
					f._offsets.push(this.debugOffsets[o])
					for (var i = 0; i < this.debugOffsets[o]; i++) {
						if (i.length + f._points.length > f._bufLimit)
							f._renderData();
						f._points.push(this.debugPoints[i + x])
						var tmp = new SolidColorNoLighting(this.debugColors[i % this.debugColors.length]);
						f._loadMaterial(tmp, false, this.wireframe || this.noLighting, this.noParallax)
						f._normals.push(vec3(1, 0, 0))//debug data has no normals, this is just filler
						f._tangents.push(vec3(0, 1, 0))
						//f._bitangents.push(vec3(0, 0, 1))
						f._texCoords.push(vec2(0, 0)) //_Bounds have no textures, again just filler
					}
					x += this.debugOffsets[o]
				}
				//render any remaining data
				if (this.render)
					f._renderData()
				})
			
		}


		//get uniform matrix

		//var rotMat = mult(mult(rotateZ(this._transform.rot[2]), rotateY(-(this._transform.rot[1] - 90))), rotateX(-this._transform.rot[0]))//this may look wrong, and it most definately is, but it works
	}

	//Modifies the camera view via a variety of parameters
	updateCameraView(fov = this._fov, orthographic = this._ortho, range = this._range) {

		var changed = false;
		if(this._fov != fov){
			this._fov = fov;
			changed = true;
		}
		if(this._ortho != orthographic){
			this._ortho = orthographic;
			changed = true
		}
		
		if(this._range != range){
			this._range = range;
			changed = true
		}


		if(changed || this._currentProjMat == null)
			this._currentProjMat = this.getProjMat()
		
	}

	/**
	 * 
	 * @param {vec3} pos 
	 * @param {vec3} rot 
	 * @param {vec3} scl 
	 * @param {*} fov 
	 * @param {*} ortho 
	 * @param {*} targetBuffers
	 */
	constructor(targetBuffers, pos = vec3(0, 0, 0), rot = eulerToQuat(vec3(1, 0, 0), 0), scl = vec3(1, 1, 1), fov = 90, orthographic = false, range = [.1, 200000], enabled = true, renderEngine = false) {
		//if(rot.length != 4) throw "Rotations must be quaternions!"
		super({ pos: pos, rot: rot, scl: scl })
		this._flipZRotation = true
		if(targetBuffers instanceof Array) this._bufs = targetBuffers
		else this._bufs = [targetBuffers]
		this._enabled = enabled
		this._renderEngine = renderEngine
		this.updateCameraView(fov, orthographic, range)
		Camera._cameras.push(this);
	}

	getCameras() {
		return Camera._cameras
	}
}

export function getCameras(){
	return Camera._cameras;
}