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

class Engine {
	//default engine aspect ratio
	//todo: obsolete this in favor of getting the canvas aspect ratio?
	defaultAspect = 16 / 9

	//max light count to be supported by this engine instance
	maxLightCount = 16 //NOTE: THIS VALUE MUST MATCH THE SIZE OF THE LIGHT ARRAYS IN THE SHADERS

	_fisqrt = {y: new Float32Array( 1 ), i: null}
	////DO-NOT-TOUCH VARIABLES (updated constantly in the engine)
	_time = 0;
	_id = 0;
	_requestId = 0;

	//If true, ticks; otherwise doesn't tick (ie game paused).
	//Todo: more advanced control for pre and post tick
	tickEnabled = true;
	//_offsetThreshold = 99; //Used to reduce array sizes created with flatten because otherwise JS will waste teime garbage collecting


	////ENGINE ELEMENTS- have been moved into their respective js files for organization

	//WEBGL EXTENSIONS
	_FLOATING_EXT;
	_FLOATING_BUF_EXT;


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
		this._fisqrt.i = new Int32Array( this._fisqrt.y.buffer )
	}

	gl(){
		return this._gl;
	}

	getDefaultBuffer(){
		return this._bData;
	}

	time(){
		return this._time
	}

	_render(time) {
		for (var i = 0; i < ScreenBuffer.getBuffers().length; i++)
			ScreenBuffer.getBuffers()[i]._beginRender();
		for (var i = 0; i < getCameras().length; i++)
			getCameras()[i]._pushToBuffers();
		for (var i = 0; i < ScreenBuffer.getBuffers().length; i++)
			ScreenBuffer.getBuffers()[i]._applyPostProcessToScene();

		this._requestId = requestAnimationFrame(this._render);
	}

	_queueNewTick(f) {
		setTimeout(f, 1, Date.now());
	}

	_postTickFunction(delta, time) {
		_userPostTickFunction(delta, time)
		getLights().forEach((o) => (o._postTick(delta, time)))
		getObjects().forEach((o) => (o._postTick(delta, time)))
		getCameras().forEach((o) => (o._postTick(delta, time)))
	}

	_tick(prevTime) {
		var delta = Date.now() - prevTime;
		this._time += delta;
		getLights().forEach((o) => (o._preTick(delta, this._time)))
		getObjects().forEach((o) => (o._preTick(delta, this._time)))
		getCameras().forEach((o) => (o._preTick(delta, this._time)))
		_tickUserInput()
		if (this._tickEnabled) {
			getLights().forEach((o) => (o._onTick(delta, this._time)))
			getObjects().forEach((o) => (o._onTick(delta, this._time)))
			getCameras().forEach((o) => (o._onTick(delta, this._time)))
			this._userTickFunction(delta, this._time)
		}

		this._consoleBufferLock = true
		var tmp = [...this._consoleBuffer]
		this._consoleBuffer = []
		var r = this._removedMessages
		this._removedMessages = 0
		this._consoleBufferLock = false
		tmp.forEach(function (i) {
			console.log(i)
		})
		if (r > 0) console.log(r + " messages removed.\n")

		_postTickFunction(delta, this._time)
		this._queueNewTick(this._tick);
	}

	_setDefaultGraphics(vertexPath, fragmentPath, postVertexPath, postFragmentPath) {
		//  Load shaders and initialize attribute buffers
		this._defaultProgram = new ShaderProgram(this._gl, vertexPath, fragmentPath);
		this._postProcessProgram = new ShaderProgram(this._gl, postVertexPath, postFragmentPath);

		this._bData = new ScreenBuffer(this._gl, this._defaultProgram, this._postProcessProgram);

		this._mainCamera = new Camera(this._bData);

		this._coords = new Object({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(1, 0, 0), 0), scl: vec3(1, 1, 1) }, [{
			pointIndex: [0, 1, 2, 3, 4, 5], matIndex: [0, 0, 1, 1, 2, 2], texCoords: [vec2(0, 0), vec2(1, 1), vec2(0, 0), vec2(1, 1), vec2(0, 0), vec2(1, 1)], type: this._gl.LINES,
			normals: [vec3(-1, 0, 0), vec3(1, 0, 0), vec3(0, -1, 0), vec3(0, 1, 0), vec3(0, 0, -1), vec3(0, 0, 1)],
			tangents: [vec3(0, 1, 0), vec3(0, -1, 0), vec3(0, 0, 1), vec3(0, 0, -1), vec3(1, 0, 0), vec3(-1, 0, 0)], textureIndex: -1, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1
		}],
			[vec3(-1000000, 0, 0), vec3(1000000, 0, 0), vec3(0, -1000000, 0), vec3(0, 1000000, 0), vec3(0, 0, -1000000), vec3(0, 0, 1000000)],
			[new SolidColorNoLighting(vec4(1, 0, 0, 1)), new SolidColorNoLighting(vec4(0, 1, 0, 1)), new SolidColorNoLighting(vec4(0, 0, 1, 1))], BoundsType.RECT, [], true)
	}

	async _initDefaultGraphics(defaultCanvas, vertexPath, fragmentPath, postVertex, postFragment) {
		return new Promise((resolve, reject) => {

			this.canvas = document.getElementById(defaultCanvas);
			var ratio = window.devicePixelRatio || 1;
			this.canvas.width = ratio * this.canvas.clientWidth;
			this.canvas.height = ratio *this.canvas.clientHeight;
			this.canvas.addEventListener("webglcontextlost", function (event) {
				event.preventDefault();
				cancelAnimationFrame(this._requestId);
				alert("WebGL context lost. Please reload the page.")
			}, false);
			/*this.canvas.addEventListener("webglcontextrestored", function(event) {
				_setDefaultGraphics();
				this._complexTextures.forEach((o) => {
					o._init();
				})
				_render();
			}, false);*/
			this._gl = this.canvas.getContext('webgl2');
			if (!this._gl) {
				reject("WebGL 2.0 isn't available");
			}
			var warn = "";
			this._FLOATING_EXT = this._gl.getExtension("OES_texture_float_linear");
			if (!this._FLOATING_EXT) console.warn("Floating point textures unsupported! Postprocess buffers might have undesired effects!");
			this._FLOATING_BUF_EXT = this._gl.getExtension("EXT_color_buffer_float");
			if (!this._FLOATING_BUF_EXT) console.warn("Floating point buffers unsupported! Postprocess buffers might have undesired effects!");
			this._setDefaultGraphics(vertexPath, fragmentPath, postVertex, postFragment);
			resolve();
		});
	}

	//Initializes the engine, run this function first and foremost to start ticking
	engineInit(defaultCanvas, userInit, userTick, userKey = function (e) { }, userMouse = function (e) { }, defaultVertex = "../default-shaders/vertex.glsl", defaultFragment = "../default-shaders/fragment.glsl",
		defaultPostVertex = "../default-shaders/postprocess-vertex.glsl", defaultPostFragment = "../default-shaders/postprocess-fragment.glsl", userPostTick = function (delta, time) { }) {
		this._userPostTickFunction = userPostTick;
		_initInputs(userKey, userMouse)
		this._initDefaultGraphics(defaultCanvas, defaultVertex, defaultFragment, defaultPostVertex, defaultPostFragment)
			.then(() => {
				//delay initial running of code by 1s to allow stuff to load in
				//TODO: more dynamic wait to load
				
				this._userInitFunction();
				setTimeout(function () {
					this._queueNewTick(this._tick);
				}, 100);
				this._gl.flush();
				this._render();

			})
			.catch((err) => { alert(err); console.error(err); })

	}
}
var Q = new Engine()

export default Q;

export function gl() {
	return Q._gl
}