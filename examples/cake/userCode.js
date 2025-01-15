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

var directLight;

function switchCamera() {
	if (_mainCamera._enabled) {
		_mainCamera._enabled = false
	} else {
		_mainCamera._enabled = true
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
				
			}



			if (i == 27) {//escape
				document.exitPointerLock();
				pointerLocked = false;
				mouseReleased = true
				mouseMove = false
			}
		}
}

var prevPos = 0
var rClick = 0

class flame{
	obj;
	light;
	lightC = .1;
	getMaterials(d){
		this.lightC = document.getElementById("myRange").value*.1
		this.obj._matInfo[2]._parameters[4][3] = (Math.random()*.25)+.5
		this.obj._matInfo[3]._parameters[4][3] = (Math.random()*.25)+.5
		this.obj._matInfo[4]._parameters[4][3] = (Math.random()*.25)+.5
		this.obj._transform.scl[1] = (Math.random()*.5)+.5
		this.obj._transform.rot = eulerToQuat(normalize(vec3(Math.random(), 0, Math.random())), 10*(Math.random()-.5))
		this.obj._transform.rot = addRotation(this.obj._transform.rot, eulerToQuat(up(this.obj._transform.rot),d*10*((Math.random()-.5)*2)))
		this.light._attenuation=((this.obj._matInfo[2]._parameters[4][3]+this.obj._matInfo[3]._parameters[4][3]+this.obj._matInfo[4]._parameters[4][3])/3)*this.lightC
	}

	constructor(){
		var tmp = _getSphere(vec3(0,1,0), vec3(.1, 1, .3), 5, 3);
		var matArr = []
		for(var x = 0; x < 5; x++)
				matArr.push(1, 1, 0)
		for(var i = 1; i < 4; i++)
			for(var x = 0; x < 5; x++)
				matArr.push(i, i+1, i+1, i+1, i, i)
		for(var x = 0; x < 5; x++)
			matArr.push(4, 4, 3)
		this.light = new _PointLight({pos: vec3(0,4,0),rot: eulerToQuat(vec3(0,1,0),0),scl: vec3(1,1,1)},
			vec4(.9,.7,.5,1), null, this.lightC)
		
		this.obj = new _Object({pos: vec3(0, 4, 0), rot: eulerToQuat(normalize(vec3(0, 1, 0)), 0), scl: vec3(1,1,1)}, 
		[_DrawInfo(tmp.index, matArr, tmp.texCoords, tmp.normals, tmp.tangents)], tmp.points, [new _BasicMaterial(vec4(.2,.1,0,.9),0,0,0,vec4(.9*2,.6*2,.2*2,1)),
			new _BasicMaterial(vec4(0,0,0,.9),0,0,0,vec4(.9*2,.9*2,.8*2,1)),
			new _BasicMaterial(vec4(0,0,0,.9),0,0,0,vec4(.9*2,.7*2,.5*2,1)),
			new _BasicMaterial(vec4(0, 0, 0, .9), 0, 0, 0, vec4(.2*2,0,.5*2,.5)),
			new _BasicMaterial(vec4(0, 0, 0, 0))], _Bounds._SPHERE)
		this.light._attachSelfToParent(this.obj, {pos: "noChange", rot: "keepWorld", scl: "keepWorld"})
		this.obj._customTickFunc = function(delta, time){
			this.getMaterials(delta);
		}.bind(this)
		this.obj._transform.rot = eulerToQuat(up(this.obj._transform.rot),360*((Math.random()-.5)*2))
	}
}

class candle{
	obj;
	f;
	constructor(posX, posY, cake){
		var c = _getCylinder(vec3(0,2,0),vec3(.5, 2, .5), 16)
		this.obj = new _Object({pos: vec3(posX, 5, posY), rot: eulerToQuat(vec3(0,1,0),0), scl: vec3(1,1,1)},
		[_DrawInfo(c.index, [0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1], c.texCoords, c.normals, c.tangents)],
		c.points, [new _BasicMaterial(vec4(1,1,1,1)), new _BasicMaterial(vec3to4(normalize(vec3(Math.random(), Math.random(), Math.random()))))], _Bounds._RECT)
		this.f = new flame()
		this.obj._attachChildToSelf(this.f.obj, {pos: "noChange", rot: "keepWorld", scl: "keepWorld"})
		this.obj._transform.rot=eulerToQuat(normalize(vec3(Math.random(), 0, Math.random())), 10*(Math.random()-.5))
		this.obj._attachSelfToParent(cake, {pos: "keepWorld", rot: "keepWorld", scl: "keepWorld"})
	}
}

var candles = []
var cake
function init() {
	_mainCamera._transform.pos = vec3(0, 5, -15)
	new _AmbientLight(vec4(.9/5,.9/5,.9/5,1), null)
	var tmp = _getRect(vec3(0, 0, 0), vec3(100, 1, 100))
	new _Object({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(0, 0, 1), 0), scl: vec3(1, 1, 1) }, [
		{ pointIndex: tmp.index, matIndex: 
			[1, 1, 1, 1, 1, 1,//bottom
			0, 0, 0, 0, 0, 0, //top
			1, 1, 1, 1, 1, 1,
			1, 1, 1, 1, 1, 1,
			1, 1, 1, 1, 1, 1,
			1, 1, 1, 1, 1, 1], texCoords: tmp.texCoords, type: _gl.TRIANGLES, normals: tmp.normals, tangents: tmp.tangents, textureIndex: -1}]
		, tmp.points, [new _BasicMaterial(vec4(.5,.3,.1,1), .5, 3, 1, vec4(0,0,0,1), 30), new _Material(-1)], _Bounds._RECT)

	var c = _getCylinder(vec3(0,0,0),vec3(10, 4, 10), 50)
	cake = new _Object({pos: vec3(0,1,0), rot: eulerToQuat(vec3(0,0,1),0), scl: vec3(1,1,1)}, [_DrawInfo(
		c.index, [0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1], c.texCoords, c.normals, c.tangents)],
		c.points, [new _BasicMaterial(vec4(.8, .8, .8, 1), 1, .2, 1, 1),
			new _BasicMaterial(vec4(0.90, 0.76, 0.42, 1), 1, .2, 1, 1)],
		_Bounds._SPHERE)

	var arr = [];
	for(let i = 0; i < 20; i++) {
		arr.push([]);
		for(let j = 0; j < 20; j++) {
			arr[i].push(false);
		}
	}
	var a = Math.random()*360;
	var r = Math.random()*.8;
	var px = Math.floor((Math.cos(radians(a))*r)*10)
	var py = Math.floor((Math.sin(radians(a))*r)*10)
	for(var x = 0; x < 52; x++){
		while(arr[px+10][py+10] == true){
			a = Math.random()*360;
			r = Math.random()*.8;
			px = Math.floor((Math.cos(radians(a))*r)*10)
			py = Math.floor((Math.sin(radians(a))*r)*10)
		}
		arr[px+10][py+10] = true
		candles.push(new candle(px, py, cake))
	}
	cake._transform.scl=vec3(.25,.25,.25)
}

window.onload = function () {
	this._engineInit("gl-canvas", init, userTick, userKeyEvent, userMouseEvent)
}