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
	switch (e.type) {
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
	}
}



function userTick(delta, time) {
	directLight._transform.rot = addRotation(directLight._transform.rot, eulerToQuat(vec3(0, 1, 0), delta * .1))
	for (var i = 0; i < keys.length; i++)
		if (keys[i]) {
			if (_mainCamera._enabled) {
				var d = vec3(0,0,0)
				var f = forward(_mainCamera._transform.rot), r = right(_mainCamera._transform.rot)
				if ((i == 87) || (i == 119)) {//w
					var n = add(_mainCamera._transform.pos, mult(.01 * delta, fastNorm(vec3(f[0], 0, f[2]))))
						_mainCamera._transform.pos = n
				}

				if ((i == 65) || (i == 97)) {//a
					var n = add(_mainCamera._transform.pos, mult(-.01 * delta, fastNorm(vec3(r[0], 0, r[2]))))
						_mainCamera._transform.pos = n
				}

				if ((i == 83) || (i == 115)) {//s
					var n = add(_mainCamera._transform.pos, mult(-.01 * delta, fastNorm(vec3(f[0], 0, f[2]))))
						_mainCamera._transform.pos = n
				}

				if ((i == 68) || (i == 100)) {//d
					var n = add(_mainCamera._transform.pos, mult(.01 * delta, fastNorm(vec3(r[0], 0, r[2]))))
						_mainCamera._transform.pos = n
				}
			}
			else {
				if ((i == 87) || (i == 119)) //w
					altCamera._transform.pos = add(altCamera._transform.pos, mult(.01 * delta, forward(altCamera._transform.rot)))

				if ((i == 65) || (i == 97))//a
					altCamera._transform.pos = add(altCamera._transform.pos, mult(-.01 * delta, right(altCamera._transform.rot)))
				if ((i == 83) || (i == 115))//s
					altCamera._transform.pos = add(altCamera._transform.pos, mult(-.01 * delta, forward(altCamera._transform.rot)))

				if ((i == 68) || (i == 100))//d
					altCamera._transform.pos = add(altCamera._transform.pos, mult(.01 * delta, right(altCamera._transform.rot)))
				if ((i == 81))//q
					altCamera._transform.pos = add(altCamera._transform.pos, mult(-.01 * delta, up(altCamera._transform.rot)))

				if ((i == 69))//e
					altCamera._transform.pos = add(altCamera._transform.pos, mult(.01 * delta, up(altCamera._transform.rot)))
			}



			if (i == 27) {//escape
				document.exitPointerLock();
				pointerLocked = false;
				mouseReleased = true
				mouseMove = false
			}
		}

	/*if(!pointerLocked){
		_mainCamera._transform.rot = addRotation(_mainCamera._transform.rot, eulerToQuat(vec3(0, 1, 0), -xSpeed))
		_mainCamera._transform.rot = addRotation(_mainCamera._transform.rot, eulerToQuat(right(_mainCamera._transform.rot), ySpeed))
		if(Math.abs(xSpeed) > .1)
			xSpeed -= Math.sign(xSpeed)*delta*(maxSpeed*.001)
		else xSpeed = 0

		if(Math.abs(ySpeed) > .1)
			ySpeed -= Math.sign(ySpeed)*delta*(maxSpeed*.001)
		else ySpeed = 0
	}*/
}

var prevPos = 0
var rClick = 0


function init() {
	altCamera = new _Camera(_bData, vec3(0, 20, 0), eulerToQuat(vec3(1, 0, 0), 90), vec3(1, 1, 1))
	altCamera._enabled = false
	_mainCamera._transform.pos = vec3(0, 1, 0)
	new _AmbientLight(vec4(1, 0, 0, 1), null)
	directLight = new _DirectionalLight({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(.5, .5, .5), 90), scl: vec3(1, 1, 1) }, vec4(0, 0, 1, 1), null)
	var playerLight = new _PointLight({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(1, 0, 0), 0), scl: vec3(1, 1, 1) }, vec4(0, 1, 0, 1), null, 10)
	_mainCamera._attachChildToSelf(playerLight, "relative")
	altCamera._renderEngine = false
	var tmp = _getRect(vec3(0, 0, 0), vec3(100, 0, 100))
	new _Object({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(0, 0, 1), 0), scl: vec3(1, 1, 1) }, [
		{ pointIndex: tmp.index, matIndex: 
			[1, 1, 1, 1, 1, 1,//bottom
			0, 0, 0, 0, 0, 0, //top
			1, 1, 1, 1, 1, 1,
			1, 1, 1, 1, 1, 1,
			1, 1, 1, 1, 1, 1,
			1, 1, 1, 1, 1, 1], texCoords: tmp.texCoords, type: _gl.TRIANGLES, normals: tmp.normals, tangents: tmp.tangents, textureIndex: -1}]
		, tmp.points, [new _Material(), new _Material(-1)], _Bounds._RECT)
	var cube = _getRect(vec3(-10,0,0),vec3(1,1,1))
	var sphere = _getSphere(vec3(0,0,0),vec3(1,1,1),10,10)
	var sphereArr = _addToPointIndArr(sphere.index, cube.points.length)
	var cylinder = _getCylinder(vec3(10,0,0),vec3(1,1,1),10)
	var cylinderArr = _addToPointIndArr(cylinder.index, cube.points.length+sphere.points.length)
	var points = _mergePointArrs(_mergePointArrs(cube.points, sphere.points), cylinder.points)
	var t = new _Object({pos: vec3(0, 1, 10), rot: eulerToQuat(vec3(0,0,1),0),scl: vec3(1,1,1)}, [{pointIndex: cube.index, matIndex: [0], texCoords: cube.texCoords,
	type: _gl.TRIANGLES, normals: cube.normals, tangents: cube.tangents, textureIndex: -1}, {pointIndex: sphereArr, matIndex: [0], texCoords: sphere.texCoords,
	type: _gl.TRIANGLES, normals: sphere.normals, tangents: sphere.tangents, textureIndex: -1}, {pointIndex: cylinderArr, matIndex: [0], texCoords: cylinder.texCoords,
	type: _gl.TRIANGLES, normals: cylinder.normals, tangents: cylinder.tangents, textureIndex: -1}], points, [new _BasicMaterial()], _Bounds._RECT, [])

	var s = _getRect(vec3(0, 0, 0), vec3(.5,.5,.5))
	var x = new _Object({pos: vec3(0, 1, 0), rot: eulerToQuat(vec3(0,0,1),0),scl: vec3(1,1,1)},[{pointIndex: s.index, matIndex: [0], texCoords: s.texCoords, 
	type: _gl.TRIANGLES, normals: s.normals, tangents: s.tangents, textureIndex: -1}], s.points, [new _BasicMaterial()], _Bounds._RECT, [])
	x._attachSelfToParent(t, {pos: "noChange", rot: "noChange", scl: "noChange"})
	t._customTickFunc = function(d, t) {this._transform.rot = addRotation(this._transform.rot, eulerToQuat(vec3(1,0,0), d*.01))}.bind(t)
	var testLight = new _PointLight({pos: vec3(0,-1,0),rot:eulerToQuat(vec3(1,0,0),0),scl: vec3(1,1,1)}, vec4(1,1,1,1),null,10)
	testLight._attachSelfToParent(t, {pos: "noChange", rot: "noChange", scl: "noChange"})
}

window.onload = function () {
	this._engineInit("gl-canvas", init, userTick, userKeyEvent, userMouseEvent, "../default-shaders/vertex.glsl", "../default-shaders/fragment.glsl",
	"../default-shaders/postprocess-vertex.glsl", "postprocess-fragment.glsl")
}