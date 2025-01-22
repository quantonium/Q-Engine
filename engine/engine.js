"use strict";

import * as Input from "userInput.js"
import Buffer from "buffer.js"
import Camera from "camera.js"
import * as Cameras from "camera.js"
import Object from "object.js"
import * as Lights from "primitives/lights.js"
import * as Material from "material.js"
import * as ShaderProgram from "shaderProgram.js"

class engine {
	_defaultAspect = 16 / 9
	_maxLightCount = 16 //NOTE: THIS VALUE MUST MATCH THE SIZE OF THE LIGHT ARRAYS IN THE SHADERS
	_fisqrt = {y: new Float32Array( 1 ), i: null}
	////DO-NOT-TOUCH VARIABLES (updated constantly in the engine)
	_time = 0;
	_id = 0;
	_requestId = 0;
	_tickEnabled = true;
	//_offsetThreshold = 99; //Used to reduce array sizes created with flatten because otherwise JS will waste teime garbage collecting


	////USER INPUT
	_keyBuffer = [];
	_mouseBuffer = []


	////ENGINE ELEMENTS- have been moved into their respective js files for organization

	//WEBGL EXTENSIONS
	_FLOATING_EXT;
	_FLOATING_BUF_EXT;


	////COLLISION VARIABLES
	_maskMap = []


	////DEFAULT RENDERING ELEMENTS
	_gl;
	canvas;
	_bData;
	mainCamera;
	_defaultProgram;
	_postProcessProgram;


	////DEFAULT GAME OBJECTS
	_coords;


	////DEBUG CONSOLE VARS
	_consoleBuffer = []
	_consoleBufferLock = false
	_removedMessages = 0
	_maxConsoleBuffer = 1000


	////USER-DEFINED FUNCTIONS
	_userTickFunction = function(){}
	_userInitFunction = function(){}
	_userPostTickFunction = function(){}
	_userKeyFunction = function(){}
	_userMouseFunction = function(){}

	constructor(){
		this._fisqrt.i = new Int32Array( this._fisqrt.y.buffer )
	}

	_render(time) {
		for (var i = 0; i < this._buffers.length; i++)
			this._buffers[i]._beginRender();
		for (var i = 0; i < this._cameras.length; i++)
			Cameras._cameras[i]._pushToBuffers();
		for (var i = 0; i < this._buffers.length; i++)
			this._buffers[i]._applyPostProcessToScene();

		this._requestId = requestAnimationFrame(this._render);
	}

	_queueNewTick(f) {
		setTimeout(f, 1, Date.now());
	}

	_postTickFunction(delta, time) {
		_userPostTickFunction(delta, time)
		Lights.lights.forEach((o) => (o._postTick(delta, time)))
		this.Objects.forEach((o) => (o._postTick(delta, time)))
		Cameras.cameras.forEach((o) => (o._postTick(delta, time)))
	}

	_tick(prevTime) {
		var delta = Date.now() - prevTime;
		this._time += delta;
		var l = this._keyBuffer.length
		for (var x = 0; x < l; x++)
			this._userKeyFunction(this._keyBuffer.shift())
		l = this._mouseBuffer.length
		for (var x = 0; x < l; x++)
			this._userMouseFunction(this._mouseBuffer.shift())
		Lights._lights.forEach((o) => (o._preTick(delta, this._time)))
		this.Objects.forEach((o) => (o._preTick(delta, this._time)))
		Cameras._cameras.forEach((o) => (o._preTick(delta, this._time)))

		if (this._tickEnabled) {
			Lights._lights.forEach((o) => (o._onTick(delta, this._time)))
			this.Objects.forEach((o) => (o._onTick(delta, this._time)))
			Cameras._cameras.forEach((o) => (o._onTick(delta, this._time)))
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
		this._defaultProgram = new ShaderProgram.shaderProgram(this._gl, vertexPath, fragmentPath);
		this._postProcessProgram = new ShaderProgram.shaderProgram(this._gl, postVertexPath, postFragmentPath);

		this._bData = new Buffer._ScreenBuffer(this._gl, this._defaultProgram, this._postProcessProgram);

		this._mainCamera = new Camera._Camera(this._bData);

		this._coords = new Object({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(1, 0, 0), 0), scl: vec3(1, 1, 1) }, [{
			pointIndex: [0, 1, 2, 3, 4, 5], matIndex: [0, 0, 1, 1, 2, 2], texCoords: [vec2(0, 0), vec2(1, 1), vec2(0, 0), vec2(1, 1), vec2(0, 0), vec2(1, 1)], type: this._gl.LINES,
			normals: [vec3(-1, 0, 0), vec3(1, 0, 0), vec3(0, -1, 0), vec3(0, 1, 0), vec3(0, 0, -1), vec3(0, 0, 1)],
			tangents: [vec3(0, 1, 0), vec3(0, -1, 0), vec3(0, 0, 1), vec3(0, 0, -1), vec3(1, 0, 0), vec3(-1, 0, 0)], textureIndex: -1, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1
		}],
			[vec3(-1000000, 0, 0), vec3(1000000, 0, 0), vec3(0, -1000000, 0), vec3(0, 1000000, 0), vec3(0, 0, -1000000), vec3(0, 0, 1000000)],
			[new Material._SolidColorNoLighting(vec4(1, 0, 0, 1)), new Material._SolidColorNoLighting(vec4(0, 1, 0, 1)), new Material._SolidColorNoLighting(vec4(0, 0, 1, 1))], this._bounds._RECT, [], true)
	}
f
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
		this._userInitFunction = userInit
		this._userTickFunction = userTick;
		this._userKeyFunction = userKey;
		this._userMouseFunction = userMouse;
		this._userPostTickFunction = userPostTick;
		Input._initInputs(this._keyBuffer, this._mouseBuffer)
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
var Q = new engine()

export default Q;