"use strict";

import Primitive from "./primitive.js"

_objects = new Map();

/**
 * 3D _Primitive containing material data, coordinate data, and _Bounds
 * Note: For attached primitives to _Object, if you want to attach a _Primitive to a point, you must set the _Primitive's transform to the point location manually.
 */
export class Object extends Primitive {
	_drawInfo = []
	_pointInfo = []
	_isEngine = false
	_matInfo = []
	_textureInfo = []
	_visible = []
	_id = -1
	_bounds;
	_drawPoints = new Float32Array()
	_drawNormals = new Float32Array()
	_drawTangents = new Float32Array()
	

	/**To be called whenever individual points are adjusted */
	_reevaluateBounds(pointInfo, boundsType) {
		this._bounds = new _Bounds(pointInfo, boundsType);
	}

	/**To be called whenever individual points are adjusted. Updates float32arrays  */
	/**
	 * 
	 * @param {transform} startTransform
	 * @param {drawInfo} drawInfo array of [{pointIndex[], matIndex[], texCoords[], type}]
	 * @param {enum} drawType 
	 */
	constructor(startTransform, drawInfo, pointInfo, matInfo, boundsType, textureInfo = [], isEngine = false, visible = true) {
		//if(startTransform.rot.length != 4) throw "Rotations must be quaternions!"
		super(startTransform)
		this._id = _newID();
		this._drawInfo = drawInfo;
		this._pointInfo = pointInfo;
		this._reevaluateBounds(pointInfo, boundsType)
		this._isEngine = isEngine
		this._matInfo = matInfo
		this._textureInfo = textureInfo
		this._visible = visible
		_objects.set(this._id, this)
	}


	/**
	 * Returns points array and bounding box relative to world coordinates
	 */
	_setGraphicsData(buf, camera) {

		//mat4 generates matrix by cols, then rows
		//equation from Wikipedia
		var newMat = this.getModelMat(true)
		//var newTrans = mat4ToTransform(newMat)
		var b = this.bounds.getGraphicsDrawBounds()

		buf._setModelMatrix(newMat)
		for (var g = 0; g < this._drawInfo.length; g++) {
			var d = this._drawInfo[g]
			var i = d.pointIndex

			if (i.length > buf._bufLimit)
				console.error("Unable to load data to GPU. Too many points. Length: " + i.length + "; Object: " + o);
			else {

				if (((i.length + buf._points.length > buf._bufLimit) || d.textureIndex != -1) && camera._render)
					buf._renderData();

				buf._offsets.push(i.length)
				
				buf._types.push(camera._wireframe ? buf._gTarget.LINE_LOOP : d.type)

				if (d.textureIndex != -1)
					buf._loadTexture(this._textureInfo[d.textureIndex], camera._cameraMask)

				buf._texCoords = d.texCoords
				for (var ii = 0; ii < i.length; ii++) {
					buf._loadMaterial(this._matInfo[d.matIndex[ii % d.matIndex.length]], d.textureIndex != -1 && !camera._noTexture, camera._wireframe || camera._noLighting, camera._noParallax)
					buf._points.push(this._pointInfo[i[ii]])
					switch (d.type) {
						case _gl.TRIANGLES:
							buf._normals.push(d.normals[Math.floor(ii / 3)]) //push 3 for each vert
							buf._tangents.push(d.tangents[Math.floor(ii / 3)]) //push 3 for each vert
							break;
						default:
							buf._normals.push(d.normals[ii])
							buf._tangents.push(d.tangents[ii])

					}
					//buf._texCoords.push(d.texCoords[ii])
				}

				if ((d.textureIndex != -1 || camera._showNormalTangents) && camera._render)
					buf._renderData();
			}
		}
		if (camera._showBounds && !this._isEngine) {
			if (camera._render)
				buf._renderData();
			buf._types.push(buf._gTarget.LINE_LOOP);
			var b = this._bounds._getGraphicsDrawBounds();
			buf._offsets.push(b.points.length)
			for (var i = 0; i < b.points.length; i++) {
				buf._points.push(b.points[i])
				var tmp = new _SolidColorNoLighting(b.colors[i % b.colors.length]);
				buf._loadMaterial(tmp, false, camera._wireframe || camera._noLighting)
				buf._normals.push(vec3(1, 0, 0))//_Bounds have no normals, this is just filler
				buf._tangents.push(vec3(0, 1, 0))
				buf._texCoords.push(vec2(0, 0)) //_Bounds have no textures, again just filler
				//buf_bitangents.push(vec3(0, 0, 1))
			}
		} //camera will take care of final _renderData for this object
	}

	/*TODO
	update() {
		if (this.transform.pos != this._prevTransform.pos ||
			this.transform.rot != this._prevTransform.rot ||
			this.transform.scl != this._prevTransform.scl)
			
	}*/
}