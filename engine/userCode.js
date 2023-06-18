"use strict";

//default template for user code

function userTick(delta, time) {
}

function init() {
}

function userMouseEvent(e) {
	switch (e.type) {
		case "mousemove":

			break;
		case "mousedown":

			break;
		case "mouseup":
			
			break;
	}
}

function userKeyEvent(e) {
	switch (e.type) {
		case "keydown":

			break;
		case "keyup":

			break;
	}
}

window.onload = function () {
	this._engineInit("gl-canvas", init, userTick, userKeyEvent, userMouseEvent)
}