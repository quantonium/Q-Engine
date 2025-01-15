"use strict";

//Update this line to point to the location of engine.js.
//Q is an engine instance that is created on page load
//and which is shared across the files. There should be no
//reason to create a different engine instance.
import Q from "engine.js"

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
	Q._engineInit("gl-canvas", init, userTick, userKeyEvent, userMouseEvent)
}