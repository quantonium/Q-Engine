"use strict";

import { _initInputs, _tickUserInput } from "./userInput.js";
import {ScreenBuffer} from "./buffer.js"
import {Camera, getCameras} from "./primitives/camera.js"
import {Object, getObjects} from "./primitives/object.js"
import {getLights} from "./primitives/lights.js"
import {SolidColorNoLighting} from "./material.js"
import {ShaderProgram} from "./shaderProgram.js"
import { vec4, vec3, vec2 } from "./common/MVnew.js";
import { eulerToQuat } from "./common/helpers-and-types.js";
import { BoundsType } from "./bounds.js";


export class Engine {

	//if true, sets the viewport size to the canvas size every tick, in case the html element is resized
	setViewportSizeToCanvasSize = true;

	////DO-NOT-TOUCH VARIABLES (updated constantly in the engine)
	_time = 0;
	_id = 0;
	_requestId = 0;

	//If true, ticks; otherwise doesn't tick (ie game paused).
	//Todo: more advanced control for pre and post tick
	tickEnabled = true;
	//_offsetThreshold = 99; //Used to reduce array sizes created with flatten because otherwise JS will waste teime garbage collecting


	////ENGINE ELEMENTS- have been moved into their respective js files for organization


	////COLLISION VARIABLES
	_maskMap = []


	////DEFAULT RENDERING ELEMENTS
	_gl;
	_bData;

	//a reference to the canvas which the engine will render to
	canvas;
	
	//the main camera which the engine will render out of
	mainCamera;

	//the default shader program to render geometry
	_defaultProgram;

	//the default postprocess program to render the image with
	_postProcessProgram;


	////DEFAULT GAME OBJECTS
	_coords;


	////USER-DEFINED FUNCTIONS
	_userTickFunction = function(){}
	_userInitFunction = function(){}
	_userPostTickFunction = function(){}

	constructor(){
		
	}

	gl(){
		return Q._gl;
	}

	getDefaultBuffer(){
		return Q._bData;
	}

	time(){
		return Q._time
	}

	_render(time) {
		for (var i = 0; i < ScreenBuffer.getBuffers().length; i++)
			ScreenBuffer.getBuffers()[i]._beginRender();
		for (var i = 0; i < getCameras().length; i++)
			getCameras()[i]._pushToBuffers();
		for (var i = 0; i < ScreenBuffer.getBuffers().length; i++)
			ScreenBuffer.getBuffers()[i]._applyPostProcessToScene();

		Q._requestId = requestAnimationFrame(Q._render);
	}

	_queueNewTick(f) {
		setTimeout(f, 1, Date.now());
	}

	_postTickFunction(delta, time) {
		_userPostTickFunction(delta, time)
		getLights().forEach((o) => (o._postTick(delta, time)))
		getObjects().forEach((o) => (o._postTick(delta, time)))
		getCameras().forEach((o) => (o._postTick(delta, time)))
		if(Q.setViewportSizeToCanvasSize){
			Q._bData.viewportSize.x = Q.canvas.width
			Q._bData.viewportSize.y = Q.canvas.height
		}
	}

	_tick(prevTime) {
		var delta = Date.now() - prevTime;
		Q._time += delta;
		getLights().forEach((o) => (o._preTick(delta, Q._time)))
		getObjects().forEach((o) => (o._preTick(delta, Q._time)))
		getCameras().forEach((o) => (o._preTick(delta, Q._time)))
		_tickUserInput()
		if (Q._tickEnabled) {
			getLights().forEach((o) => (o._onTick(delta, Q._time)))
			getObjects().forEach((o) => (o._onTick(delta, Q._time)))
			getCameras().forEach((o) => (o._onTick(delta, Q._time)))
			Q._userTickFunction(delta, Q._time)
		}

		Q._consoleBufferLock = true
		var tmp = [...Q._consoleBuffer]
		Q._consoleBuffer = []
		var r = Q._removedMessages
		Q._removedMessages = 0
		Q._consoleBufferLock = false
		tmp.forEach(function (i) {
			console.log(i)
		})
		if (r > 0) console.log(r + " messages removed.\n")

		_postTickFunction(delta, Q._time)
		Q._queueNewTick(Q._tick);
	}

	_setDefaultGraphics(vertexPath, fragmentPath, postVertexPath, postFragmentPath) {
		//  Load shaders and initialize attribute buffers
		Q._defaultProgram = new ShaderProgram(Q._gl, vertexPath, fragmentPath);
		Q._postProcessProgram = new ShaderProgram(Q._gl, postVertexPath, postFragmentPath);

		Q._bData = new ScreenBuffer(Q._gl, Q._defaultProgram, Q._postProcessProgram, new vec2(Q.canvas.width, Q.canvas.height));

		Q._mainCamera = new Camera(Q._bData);

		Q._coords = new Object({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(1, 0, 0), 0), scl: vec3(1, 1, 1) }, [{
			pointIndex: [0, 1, 2, 3, 4, 5], matIndex: [0, 0, 1, 1, 2, 2], texCoords: [vec2(0, 0), vec2(1, 1), vec2(0, 0), vec2(1, 1), vec2(0, 0), vec2(1, 1)], type: Q._gl.LINES,
			normals: [vec3(-1, 0, 0), vec3(1, 0, 0), vec3(0, -1, 0), vec3(0, 1, 0), vec3(0, 0, -1), vec3(0, 0, 1)],
			tangents: [vec3(0, 1, 0), vec3(0, -1, 0), vec3(0, 0, 1), vec3(0, 0, -1), vec3(1, 0, 0), vec3(-1, 0, 0)], textureIndex: -1, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1
		}],
			[vec3(-1000000, 0, 0), vec3(1000000, 0, 0), vec3(0, -1000000, 0), vec3(0, 1000000, 0), vec3(0, 0, -1000000), vec3(0, 0, 1000000)],
			[new SolidColorNoLighting(vec4(1, 0, 0, 1)), new SolidColorNoLighting(vec4(0, 1, 0, 1)), new SolidColorNoLighting(vec4(0, 0, 1, 1))], BoundsType.RECT, [], true)
	}

	async _initDefaultGraphics(defaultCanvas, vertexPath, fragmentPath, postVertex, postFragment) {
		return new Promise((resolve, reject) => {

			Q.canvas = document.getElementById(defaultCanvas);
			var ratio = window.devicePixelRatio || 1;
			Q.canvas.width = ratio * Q.canvas.clientWidth;
			Q.canvas.height = ratio *Q.canvas.clientHeight;
			Q.canvas.addEventListener("webglcontextlost", function (event) {
				event.preventDefault();
				cancelAnimationFrame(Q._requestId);
				alert("WebGL context lost. Please reload the page.")
			}, false);
			/*Q.canvas.addEventListener("webglcontextrestored", function(event) {
				_setDefaultGraphics();
				Q._complexTextures.forEach((o) => {
					o._init();
				})
				_render();
			}, false);*/
			Q._gl = Q.canvas.getContext('webgl2');
			if (!Q._gl) {
				reject("WebGL 2.0 isn't available");
			}
			var warn = "";
			Q._setDefaultGraphics(vertexPath, fragmentPath, postVertex, postFragment);
			resolve();
		});
	}

	//Initializes the engine, run Q function first and foremost to start ticking
	engineInit(defaultCanvas, userInit, userTick, userKey = function (e) { }, userMouse = function (e) { }, defaultVertex = "../default-shaders/vertex.glsl", defaultFragment = "../default-shaders/fragment.glsl",
		defaultPostVertex = "../default-shaders/postprocess-vertex.glsl", defaultPostFragment = "../default-shaders/postprocess-fragment.glsl", userPostTick = function (delta, time) { }) {
		Q._userPostTickFunction = userPostTick;
		_initInputs(userKey, userMouse)
		Q._initDefaultGraphics(defaultCanvas, defaultVertex, defaultFragment, defaultPostVertex, defaultPostFragment)
			.then(() => {
				//delay initial running of code by 1s to allow stuff to load in
				//TODO: more dynamic wait to load
				
				Q._userInitFunction();
				setTimeout(function () {
					Q._queueNewTick(Q._tick);
				}, 100);
				Q._gl.flush();
				Q._render();

			}).bind(this)
			.catch((err) => { alert(err); console.error(err); })

	}
}

//Q is the default Engine, and should be only what you would need
//but if for some reason you want to make another Engine you can.
//Note that each engine initializes webgl on its own!
var Q = new Engine()

export default Q;

export function gl() {
	return Q._gl
}