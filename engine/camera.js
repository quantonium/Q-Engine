/**
 * representation of a view, targeting an (optional) buffer
 */
class _Camera extends _Primitive {

	_debugPoints = []
	_debugColors = []
	_debugTypes = []
	_debugOffsets = []
	_wireframe = false
	_noLighting = false
	_showBounds = false
	_renderEngine = false
	_noTexture = false
	_noParallax = false
	_render = true
	_enabled = true
	_bufs = []
	_fov = 90
	_aspect = 1280/720
	_ortho = false
	_range = [.1, 200000]
	_currentProjMat = null

	_clearDebug() {
		this._debugPoints = []
		this._debugColors = []
		this._debugTypes = []
		this._debugOffsets = []
	}

	_getProjMat() {
		return this._ortho ? ortho(-this._fov / 2, this._fov / 2, -(this._fov / 2) * this._aspect, (this._fov / 2) * this._aspect, this._range[0], this._range[1]) : perspective(this._fov, this._aspect, this._range[0], this._range[1])
	}

	_getViewMat() {
		//var rotMat = null
		//var t = this._getModelMat(true)
		/*//bufferedConsoleLog(t)
		var rotQuat = Quaternion(t.rot.w, t.rot.x, t.rot.y, -t.rot.z)
		rotMat = quatToMat4(rotQuat);
		//(eulerToQuat(vec3(this._transform.rot[0]+90, -(this._transform.rot[1]-90), this._transform.rot[2])));
		rotMat = mult(rotMat, scale(1 / t.scl[0], 1 / t.scl[1], 1 / t.scl[2]))
		rotMat = mult(rotMat, translate(-t.pos[0], -t.pos[1], -t.pos[2]))
		

		return rotMat*/
		var tmp = this._getWorldTransform()
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
	 * Pushes all points in every _Object in scene to its buffer
	 * @param wireframe if true, display all geometry as gl.LINE_LOOP
	 * @param showBounds if true, show _Bounds of all geometry
	 * @param renderAfter true if _Camera should be immediately rendered to its view after pushing data to buffer
	 */
	_pushToBuffers() {
		if (this._enabled) {
			this._bufs.forEach((f) => {
				f._clearBuffers();
				var p = this._getWorldTransform(true);
				f._setViewMatrix(this._getViewMat(), p.pos, p.scl)
				f._setProjMatrix(this._currentProjMat);
				//adding objects

				_objects.forEach((o) => {
					if (((o._bufferMask & o._cameraMask & f._bufferMask & this._cameraMask) != 0) && ((this._renderEngine && o._isEngine) || !o._isEngine)) {
						if (o._visible) {
							o._setGraphicsData(f, this);
							if(this._render) f._renderData();
						}
					}
				});
				var x = 0
				for (var o = 0; o < this._debugOffsets.length; o++) {
					f._types.push(this._debugTypes[o])
					f._offsets.push(this._debugOffsets[o])
					for (var i = 0; i < this._debugOffsets[o]; i++) {
						if (i.length + f._points.length > f._bufLimit)
							f._renderData();
						f._points.push(this._debugPoints[i + x])
						var tmp = new _SolidColorNoLighting(this._debugColors[i % this._debugColors.length]);
						f._loadMaterial(tmp, false, this._wireframe || this._noLighting, this._noParallax)
						f._normals.push(vec3(1, 0, 0))//debug data has no normals, this is just filler
						f._tangents.push(vec3(0, 1, 0))
						//f._bitangents.push(vec3(0, 0, 1))
						f._texCoords.push(vec2(0, 0)) //_Bounds have no textures, again just filler
					}
					x += this._debugOffsets[o]
				}
				//render any remaining data
				if (this._render)
					f._renderData()
				})
			
		}


		//get uniform matrix

		//var rotMat = mult(mult(rotateZ(this._transform.rot[2]), rotateY(-(this._transform.rot[1] - 90))), rotateX(-this._transform.rot[0]))//this may look wrong, and it most definately is, but it works
	}

	_updateCameraView(fov = this._fov, aspect = this._aspect, orthographic = this._ortho, range = this._range, width=null, height=null) {
		var w = width
		var h = height
		var a = aspect
		
		if(w == null) w = this._bufs[0]._gTarget.canvas.clientWidth;
		if(h == null) h = this._bufs[0]._gTarget.canvas.clientHeight;
		if (a < 0) a = w / h

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
		
		
		if (a != this._aspect) {
			this._aspect = a
			changed = true
		}

		if(changed || this._currentProjMat == null)
			this._currentProjMat = this._getProjMat()
		
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
	constructor(targetBuffers, pos = vec3(0, 0, 0), rot = eulerToQuat(vec3(1, 0, 0), 0), scl = vec3(1, 1, 1), fov = 90, aspect = -1, orthographic = false, range = [.1, 200000], enabled = true, renderEngine = false) {
		//if(rot.length != 4) throw "Rotations must be quaternions!"
		super({ pos: pos, rot: rot, scl: scl })
		this._flipZRotation = true
		if(targetBuffers instanceof Array) this._bufs = targetBuffers
		else this._bufs = [targetBuffers]
		this._enabled = enabled
		this._renderEngine = renderEngine
		this._updateCameraView(fov, aspect, orthographic, range)
		_cameras.push(this);
	}
}
