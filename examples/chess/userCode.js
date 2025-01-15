"use strict";

var coords;
var test;
var pointerLocked = false;

var keys = []
var mouseMove = false
var mouseInRect = false
var mouseReleased = true

var xSpeed = 0, ySpeed = 0
var maxSpeed = 1

var cameraBall
var cameraTime = 1000, cameraTargetPos = vec3(0, 50, -50), cameraTargetRot = eulerToQuat(vec3(1, 1, 0), 0), currentCameraTime = 0, prevCameraPos = null, prevCameraRot = null


var boardPieces = [], boardState = [], checkersPieces = [], removedCheckersPieces = [[], []], origBoardColors = []
var boardSize = 64

var prevPos = 0
var rClick = 0

var side = "red"
var state = "move"

var selectedPiece = null

function userMouseEvent(e) {
	switch (e.type) {
		case "mousemove":
			if (mouseInRect && !mouseReleased) {
				mouseMove = true
	
				xSpeed = e.movementX * maxSpeed
				ySpeed = e.movementY * maxSpeed
				cameraBall._transform.rot = addRotation(cameraBall._transform.rot, eulerToQuat(vec3(0, 1, 0), -xSpeed))
				cameraBall._transform.rot = addRotation(cameraBall._transform.rot, eulerToQuat(right(cameraBall._transform.rot), ySpeed))
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
						var mousePos = _getScreenPosInWorldSpace(_mainCamera, pos)
						var intersect = linearIntersect(getPlane([vec3(0, 1, 0), vec3(1, 1, 0), vec3(1, 1, 1)]), [mousePos, _mainCamera._getWorldTransform().pos])
						var i = Math.floor(intersect[0] / (boardSize / 8) + 4);
						var j = 7 - Math.floor(intersect[2] / (boardSize / 8) + 4);
						_bufferedConsoleLog(intersect)
						_bufferedConsoleLog(i, j)
						if (i >= 0 && i < 8 && j >= 0 && j < 8) {
		
							switch (boardState[i][j]) {
								case "select":
									boardState[i][j] = "none"
									boardPieces[i][j]._matInfo[0]._parameters[0] = origBoardColors[i][j]
									selectedPiece = null
									break
								case "none":
									if (selectedPiece == null) {
										if (checkersPieces[i][j] != null && checkersPieces[i][j].side == side) {
											boardState[i][j] = "select"
											boardPieces[i][j]._matInfo[0]._parameters[0] = vec4(0, 1, 0, 1)
											selectedPiece = checkersPieces[i][j]
											checkersPieces[i][j].getMoves()
										}
									}
							}
						}
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

/**
 * user defined, overridable
 * @param {*} prevTime 
 */


function userTick(delta, time) {

	for (var x = 0; x < 8; x++) {
		for (var y = 0; y < 8; y++) {
			if (checkersPieces[x][y] != null)
				checkersPieces[x][y].update(delta)
		}
	}

	for (var i = 0; i < keys.length; i++)
		if (keys[i]) {
			if ((i == 87) || (i == 119))//w
				_mainCamera._transform.pos = add(_mainCamera._transform.pos, mult(1, forward(_mainCamera._transform.rot)))

			if ((i == 65) || (i == 97))//a
				_mainCamera._transform.pos = add(_mainCamera._transform.pos, mult(-1, right(_mainCamera._transform.rot)))

			if ((i == 83) || (i == 115))//s
				_mainCamera._transform.pos = add(_mainCamera._transform.pos, mult(-1, forward(_mainCamera._transform.rot)))

			if ((i == 68) || (i == 100))//d
				_mainCamera._transform.pos = add(_mainCamera._transform.pos, mult(1, right(_mainCamera._transform.rot)))

			if ((i == 81))//q
				_mainCamera._transform.pos = add(_mainCamera._transform.pos, mult(-1, up(_mainCamera._transform.rot)))

			if ((i == 69))//e
				_mainCamera._transform.pos = add(_mainCamera._transform.pos, mult(1, up(_mainCamera._transform.rot)))

			if (i == 27) {//escape
				document.exitPointerLock();
				pointerLocked = false;
				mouseReleased = true
				mouseMove = false
			}
		}

	if(!pointerLocked){
		cameraBall._transform.rot = addRotation(cameraBall._transform.rot, eulerToQuat(vec3(0, 1, 0), -xSpeed))
		cameraBall._transform.rot = addRotation(cameraBall._transform.rot, eulerToQuat(right(cameraBall._transform.rot), ySpeed))
		if(Math.abs(xSpeed) > .1)
			xSpeed -= Math.sign(xSpeed)*delta*(maxSpeed*.001)
		else xSpeed = 0

		if(Math.abs(ySpeed) > .1)
			ySpeed -= Math.sign(ySpeed)*delta*(maxSpeed*.001)
		else ySpeed = 0
	}
}


function switchSide() {
	side = side == "blue" ? "red" : "blue"
	cameraTargetPos = side == "blue" ? vec3(0, 50, 50) : vec3(0, 50, -50)
	cameraTargetRot = side == "blue" ? quatMult(eulerToQuat(vec3(0, 1, 0), 0), eulerToQuat(vec3(1, 0, 0), 45)) : quatMult(eulerToQuat(vec3(0, 1, 0), 180), eulerToQuat(vec3(1, 0, 0), -45))
	currentCameraTime = 0;
}

class checkerPiece {
	constructor(startSquare, color, side, moveTime, cylinder) {
		this.model = new _Object({ pos: boardPieces[startSquare[0]][startSquare[1]]._transform.pos, rot: eulerToQuat(vec3(1, 0, 0), 0), scl: vec3(1, 1, 1) },
			[_DrawInfo(cylinder.index, [0], cylinder.texCoords, cylinder.normals, cylinder.tangents)], cylinder.points, [new _BasicMaterial(color)], _Bounds._SPHERE)
		this.square = startSquare
		this.isKing = false
		this.targetPos = this.model._transform.pos;
		this.currentTime = moveTime;
		this.moveTime = moveTime;
		this.side = side;
	}

	setTargetPos(pos) {
		this.targetPos = pos;
		this.prevPos = this.model._transform.pos;
		this.currentTime = 0;

	}

	update(delta) {
		if (this.currentTime < this.moveTime) {
			this.currentTime = clamp((this.currentTime += delta), 0, this.moveTime);

			//apply a curve in the y axis cuz why not
			this.model._transform.pos = mix(this.prevPos, this.targetPos, this.currentTime / this.moveTime);
		}
		else {

		}
	}

	king() {
		//this.model.drawInfo.push({ points: getCylinder(vec3(0, 0, 2), 1.5, 2, 10, 10), colorIndex: [0], type: gl.TRIANGLES })
		this.isKing = true
	}

	getMoves(multiHop) {

	}
}


function init() {
	new _AmbientLight(vec4(.2, .2, .2, 1), null)
	new _DirectionalLight({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(.5, .5, .5), 90), scl: vec3(1, 1, 1) }, vec4(1, 1, 1, 1), null)
	cameraBall = new _Object({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(1, 0, 0), 45), scl: vec3(1, 1, 1) }, [], [], [], _Bounds._SPHERE)

	_mainCamera._transform.pos = vec3(0, 50, -50)

	_mainCamera._attachSelfToParent(cameraBall, { pos: "keepWorld", rot: "relative", scl: "relative" })
	var c = _getCylinder(vec3(0,2,0),vec3((boardSize/16)*.5,1,(boardSize/16)*.5),20)
	var s = _getRect(vec3(0,0,0),[boardSize / 16, 1, boardSize / 16])
	for (var x = 0; x < 8; x++) {
		boardPieces.push([])
		boardState.push([])
		checkersPieces.push([])
		origBoardColors.push([])
		for (var y = 0; y < 8; y++)
			if ((x + y) % 2 == 0) {
				boardPieces[x].push(new _Object({ pos: vec3(((x / 8) * boardSize) - (boardSize / 2) + 4, 0, -(((y / 8) * boardSize) - (boardSize / 2) + 4)), rot: eulerToQuat(vec3(0, 1, 0), 0), scl: vec3(1, 1, 1) },
					[_DrawInfo(s.index, [0], s.texCoords, s.normals, s.tangents)], s.points, [new _BasicMaterial(vec4(1, 1, 1, 1))], _Bounds._RECT))
				origBoardColors[x].push(vec4(1, 1, 1, 1))
				boardState[x].push("none")
			}
			else {
				boardPieces[x].push(new _Object({ pos: vec3(((x / 8) * boardSize) - (boardSize / 2) + 4, 0, -(((y / 8) * boardSize) - (boardSize / 2) + 4)), rot: eulerToQuat(vec3(0, 1, 0), 0), scl: vec3(1, 1, 1) },
				[_DrawInfo(s.index, [0], s.texCoords, s.normals, s.tangents)], s.points, [new _BasicMaterial(vec4(.25, .25, .25, 1))], _Bounds._RECT))
				origBoardColors[x].push(vec4(.25, .25, .25, 1))
				boardState[x].push("none")
			}
	}

	for (var x = 0; x < 4; x++)
		for (var y = 0; y < 3; y++) {
			checkersPieces[x * 2 + (y % 2)][y] = new checkerPiece([x * 2 + (y % 2), y], vec4(0, 0, 1, 1), "blue", 500, c)
			checkersPieces[x * 2 + (1 - (y % 2))][7 - y] = new checkerPiece([x * 2 + (1 - (y % 2)), 7 - y], vec4(1, 0, 0, 1), "red", 500, c)
		}
}

window.onload = function () {
	this._engineInit("gl-canvas", init, userTick, userKeyEvent, userMouseEvent)
}

