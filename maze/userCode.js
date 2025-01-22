"use strict";

var keys = []
var pointerLocked = false;
var mouseMove = false
var mouseInRect = false
var mouseReleased = true

var mazeX = 10, mazeY = 10

var xSpeed = 0, ySpeed = 0
var maxSpeed = 1

var cameraTime = 1000, cameraTargetPos = vec3(0, 50, -50), cameraTargetRot = eulerToQuat(vec3(1, 1, 0), 0), currentCameraTime = 0, prevCameraPos = null, prevCameraRot = null

var altCamera;

var directLight;

var txes = null;

function switchCamera() {
	if (_mainCamera._enabled) {
		_mainCamera._enabled = false
		altCamera._enabled = true
	} else {
		_mainCamera._enabled = true
		altCamera._enabled = false
	}
}

function userKeyEvent(e) {
	switch (e.type) {
		case "keydown":
			keys[e.keyCode] = true;
			break;
		case "keyup":
			keys[e.keyCode] = false;
			break;
	}
}

function userMouseEvent(e) {
	/*switch (e.type) {
		case "mousemove":
			if (mouseInRect && !mouseReleased) {
				mouseMove = true

				xSpeed = e.movementX * maxSpeed
				ySpeed = e.movementY * maxSpeed
				if (_mainCamera._enabled) {
					_mainCamera._transform.rot = addRotation(_mainCamera._transform.rot, eulerToQuat(vec3(0, 1, 0), -xSpeed))
					_mainCamera._transform.rot = addRotation(_mainCamera._transform.rot, eulerToQuat(right(_mainCamera._transform.rot), ySpeed))
				}
				else {
					altCamera._transform.rot = addRotation(altCamera._transform.rot, eulerToQuat(vec3(0, 1, 0), -xSpeed))
					altCamera._transform.rot = addRotation(altCamera._transform.rot, eulerToQuat(right(altCamera._transform.rot), ySpeed))
				}
				_canvas.requestPointerLock();
				pointerLocked = true;
			}
			break;
		case "mousedown":
			if (e.button == 0) {
				var pos = _getMousePos(e, _canvas)
				if (pos[0] > -1 && pos[0] < 1 && pos[1] > -1 && pos[1] < 1) {
					mouseReleased = false
					mouseInRect = true
				}
				else mouseInRect = false
			}
			break;
		case "mouseup":
			if (e.button == 0) {
				rClick = 0;
				document.exitPointerLock();
				pointerLocked = false;
				if (!mouseMove) {

					var pos = _getMousePos(e, _canvas)
					if (pos[0] > -1 && pos[0] < 1 && pos[1] > -1 && pos[1] < 1) {
						//var M = mult(_mainCamera.getProjMat(), _mainCamera.getViewMat())
						_mainCamera._clearDebug()
						//var mousePos = _getScreenPosInWorldSpace(_mainCamera, pos)
						//var intersect = linearIntersect(getPlane(vec3(0, 1, 0), vec3(1, 1, 0), vec3(1, 1, 1), fastNorm), [mousePos, _mainCamera._getWorldTransform().pos])
					}
					rClick = 1;
				}
				else {

					mouseMove = false
				}
				mouseReleased = true
			}
			break;
	}*/
}

var state = "wallGrow"

var target = 1
var current = 0
var rate = .001
var walls = []
var x = null
var f = null
var flip = null

var flipped = false

var collidingWithRoator = false

function userTick(delta, time) {
	current = clamp((current + (delta * rate)), 0, 1)
	switch (state) {
		case "wallGrow":

			for (var i = 0; i < walls.length; i++) {
				walls[i]._transform.pos = vec3(walls[i]._transform.pos[0], mix(0, 5, current), walls[i]._transform.pos[2])
				walls[i]._transform.scl = vec3(1, current, 1);
			}
			flip._transform.pos = vec3(flip._transform.pos[0], mix(0, 1, current), flip._transform.pos[2])
			flip._transform.scl = vec3(1, current, 1);
			break
		case "forward": case "forward2": case "forward3":
			_mainCamera._transform.pos = mix(x, f, current)
			break
		case "turn1": case "turn2": case "rotate":
			_mainCamera._transform.rot = quatLerp(x, f, current)


	}

	if (current == target) {
		current = 0
		switch (state) {
			case "wallGrow":
				x = _mainCamera._transform.pos
				f = add(x, mult(normalize(forward(_mainCamera._transform.rot)), vec3(15, 0, 15)))
				state = "forward"
				break
			case "forward":
				x = _mainCamera._transform.rot
				f = addRotation(_mainCamera._transform.rot, eulerToQuat(vec3(0, 1, 0), 90 * (Math.random() > .5 ? -1 : 1), normalize))
				state = "turn1"
				break
			case "forward2":
				if(collidingWithRoator){
					x = _mainCamera._transform.rot
					f = addRotation(_mainCamera._transform.rot, eulerToQuat(normalize(forward(_mainCamera._transform.rot)), flipped?180:-180, normalize))
					flipped = !flipped
					rate = .0025
					state = "rotate"
				}
				else {
					x = _mainCamera._transform.rot
					f = addRotation(_mainCamera._transform.rot, eulerToQuat(vec3(0, 1, 0), 90 * (Math.random() > .5 ? -1 : 1), normalize))
					rate = .001
					state = "turn2"
				}
				
				break
			case "rotate":
				x = _mainCamera._transform.rot
					f = addRotation(_mainCamera._transform.rot, eulerToQuat(vec3(0, 1, 0), 90 * (Math.random() > .5 ? -1 : 1), normalize))
					rate = .001
					state = "turn2"
					break
			case "turn1":
				x = _mainCamera._transform.pos
				f = add(x, mult(normalize(forward(_mainCamera._transform.rot)), vec3(30, 0, 30)))
				rate = .0005
				state = "forward2"
				break
			case "turn2":
				x = _mainCamera._transform.pos
				f = add(x, mult(normalize(forward(_mainCamera._transform.rot)), vec3(15, 0, 15)))
				state = "forward3"
				break
			case "forward3":
				_mainCamera._transform.pos = vec3(0, 5, 0)
				_mainCamera._transform.rot = eulerToQuat(normalize(forward(_mainCamera._transform.rot)), !flipped ? 0 : 180)
				flip._transform.pos=vec3((Math.random()>.5?1:-1)*30, 1, 15)
				x = _mainCamera._transform.pos
				f = add(x, mult(normalize(forward(_mainCamera._transform.rot)), vec3(15, 0, 15)))
				state = "forward"

		}
	}
}

var prevPos = 0
var rClick = 0
var mat = null;

function init() {
	txes = [new _ComplexTexture(_gl, ["images/Brick_Wall_015_COLOR.jpg", "images/Brick_Wall_015_NORM.jpg", "images/Brick_Wall_015_DISP.png", "images/Brick_Wall_015_OCC.jpg", "images/Brick_Wall_015_ROUGH.jpg", null]),
	new _ComplexTexture(_gl, ["images/Brick_wall_008_COLOR.jpg", "images/Brick_wall_008_NORM.jpg", "images/Brick_wall_008_DISP.png", "images/Brick_wall_008_OCC.jpg", "images/Brick_wall_008_SPEC.jpg", null]),
	new _ComplexTexture(_gl, ["images/Wood_Floor_010_basecolor.jpg", "images/Wood_Floor_010_normal.jpg", "images/Wood_Floor_010_height.png", "images/Wood_Floor_010_ambientOcclusion.jpg", "images/Wood_Floor_010_roughness.jpg", null])]

	mat = new _ScaledTexMat(true, .1, .1, 0, 0, 8, 32, .1, [vec4(1, 1, 1, 1), vec4(1, 1, 1, 1), vec4(1, 1, 1, 1), vec4(1, 1, 1, 1), vec4(0, 0, 0, 1), vec4(10, 8, 32, .001), vec4(1, 1, 0, 0)])
	mat2 = new _ScaledTexMat(true, .1, .1, 0, 0, 8, 32, .1, [vec4(2, 1, 1, 1), vec4(1, 2, 2, 1), vec4(1, 2, 2, 1), vec4(1, 1, 1, 1), vec4(0, 0, 0, 1), vec4(10, 8, 32, .001), vec4(1, 1, 0, 0)])

	altCamera = new _Camera(_bData, vec3(0, 20, 0), eulerToQuat(vec3(1, 0, 0), 90), vec3(1, 1, 1))
	altCamera._enabled = false
	_mainCamera._transform.pos = vec3(0, 5, 0)
	new _AmbientLight(vec4(.2, .2, .2, 1), null)
	directLight = new _DirectionalLight({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(1, 0, 0), 90), scl: vec3(1, 1, 1) }, vec4(.5, .5, .5, 1), null)
	var playerLight = new _PointLight({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(1, 0, 0), 0), scl: vec3(1, 1, 1) }, vec4(.5, .5, .5, 1), null, 10)
	_mainCamera._attachChildToSelf(playerLight, "relative")
	altCamera._renderEngine = false
	//generateMaze_()
	var tmp = _getRect(vec3(0, 0, 0), vec3(50, 0, 50))

	//floors, ceil
	new _Object({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(0, 0, 1), 0), scl: vec3(1, 1, 1) }, [
		{
			pointIndex: tmp.index, matIndex:
				[ 1, 1, 1, 1, 1, 1, //bottom
					0, 0, 0, 0, 0, 0,//top
					1, 1, 1, 1, 1, 1,
					1, 1, 1, 1, 1, 1,
					1, 1, 1, 1, 1, 1,
					1, 1, 1, 1, 1, 1], texCoords: tmp.texCoords, type: _gl.TRIANGLES, normals: tmp.normals, tangents: tmp.tangents, textureIndex: 0,
					bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1
		}]
		, tmp.points, [mat, new _Material(-1)], _Bounds._RECT, [txes[2]])

	new _Object({ pos: vec3(0, 10, 0), rot: eulerToQuat(vec3(0, 0, 1), 0), scl: vec3(1, 1, 1) }, [
		{
			pointIndex: tmp.index, matIndex:
				[0, 0, 0, 0, 0, 0, //bottom
					1, 1, 1, 1, 1, 1, //top
					1, 1, 1, 1, 1, 1,
					1, 1, 1, 1, 1, 1,
					1, 1, 1, 1, 1, 1,
					1, 1, 1, 1, 1, 1], texCoords: tmp.texCoords, type: _gl.TRIANGLES, normals: tmp.normals, tangents: tmp.tangents, textureIndex: 0,
					bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1
		}]
		, tmp.points, [mat, new _Material(-1)], _Bounds._RECT, [txes[0]])

	//walls

	var shortWall = _getRect(vec3(0, 0, 0), vec3(0, 5, 10))
	var longWall = _getRect(vec3(0, 0, 0), vec3(0, 5, 25))

	//start left and right
	walls = [new _Object({ pos: vec3(-5, 0, 0), rot: eulerToQuat(vec3(0, 0, 1), 0), scl: vec3(1, 0, 1) },
		[{ pointIndex: shortWall.index, matIndex: [0], texCoords: shortWall.texCoords, type: _gl.TRIANGLES, normals: shortWall.normals, tangents: shortWall.tangents, textureIndex: 0, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1 }],
		shortWall.points, [mat2], _Bounds._RECT, [txes[1]]),

	new _Object({ pos: vec3(5, 0, 0), rot: eulerToQuat(vec3(0, 0, 1), 0), scl: vec3(1, 0, 1) },
		[{ pointIndex: shortWall.index, matIndex: [0], texCoords: shortWall.texCoords, type: _gl.TRIANGLES, normals: shortWall.normals, tangents: shortWall.tangents, textureIndex: 0, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1 }],
		shortWall.points, [mat2], _Bounds._RECT, [txes[1]]),

	//across hallway
	new _Object({ pos: vec3(0, 0, 20), rot: eulerToQuat(vec3(0, 1, 0), 90, normalize), scl: vec3(1, 0, 1) },
		[{ pointIndex: longWall.index, matIndex: [0], texCoords: longWall.texCoords, type: _gl.TRIANGLES, normals: longWall.normals, tangents: longWall.tangents, textureIndex: 0, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1 }],
		longWall.points, [mat2], _Bounds._RECT, [txes[1]]),

	new _Object({ pos: vec3(15, 0, 10), rot: eulerToQuat(vec3(0, 1, 0), 90, normalize), scl: vec3(1, 0, 1) },
		[{ pointIndex: shortWall.index, matIndex: [0], texCoords: shortWall.texCoords, type: _gl.TRIANGLES, normals: shortWall.normals, tangents: shortWall.tangents, textureIndex: 0, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1 }],
		shortWall.points, [mat2], _Bounds._RECT, [txes[1]]),

	new _Object({ pos: vec3(-15, 0, 10), rot: eulerToQuat(vec3(0, 1, 0), 90, normalize), scl: vec3(1, 0, 1) },
		[{ pointIndex: tmp.index, matIndex: [0], texCoords: shortWall.texCoords, type: _gl.TRIANGLES, normals: shortWall.normals, tangents: shortWall.tangents, textureIndex: 0, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1 }],
		shortWall.points, [mat2], _Bounds._RECT, [txes[1]]),


	//across across left
	new _Object({ pos: vec3(-35, 0, 15), rot: eulerToQuat(vec3(0, 0, 1), 0), scl: vec3(1, 0, 1) },
		[{ pointIndex: longWall.index, matIndex: [0], texCoords: longWall.texCoords, type: _gl.TRIANGLES, normals: longWall.normals, tangents: longWall.tangents, textureIndex: 0, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1 }],
		longWall.points, [mat2], _Bounds._RECT, [txes[1]]),

	new _Object({ pos: vec3(-25, 0, 0), rot: eulerToQuat(vec3(0, 0, 1), 0), scl: vec3(1, 0, 1) },
		[{ pointIndex: shortWall.index, matIndex: [0], texCoords: shortWall.texCoords, type: _gl.TRIANGLES, normals: shortWall.normals, tangents: shortWall.tangents, textureIndex: 0, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1 }],
		shortWall.points, [mat2], _Bounds._RECT, [txes[1]]),

	new _Object({ pos: vec3(-25, 0, 30), rot: eulerToQuat(vec3(0, 0, 1), 0), scl: vec3(1, 0, 1) },
		[{ pointIndex: shortWall.index, matIndex: [0], texCoords: shortWall.texCoords, type: _gl.TRIANGLES, normals: shortWall.normals, tangents: shortWall.tangents, textureIndex: 0, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1 }],
		shortWall.points, [mat2], _Bounds._RECT, [txes[1]]),

	new _Object({ pos: vec3(-30, 0, 50), rot: eulerToQuat(vec3(0, 1, 0), 90, normalize), scl: vec3(1, 0, 1) },
		[{ pointIndex: longWall.index, matIndex: [0], texCoords: longWall.texCoords, type: _gl.TRIANGLES, normals: longWall.normals, tangents: longWall.tangents, textureIndex: 0, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1 }],
		longWall.points, [mat2], _Bounds._RECT, [txes[1]]),

	new _Object({ pos: vec3(-30, 0, -20), rot: eulerToQuat(vec3(0, 1, 0), 90, normalize), scl: vec3(1, 0, 1) },
		[{ pointIndex: longWall.index, matIndex: [0], texCoords: longWall.texCoords, type: _gl.TRIANGLES, normals: longWall.normals, tangents: longWall.tangents, textureIndex: 0, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1 }],
		longWall.points, [mat2], _Bounds._RECT, [txes[1]]),

	//across across right
	new _Object({ pos: vec3(35, 0, 15), rot: eulerToQuat(vec3(0, 0, 1), 0), scl: vec3(1, 0, 1) },
		[{ pointIndex: longWall.index, matIndex: [0], texCoords: longWall.texCoords, type: _gl.TRIANGLES, normals: longWall.normals, tangents: longWall.tangents, textureIndex: 0, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1 }],
		longWall.points, [mat2], _Bounds._RECT, [txes[1]]),

	new _Object({ pos: vec3(25, 0, 0), rot: eulerToQuat(vec3(0, 0, 1), 0), scl: vec3(1, 0, 1) },
		[{ pointIndex: shortWall.index, matIndex: [0], texCoords: shortWall.texCoords, type: _gl.TRIANGLES, normals: shortWall.normals, tangents: shortWall.tangents, textureIndex: 0, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1 }],
		shortWall.points, [mat2], _Bounds._RECT, [txes[1]]),

	new _Object({ pos: vec3(25, 0, 30), rot: eulerToQuat(vec3(0, 0, 1), 0), scl: vec3(1, 0, 1) },
		[{ pointIndex: shortWall.index, matIndex: [0], texCoords: shortWall.texCoords, type: _gl.TRIANGLES, normals: shortWall.normals, tangents: shortWall.tangents, textureIndex: 0, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1 }],
		shortWall.points, [mat2], _Bounds._RECT, [txes[1]]),

	new _Object({ pos: vec3(30, 0, 50), rot: eulerToQuat(vec3(0, 1, 0), 90, normalize), scl: vec3(1, 0, 1) },
		[{ pointIndex: longWall.index, matIndex: [0], texCoords: longWall.texCoords, type: _gl.TRIANGLES, normals: longWall.normals, tangents: longWall.tangents, textureIndex: 0, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1 }],
		longWall.points, [mat2], _Bounds._RECT, [txes[1]]),

	new _Object({ pos: vec3(30, 0, -20), rot: eulerToQuat(vec3(0, 1, 0), 90, normalize), scl: vec3(1, 0, 1) },
		[{ pointIndex: longWall.index, matIndex: [0], texCoords: longWall.texCoords, type: _gl.TRIANGLES, normals: longWall.normals, tangents: longWall.tangents, textureIndex: 0, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1 }],
		longWall.points, [mat2], _Bounds._RECT, [txes[1]])]

	//fliperoo
	tmp = _getSphere(vec3(0,0,0),vec3(1,1,1),16, 8)
	flip = new _Object({pos: vec3((Math.random()>.5?1:-1)*30, 1, 15), rot: eulerToQuat(vec3(0,1,0),0,normalize), scl: vec3(1,0,1)},
	[{pointIndex: tmp.index, matIndex: [0, 1], texCoords: tmp.texCoords, type: _gl.TRIANGLES, normals: tmp.normals, tangents: tmp.tangents, textureIndex: -1, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1}],
	tmp.points, [new _BasicMaterial(vec4(0,0,0,1)), new _BasicMaterial(vec4(1,1,1,1))], _Bounds._SPHERE, [])

	flip._customTickFunc = function (d, t) {
		this._transform.rot = addRotation(this._transform.rot, eulerToQuat(vec3(0,1,0), d*.1))
		var tmp = subtract(this._transform.pos, _mainCamera._transform.pos)
		if(length(vec2(tmp[0], tmp[2])) < 1){
			collidingWithRoator = true
			//_bufferedConsoleLog("in range")
		}
		else collidingWithRoator = false
	}.bind(flip)
}

window.onload = function () {
	this._engineInit("gl-canvas", init, userTick, userKeyEvent, userMouseEvent)
}