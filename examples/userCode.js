"use strict";

import Q from "../engine/engine.js"
import {mult, vec3, vec4} from "../engine/common/MVnew.js"
import {eulerToQuat, right, addRotation, fastNorm} from "../engine/common/helpers-and-types.js"
import { getMousePos } from "../engine/userInput.js";
import { AmbientLight, PointLight, DirectionalLight } from "../engine/primitives/lights.js";
import {Camera} from "../engine/primitives/camera.js"
import { BasicMaterial, Material } from "../engine/material.js";
import { Object } from "../engine/primitives/object.js";
import { getRect, getCylinder, getSphere, addToPointIndArr, mergePointArrs } from "../engine/geometry.js";
import { BoundsType } from "../engine/bounds.js";

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

let mainCamera;

function switchCamera() {
	if (mainCamera.enabled) {
		mainCamera.enabled = false
		altCamera.enabled = true
	} else {
		mainCamera.enabled = true
		altCamera.enabled = false
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
				if (mainCamera.enabled) {
					mainCamera.transform.rot = addRotation(mainCamera.transform.rot, eulerToQuat(vec3(0, 1, 0), -xSpeed))
					mainCamera.transform.rot = addRotation(mainCamera.transform.rot, eulerToQuat(right(mainCamera.transform.rot), ySpeed))
				}
				else {
					altCamera.transform.rot = addRotation(altCamera.transform.rot, eulerToQuat(vec3(0, 1, 0), -xSpeed))
					altCamera.transform.rot = addRotation(altCamera.transform.rot, eulerToQuat(right(altCamera.transform.rot), ySpeed))
				}
				Q.canvas.requestPointerLock();
				pointerLocked = true;
			}
			break;
		case "mousedown":
			if (e.button == 0) {
				var pos = getMousePos(e, Q.canvas)
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

					var pos = getMousePos(e, Q.canvas)
					if (pos[0] > -1 && pos[0] < 1 && pos[1] > -1 && pos[1] < 1) {
						//var M = mult(mainCamera.getProjMat(), mainCamera.getViewMat())
						mainCamera.clearDebug()
						//var mousePos = getScreenPosInWorldSpace(mainCamera, pos)
						//var intersect = linearIntersect(getPlane(vec3(0, 1, 0), vec3(1, 1, 0), vec3(1, 1, 1), fastNorm), [mousePos, mainCamera.getWorldTransform().pos])
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
	directLight.transform.rot = addRotation(directLight.transform.rot, eulerToQuat(vec3(0, 1, 0), delta * .1))
	for (var i = 0; i < keys.length; i++)
		if (keys[i]) {
			if (mainCamera.enabled) {
				var d = vec3(0,0,0)
				var f = forward(mainCamera.transform.rot), r = right(mainCamera.transform.rot)
				if ((i == 87) || (i == 119)) {//w
					var n = add(mainCamera.transform.pos, mult(.01 * delta, fastNorm(vec3(f[0], 0, f[2]))))
						mainCamera.transform.pos = n
				}

				if ((i == 65) || (i == 97)) {//a
					var n = add(mainCamera.transform.pos, mult(-.01 * delta, fastNorm(vec3(r[0], 0, r[2]))))
						mainCamera.transform.pos = n
				}

				if ((i == 83) || (i == 115)) {//s
					var n = add(mainCamera.transform.pos, mult(-.01 * delta, fastNorm(vec3(f[0], 0, f[2]))))
						mainCamera.transform.pos = n
				}

				if ((i == 68) || (i == 100)) {//d
					var n = add(mainCamera.transform.pos, mult(.01 * delta, fastNorm(vec3(r[0], 0, r[2]))))
						mainCamera.transform.pos = n
				}
			}
			else {
				if ((i == 87) || (i == 119)) //w
					altCamera.transform.pos = add(altCamera.transform.pos, mult(.01 * delta, forward(altCamera.transform.rot)))

				if ((i == 65) || (i == 97))//a
					altCamera.transform.pos = add(altCamera.transform.pos, mult(-.01 * delta, right(altCamera.transform.rot)))
				if ((i == 83) || (i == 115))//s
					altCamera.transform.pos = add(altCamera.transform.pos, mult(-.01 * delta, forward(altCamera.transform.rot)))

				if ((i == 68) || (i == 100))//d
					altCamera.transform.pos = add(altCamera.transform.pos, mult(.01 * delta, right(altCamera.transform.rot)))
				if ((i == 81))//q
					altCamera.transform.pos = add(altCamera.transform.pos, mult(-.01 * delta, up(altCamera.transform.rot)))

				if ((i == 69))//e
					altCamera.transform.pos = add(altCamera.transform.pos, mult(.01 * delta, up(altCamera.transform.rot)))
			}



			if (i == 27) {//escape
				document.exitPointerLock();
				pointerLocked = false;
				mouseReleased = true
				mouseMove = false
			}
		}

	/*if(!pointerLocked){
		mainCamera.transform.rot = addRotation(mainCamera.transform.rot, eulerToQuat(vec3(0, 1, 0), -xSpeed))
		mainCamera.transform.rot = addRotation(mainCamera.transform.rot, eulerToQuat(right(mainCamera.transform.rot), ySpeed))
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
	altCamera = new Camera(Q.getDefaultBuffer(), vec3(0, 20, 0), eulerToQuat(vec3(1, 0, 0), 90), vec3(1, 1, 1))
	altCamera.enabled = false
	mainCamera = Q.mainCamera
	mainCamera.transform.pos = vec3(0, 1, 0)
	new AmbientLight(vec4(1, 0, 0, 1), null)
	directLight = new DirectionalLight({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(.5, .5, .5), 90), scl: vec3(1, 1, 1) }, vec4(0, 0, 1, 1), null)
	var playerLight = new PointLight({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(1, 0, 0), 0), scl: vec3(1, 1, 1) }, vec4(0, 1, 0, 1), null, 10)
	mainCamera.attachChildToSelf(playerLight, "relative")
	altCamera.renderEngine = false
	var tmp = getRect(vec3(0, 0, 0), vec3(100, 0, 100))
	new Object({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(0, 0, 1), 0), scl: vec3(1, 1, 1) }, [
		{ pointIndex: tmp.index, matIndex: 
			[1, 1, 1, 1, 1, 1,//bottom
			0, 0, 0, 0, 0, 0, //top
			1, 1, 1, 1, 1, 1,
			1, 1, 1, 1, 1, 1,
			1, 1, 1, 1, 1, 1,
			1, 1, 1, 1, 1, 1], texCoords: tmp.texCoords, type: Q.gl().TRIANGLES, normals: tmp.normals, tangents: tmp.tangents, textureIndex: -1}]
		, tmp.points, [new Material(), new Material(-1)], BoundsType.RECT)
	var cube = getRect(vec3(-10,0,0),vec3(1,1,1))
	var sphere = getSphere(vec3(0,0,0),vec3(1,1,1),10,10)
	var sphereArr = addToPointIndArr(sphere.index, cube.points.length)
	var cylinder = getCylinder(vec3(10,0,0),vec3(1,1,1),10)
	var cylinderArr = addToPointIndArr(cylinder.index, cube.points.length+sphere.points.length)
	var points = mergePointArrs(mergePointArrs(cube.points, sphere.points), cylinder.points)
	var t = new Object({pos: vec3(0, 1, 10), rot: eulerToQuat(vec3(0,0,1),0),scl: vec3(1,1,1)}, [{pointIndex: cube.index, matIndex: [0], texCoords: cube.texCoords,
	type: Q.gl().TRIANGLES, normals: cube.normals, tangents: cube.tangents, textureIndex: -1}, {pointIndex: sphereArr, matIndex: [0], texCoords: sphere.texCoords,
	type: Q.gl().TRIANGLES, normals: sphere.normals, tangents: sphere.tangents, textureIndex: -1}, {pointIndex: cylinderArr, matIndex: [0], texCoords: cylinder.texCoords,
	type: Q.gl().TRIANGLES, normals: cylinder.normals, tangents: cylinder.tangents, textureIndex: -1}], points, [new BasicMaterial()], BoundsType.RECT, [])

	var s = getRect(vec3(0, 0, 0), vec3(.5,.5,.5))
	var x = new Object({pos: vec3(0, 1, 0), rot: eulerToQuat(vec3(0,0,1),0),scl: vec3(1,1,1)},[{pointIndex: s.index, matIndex: [0], texCoords: s.texCoords, 
	type: Q.gl().TRIANGLES, normals: s.normals, tangents: s.tangents, textureIndex: -1}], s.points, [new BasicMaterial()], BoundsType.RECT, [])
	x.attachSelfToParent(t, {pos: "noChange", rot: "noChange", scl: "noChange"})
	t._customTickFunc = function(d, t) {this.transform.rot = addRotation(this.transform.rot, eulerToQuat(vec3(1,0,0), d*.01))}.bind(t)
	var testLight = new PointLight({pos: vec3(0,-1,0),rot:eulerToQuat(vec3(1,0,0),0),scl: vec3(1,1,1)}, vec4(1,1,1,1),null,10)
	testLight.attachSelfToParent(t, {pos: "noChange", rot: "noChange", scl: "noChange"})
}

window.onload = function () {
	Q.engineInit("gl-canvas", init, userTick, userKeyEvent, userMouseEvent)
}