"use strict";

import {Primitive} from "./primitive.js"
import { SolidColorNoLighting } from "../material.js";
import { newID} from "../common/helpers-and-types.js";
import { add, equal, vec2, vec3 } from "../common/MVnew.js";
import { Bounds } from "../bounds.js";

//DrawInfo contains a VAO which stores the necessary point and material info for a given set of traingles.
//Each DrawInfo class maps a set of triangles to a material and a set of textures. Point positions are
//mapped by index to _owner._points, and other point data is mapped per point.
export class DrawInfo {
	_vao
	_gl
	_buffers = Map()

	useVAO = true //set to false if you'd rather update the buffers constantly- every time the object
	//is drawn it will load data into the buffers.
	//Otherwise, a VAO will be bound to draw and buffers should be updated only on occasion.

	//index of material to use from _owner
	materialIndex = 0

	//_owner: must be the Object which this DrawInfo is stored under
	_owner = null

	//type: wgl draw type for this object, default GL_TRIANGLES
	type = null

	//arrays below are per point
	pointIndexes = []
	tangents = []
	normals = []
	texCoords = []

	//map the material property index to a list of properties per triangle
	//if null, use the material default
	matProperties = []

	getOwner() {
		return _owner
	}

	constructor(gl) {
		this._gl = gl
		this._vao = gl.createVertexArray()
		this.type = gl.TRIANGLES
	}

	//sets the owner, materialIndex, and sets up matProperties to the num of parameters in the material
	//Use this function to change the materialIndex or the owner. Parameters are removed or added but not otherwise altered.
	setup(owner, materialIndex){
		this.materialIndex = materialIndex
		this._owner = owner
		if(owner.materials[materialIndex].parameters.length() < this.matProperties.length() )
			this.matProperties.slice(owner.materials[materialIdex].parameters.length())
		else {
			for(i = this.matProperties.length(); i < owner.materials[materialIndex].parameters.length(); i++){
				this.matProperties.push(null)
			}
		}
	}

	/** Updates this DrawInfo, binding the VAO and updating a point at an index
	* @param index the point which to update
	* @param newIndex if not negative, sets the point which this index references to the newIndex
	* @param positionUpdated if true, the point's position (at index) was updated
	* @param newTangent if not null, updates the tangent at this point to this value
	* @param newTexCoord if not null, updates the tex coord at this point to the new value
	* @param newMatProp map mapping property indexes to its updated value
	**/
	update(index, newIndex=-1, positionUpdated = false, newNormal=null, newTangent=null, newTexCoord=null, newMatProp=new Map()){
		index = index % this.pointIndexes.length()
		let updated = positionUpdated
		if(newIndex >= 0){
			updated = true
			this.pointIndexes[index] = newIndex
		}
		if(newNormal != null){
			updated=true
			this.normals[index] = newNormal
		}
		if(newTangent != null){
			updated=true
			this.tangents[index] = newTangent
		}

		if(newTexCoord != null){
			updated = true
			this.texCoords[index] = newTexCoord
		}

		newMatProp.keys().forEach(element => {
			updated = true
			this.matProperties[index][element] = newMatProp.get(element)
		});

		if(updated){
			this._reloadBuffers()
		}

	}

	//reloads data into the buffers for this DrawInfo
	_reloadBuffers() {

	}

	//Load this DrawInfo into the specified renderer, enabling the VAO and loading textures
	load(renderer){

	}

	//adds the pointIndex into this DrawInfo at the specified index
	addPoint(index, pointIndex){
		index = index % this.pointIndexes.length
		this.pointIndexes.splice(index, 0, pointIndex)
		this._owner._addPointFromDrawInfo(this, pointIndex)
		return pointIndex
	}

	//updates the point at index to the new pointIndex
	updatePoint(index, pointIndex){
		index = index % this.pointIndexes.length
		this._owner._removePointFromDrawInfo(this, this.pointIndexes[index])
		let oldPoint = this.pointIndexes[index]
		this.pointIndexes[index] = pointIndex
		this._owner._addPointFromDrawInfo(this, pointIndex)
		return oldPoint
	}

	//removes the point at the index
	//returns the pointIndex of the removed item
	removePointAtIndex(index){
		index = index % this.pointIndexes.length
		this._owner._removePointFromDrawInfo(this, this.pointIndexes[index])
		return this.pointIndexes.splice(index, 1)
	}

	//removes the point by value
	//returns pointIndex
	removePoint(pointIndex){
		for(i=this.pointIndexes.length()-1; i >= 0; i--){
			if(this.pointIndexes[i] == pointIndex){
				this.pointIndexes.splice(i, 1)
			}
		}
		this._owner._removePointFromDrawInfo(this, this.pointIndexes[index])
		return pointIndex
	}
}

/**
 * 3D _Primitive containing material data, coordinate data, and Bounds
 * Note: For attached primitives to Object, if you want to attach a Primitive to a point, you must set the Primitive's transform to the point location manually.
 */
export class Object extends Primitive {
	static _objects = new Map();

	//drawInfo contains info about what material should be applied to which set of points in an object.
	drawInfo = []

	//the positions of all the points
	points = []

	//map index of point in points to set of drawInfo which uses this point
	_drawInfoPointRefs = new Map()

	//If true, this object is engine only, meaning it cannot interact with non-engine objects,
	//and can only be rendered if a camera is set to render engine only objects
	isEngine = false

	//Contains Materials required to render this object
	materials = []

	//Contains ComplexTextures necessary for materials in this object
	textures = []

	//Set to false to hide the object
	_visible = []
	_id = -1

	//bounds for this object
	bounds;

	//debug?
	_drawPoints = new Float32Array()
	_drawNormals = new Float32Array()
	_drawTangents = new Float32Array()
	
	getID(){
		return this._id;
	}

	/**To be called whenever individual points are adjusted */
	reevaluateBounds(points, boundsType) {
		this.bounds = new Bounds(points, boundsType);
	}

	/**To be called whenever individual points are adjusted. Updates float32arrays  */
	/**
	 * 
	 * @param {transform} startTransform
	 * @param {drawInfo} drawInfo array of DrawInfo objects
	 * @param {enum} drawType 
	 */
	constructor(startTransform, drawInfo, points, materials, boundsType, textures = [], isEngine = false, visible = true) {
		//if(startTransform.rot.length != 4) throw "Rotations must be quaternions!"
		super(startTransform)
		this._id = newID();
		this.drawInfo = drawInfo;
		this._points = points;
		this.reevaluateBounds(points, boundsType)
		this.isEngine = isEngine
		this.materials = materials
		this.textures = textures
		this.visible = visible
		Object._objects.set(this._id, this)
	}

	//retrieves the relative location of a point at index
	getPoint(index) {
		return this._points[index]
	}

	//updates the relative location of a point at index
	updatePoint(index, newVal) {
		let oldval = this._points[index]
		if(!equal(oldval, newVal)){
			this._points[index] = newVal
			this._drawInfoPointRefs.get(index).forEach((element) => {
				element._reloadBuffers()
			})
		}
	}

	//adds a set of points to the list of points for this object, and returns an array of the indexes of the new points
	//points will fill the space of previously removed points
	addPoints(newPoints = []){
		let ret = []
		let addInd = 0
		let addAtEnd = false
		let ind = 0
		for(i = 0; i < newPoints.length(); i++){
			if(!addAtEnd){
				while(addInd < this._points.length() && this._points[addInd] != null) addInd++
				if(addInd < this._points.length()){
					ind = addInd
					this._points[ind] = newPoints[i]
				}
				else {
					addAtEnd = true
				}
			}
			if(addAtEnd){
				ind = this._points.length()
				this._points.push(newPoints[i])
			}
			ret.push(ind)
			this._drawInfoPointRefs.set(ind, new Set())
		}
		return ret
	}

	//called from DrawInfo when a point is added
	_addPointFromDrawInfo(drawInfo, index){
		this._drawInfoPointRefs.get(index).add(drawInfo)
	}

	//called from DrawInfo when a point is removed
	//does not remove the point from the object entirely
	_removePointFromDrawInfo(drawInfo, index){

		let s = this._drawInfoPointRefs.get(index)
		if(s.has(drawInfo)) {
			s.delete(drawInfo)
		}
	}

	//removes points by index, removing any corresponding refs to this point in any DrawInfo.
	//Todo: handle removing a point from a TRIANGLE vs a LINE or what not differently
	removePoint(index){
		let drawInfosToRemoveFrom = this._drawInfoPointRefs.get(index)

		drawInfosToRemoveFrom.forEach ((element) => {
			element.removePoint(index)
		})

		this._drawInfoPointRefs.delete(index)
		this._points
	}

	//given a set of indexes for points, creates a new DrawInfo for this object, returning the drawinfo object
	//note: add any new points before you add a DrawInfo
	addDrawInfo(gl, pointIndexes = [], materialIndex = 0, normals = [], tangents = [], texCoords = [], matProps = new Map(), useVAO = true) {
		let newInfo = new DrawInfo(gl)
		newInfo._owner = this
		newInfo.pointIndexes = pointIndexes
		newInfo.materialIndex = materialIndex
		newInfo.normals = normals
		newInfo.tangents = tangents
		newInfo.texCoords = texCoords
		newInfo.matProperties = matProps
		newInfo.useVAO = useVAO
		this.drawInfo.push(newInfo)
		pointIndexes.forEach((element) => {
			this._drawInfoPointRefs.get(element).add(newInfo)
		})
		return newInfo
	}



	/**
	 * Feeds renderer with necessary graphics data to render this object
	 */
	_setGraphicsData(renderer, showBounds = false, wireframe = false, noLighting = false) {

		//mat4 generates matrix by cols, then rows
		//equation from Wikipedia
		var newMat = this.getModelMat(true)
		//var newTrans = mat4ToTransform(newMat)
		var b = this.bounds.getGraphicsDrawBounds()

		buf._setModelMatrix(newMat)

		//loading bounds to wgl if enabled
		if (showBounds && !this.isEngine) {
			
		} //camera will take care of final _renderData for this object
	}

	/*TODO
	update() {
		if (this.transform.pos != this._prevTransform.pos ||
			this.transform.rot != this._prevTransform.rot ||
			this.transform.scl != this._prevTransform.scl)
			
	}*/

	getObjects() {
		return Object._objects
	}
}

export function getObjects() {
	return Object._objects
}