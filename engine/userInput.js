"use strict";

import {vec2, vec3, inverse, mult} from "./common/MVnew.js"

//userInput.js defines functions to assist with translating between screen input and the 3D world,
//and sets up key and mouse bindings to be used with the user defined functions.

////USER INPUT
_keyBuffer = [];
_mouseBuffer = []

//USER DEFINED INPUT FUNCTIONS
_userKeyFunction = function(e){}
_userMouseFunction = function(e){}

/**
 * gets mouse position relative to target canvas, in a scale of -1 to 1
 * @param {*} evt 
 * @param {*} target 
 */
export function getMousePos(evt, target) {
	var rect = target.getBoundingClientRect();
	//(rect)
	return vec2((evt.clientX - rect.right) / (rect.width / 2) + 1, -((evt.clientY - rect.top) / (rect.height / 2) - 1))
}

/**
 * 
 * @param {*} camera 
 * @param {*} pos vec2 from -1 to 1
 */
export function getScreenPosInWorldSpace(camera, pos) {
    var M = inverse(mult(camera.getProjMat(), camera.getViewMat()))

    var v = mult(M, vec4(
        pos[0],
        pos[1],
        1,
        1
    ));

    return vec3(v[0] / v[3], v[1] / v[3], -v[2] / v[3])

}

export function _initInputs(userKeyFunction, userMouseFunction){
	window.addEventListener("keyup", (e) => {
		_keyBuffer.push(e);
	})

	window.addEventListener("keydown", (e) => {
		_keyBuffer.push(e);
	})

	window.addEventListener("mouseup", (e) => {
		_mouseBuffer.push(e);
	})

	window.addEventListener("mousedown", (e) => {
		_mouseBuffer.push(e);
	})

	window.addEventListener("mousemove", (e) => {
		_mouseBuffer.push(e);
	})
	_userKeyFunction = userKeyFunction;
	_userMouseFunction = userMouseFunction;
}

export function _tickUserInput(){
	var l = this._keyBuffer.length
		for (var x = 0; x < l; x++)
			this._userKeyFunction(_keyBuffer.shift())
		l = this._mouseBuffer.length
		for (var x = 0; x < l; x++)
			this._userMouseFunction(_mouseBuffer.shift())
}