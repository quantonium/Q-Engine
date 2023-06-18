"use strict";

/**
 * something in 3D space that can be attached to other primitives
 */
class _Primitive {
	_transform = { pos: vec3(), rot: Quaternion(0, 1, 0, 0), scl: vec3() };
	_connectedObjects = new Set()
	_prevParent
	_addRemoveObjects = []
	_parent = null
	_prevTransform;
	_updated;
	_flipZRotation = false;
	_customTickFunc = function (delta, time) { }
	_customPreTick = function (delta, time) { }
	_customPostTick = function (delta, time) { }

	_cameraMask = 0x1;
	_bufferMask = 0x1;
	_lightMask = 0x1;

	constructor(transform, bufferMask = 0x1, cameraMask = 0x1, lightMask = 0x1) {
		this._transform = transform
		this._bufferMask = bufferMask
		this._cameraMask = cameraMask
		this._lightMask = lightMask

	}

	/**
	 * gets transform adjusted by all parents
	 */

	_getWorldTransform(flipZ = false) {
		if (this._parent != null) {
			var p = this._parent._getWorldTransform(!this._parent._flipZRotation)
			if ((!this._parent._flipZRotation || flipZ) && !(!this._parent._flipZRotation && flipZ))
				return {
					pos: add(rotateAbout(mult(this._transform.pos, p.scl), p.rot), p.pos),
					rot: addRotation(p.rot, this._transform.rot),
					scl: mult(p.scl, this._transform.scl)
				}
			else return {
				pos: add(mult(vec3(1, 1, -1), rotateAbout(mult(mult(this._transform.pos, vec3(1, 1, -1)), p.scl), p.rot)), p.pos),
				rot: addRotation(p.rot, this._transform.rot),
				scl: mult(p.scl, this._transform.scl)
			}
		}
		return { pos: mult(this._transform.pos, vec3(1, 1, 1)), rot: this._transform.rot, scl: this._transform.scl }
	}

	_getModelMat(flipZ = false) {
		var t = this._getWorldTransform(flipZ);
		//var tmpf = mult(forward(this._transform.rot),vec3(1,1,flipZ?-1:1)), tmpu = mult(up(this._transform.rot), vec3(1,1,flipZ?-1:1))

		return mult(
			mult(translate(t.pos[0], t.pos[1], -t.pos[2]),
				scale(t.scl[0], t.scl[1], t.scl[2])),
			quatToMat4(t.rot))
	}

	/**
	 * 
	 * @param {*} parent 
	 * @param {*} attachType keepWorld: converts world transform into relative transform and sets own transform; keepRelative: Calculates relative transform based on current transform and parent's 
	 * @param {*} newAttachTransform Optional. Set a relative transform if attachType = "relative". If empty, set to parent transform
	 */
	_attachSelfToParent(p, attachType, newAttachTransform = null) {
		this._detach("keepWorld")
		var wt = this._getWorldTransform()
		var pt = p._getWorldTransform()
		var it = mat4ToTransform(inverse4(p._getModelMat()))
		switch (attachType.pos) {
			case "keepWorld":
				this._transform.pos = rotateAbout(subtract(wt.pos, pt.pos), it.rot)
				//console.log(this._transform.pos)
				break
			case "relative":
				if (newAttachTransform == null)
					this._transform.pos = vec3(0, 0, 0)
				else
					this._transform.pos = newAttachTransform.pos
				break
			case "dontChange":
				break
		}

		switch (attachType.rot) {
			case "keepWorld":
				this._transform.rot = addRotation(wt.rot, invQuat(pt.rot))
				break
			case "relative":
				if (newAttachTransform == null)
					this._transform.rot = eulerToQuat(vec3(1, 0, 0), 0)
				else
					this._transform.rot = newAttachTransform.rot
				break
			case "dontChange":
				break
		}

		switch (attachType.scl) {
			case "keepWorld":
				this._transform.scl = vec3(wt.scl[0] / pt.scl[0], wt.scl[1] / pt.scl[1], wt.scl[2] / pt.scl[2])
				break
			case "relative":
				if (newAttachTransform == null)
					this._transform.scl = vec3(1, 1, 1)
				else
					this._transform.scl = newAttachTransform.scl
				break
			case "dontChange":
				break
		}
		this._parent = p
		//console.log(p.connectedObjects)
		this._parent._addRemoveObjects.push(this)
		p._connectedObjects.add(this)
		this._updated = true
		p._updated = true

	}

	_attachChildToSelf(child, attachType, newAttachTransform = null) {
		child._attachSelfToParent(this, attachType, newAttachTransform)
	}

	_detach(detachType) {
		if (this._parent == null) return
		var newTransform = this._transform
		var wt = this._getWorldTransform()
		switch (detachType.pos) {
			case "keepWorld":
				newTransform.pos = wt.pos
		}
		switch (detachType.rot) {
			case "keepWorld":
				newTransform.rot = wt.rot
		}
		switch (detachType.scl) {
			case "keepWorld":
				newTransform.scl = wt.scl
		}
		this._transform = newTransform
		this._parent._updated = true
		this._parent._addRemoveObjects.push(this)
		this._parent._connectedObjects.delete(this)
		this._parent = null
		this._updated = true
	}

	_preTick(delta, time) {
		if ((this._prevTransform == null) || (!equal(this._transform.pos, this._prevTransform.pos) || !quatEqual(this._transform.rot, this._prevTransform.rot) || !equal(this._transform.scl, this._prevTransform.scl)))
			this._updated = true
		this._customPreTick(delta, time)
	}

	_onTick(delta, time) {
		this._customTickFunc(delta, time)
	}

	_postTick(delta, time) {
		if (this._updated) {
			this._updated = false
			this._prevTransform = this._transform
			this._prevParent = this._parent
			this._addRemoveObjects = []
		}
		this._customPostTick(delta, time)
	}
}

/**
 * extremely rough class representing visibility _Bounds for an _Object
 */
class _Bounds {
	static _RECT = "rect"
	static _SPHERE = "sphere"
	_type;
	_pos;
	_extent;
	_parentObject;
	_shape;
	_noDraw = false;


	constructor(pointInfo, type, parentObject) {
		this._type = type;
		this._parentObject = parentObject;
		this._updateBounds(pointInfo);
		//get center of all points rendered

	}

	_updateBounds(pointInfo) {
		this._pos = vec3(0, 0, 0)
		if (pointInfo.length > 0) {
			var min = vec3(pointInfo[0][0], pointInfo[0][1], pointInfo[0][2]) //POINTERS PLS
			var max = vec3(pointInfo[0][0], pointInfo[0][1], pointInfo[0][2])
			//get min and max x, y, z values
			for (var i = 0; i < pointInfo.length; i++) {
				for (var ii = 0; ii < pointInfo[i].length; ii++) {
					if (pointInfo[i][ii] > max[ii]) { max[ii] = pointInfo[i][ii] }
					if (pointInfo[i][ii] < min[ii]) { min[ii] = pointInfo[i][ii] }
				}
			}

			this._pos = mult(.5, add(min, max))
			//(this._pos)
			this._extent = mult(.5, subtract(max, min));
			if (this._type == _Bounds._SPHERE) {
				//get furthest point from points rendered

				this._shape = _getSphere(this._pos, this._extent, 5, 5)

			} else if (this._type == _Bounds._RECT) {
				this._shape = _getRect(this._pos, this._extent);
				//set pos to the middle of the min and max points

			} else throw "Only _Bounds types supported now are RECT and SPHERE"
		} else {
			this._extent = vec3(0, 0, 0)
			this._noDraw = true
		}
	}

	//defines points to draw _Bounds, manually
	_getDrawBounds(multMat = vec3(1, 1, 1)) {
		var r = []
		if (!this._noDraw) {
			var tmp = this._shape;
			for (var i = 0; i < tmp.index.length; i++)
				r.push(mult(multMat, vec3to4(tmp.points[tmp.index[i]])))
		}
		return r
	}

	//defines points to draw _Bounds, manually
	_getGraphicsDrawBounds(boundsColor = vec4(1, 1, 0, 1)) {
		var r = { points: [], colors: [] }
		if (!this._noDraw) {
			var tmp = this._shape;
			r.colors.push(boundsColor);
			for (var i = 0; i < tmp.index.length; i++)
				r.points.push(vec3to4(tmp.points[tmp.index[i]]))
		}
		return r
	}
}


/**
 * 3D _Primitive containing material data, coordinate data, and _Bounds
 * Note: For attached primitives to _Object, if you want to attach a _Primitive to a point, you must set the _Primitive's transform to the point location manually.
 */
class _Object extends _Primitive {
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
		var newMat = this._getModelMat(true)
		//var newTrans = mat4ToTransform(newMat)
		var b = this._bounds._getGraphicsDrawBounds()

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
		if (this._transform.pos != this._prevTransform.pos ||
			this._transform.rot != this._prevTransform.rot ||
			this._transform.scl != this._prevTransform.scl)
			
	}*/
}