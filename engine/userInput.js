"use strict";

/**
 * gets mouse position relative to target canvas, in a scale of -1 to 1
 * @param {*} evt 
 * @param {*} target 
 */
function _getMousePos(evt, target) {
	var rect = target.getBoundingClientRect();
	//(rect)
	return vec2((evt.clientX - rect.right) / (rect.width / 2) + 1, -((evt.clientY - rect.top) / (rect.height / 2) - 1))
}

/**
 * 
 * @param {*} camera 
 * @param {*} pos vec2 from -1 to 1
 */
function _getScreenPosInWorldSpace(camera, pos) {
    var M = inverse(mult(camera._getProjMat(), camera._getViewMat()))

    var v = mult(M, vec4(
        pos[0],
        pos[1],
        1,
        1
    ));

    return vec3(v[0] / v[3], v[1] / v[3], -v[2] / v[3])

}

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