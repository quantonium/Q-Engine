"use strict";

import {vec2, vec3, inverse, mult} from "./common/MVnew.js"

//userInput.js defines functions to assist with translating between screen input and the 3D world,
//and sets up key and mouse bindings to be used with the user defined functions.

/**
 * gets mouse position relative to target canvas, in a scale of -1 to 1
 * @param {*} evt 
 * @param {*} target 
 */
function getMousePos(evt, target) {
	var rect = target.getBoundingClientRect();
	//(rect)
	return vec2((evt.clientX - rect.right) / (rect.width / 2) + 1, -((evt.clientY - rect.top) / (rect.height / 2) - 1))
}

/**
 * 
 * @param {*} camera 
 * @param {*} pos vec2 from -1 to 1
 */
function getScreenPosInWorldSpace(camera, pos) {
    var M = inverse(mult(camera._getProjMat(), camera.getViewMat()))

    var v = mult(M, vec4(
        pos[0],
        pos[1],
        1,
        1
    ));

    return vec3(v[0] / v[3], v[1] / v[3], -v[2] / v[3])

}

function _initInputs(keyBuffer, mouseBuffer){
	window.addEventListener("keyup", (e) => {
		keyBuffer.push(e);
	})

	window.addEventListener("keydown", (e) => {
		keyBuffer.push(e);
	})

	window.addEventListener("mouseup", (e) => {
		mouseBuffer.push(e);
	})

	window.addEventListener("mousedown", (e) => {
		mouseBuffer.push(e);
	})

	window.addEventListener("mousemove", (e) => {
		mouseBuffer.push(e);
	})
}