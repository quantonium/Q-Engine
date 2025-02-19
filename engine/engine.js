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
import { _bufferedConsoleTick } from "./console.js";
import { ShaderProgramStorage } from "./shaderProgramStorage.js";


export class Engine {

	//maps wgl context to the corresponding engine
	static engines = new Map()

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
	shaderStorage

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

		this._requestId = requestAnimationFrame(this._render.bind(this))
	}

	_queueNewTick(f) {
		setTimeout(f.bind(this), 1, Date.now());
	}

	_postTickFunction(delta, time) {
		this._userPostTickFunction(delta, time)
		getLights().forEach((o) => (o._postTick(delta, time)))
		getObjects().forEach((o) => (o._postTick(delta, time)))
		getCameras().forEach((o) => (o._postTick(delta, time)))
		if(this.setViewportSizeToCanvasSize){
			this._bData.viewportSize.x = this.canvas.width
			this._bData.viewportSize.y = this.canvas.height
		}
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
		_bufferedConsoleTick()

		this._postTickFunction(delta, this._time)
		this._queueNewTick(this._tick);
	}

	_setDefaultGraphics(vertexPath, fragmentPath, postVertexPath, postFragmentPath) {
		//  Load shaders and initialize attribute buffers
		

		this._bData = new ScreenBuffer(this._gl, this._defaultProgram, this._postProcessProgram, new vec2(this.canvas.width, this.canvas.height));

		this.mainCamera = new Camera(this._bData);

		this._coords = new Object({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(1, 0, 0), 0), scl: vec3(1, 1, 1) }, [{
			pointIndex: [0, 1, 2, 3, 4, 5], matIndex: [0, 0, 1, 1, 2, 2], texCoords: [vec2(0, 0), vec2(1, 1), vec2(0, 0), vec2(1, 1), vec2(0, 0), vec2(1, 1)], type: this._gl.LINES,
			normals: [vec3(-1, 0, 0), vec3(1, 0, 0), vec3(0, -1, 0), vec3(0, 1, 0), vec3(0, 0, -1), vec3(0, 0, 1)],
			tangents: [vec3(0, 1, 0), vec3(0, -1, 0), vec3(0, 0, 1), vec3(0, 0, -1), vec3(1, 0, 0), vec3(-1, 0, 0)], textureIndex: -1, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1
		}],
			[vec3(-1000000, 0, 0), vec3(1000000, 0, 0), vec3(0, -1000000, 0), vec3(0, 1000000, 0), vec3(0, 0, -1000000), vec3(0, 0, 1000000)],
			[new SolidColorNoLighting(this.shaderStorage, vec4(1, 0, 0, 1)), new SolidColorNoLighting(this.shaderStorage, vec4(0, 1, 0, 1)), new SolidColorNoLighting(this.shaderStorage, vec4(0, 0, 1, 1))], BoundsType.RECT, [], true)
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
				reject("WebGL 2.0 isn't available").bind(this);
			}
			Engine.engines.set(this._gl, this)
			this.shaderStorage = new ShaderProgramStorage(this._gl, vertexPath, fragmentPath)
			this.shaderStorage.addProgram(postVertexPath, postFragmentPath)
			var warn = "";
			this._setDefaultGraphics(vertexPath, fragmentPath, postVertex, postFragment);
			resolve().bind(this);
		});
	}

	//Initializes the engine, run Q function first and foremost to start ticking
	engineInit(defaultCanvas, userInit, userTick, userKey = function (e) { }, userMouse = function (e) { }, defaultVertex = "../default-shaders/vertex.glsl", defaultFragment = "../default-shaders/fragment.glsl",
		defaultPostVertex = "../default-shaders/postprocess-vertex.glsl", defaultPostFragment = "../default-shaders/postprocess-fragment.glsl", userPostTick = function (delta, time) { }) {
		this._userPostTickFunction = userPostTick;
		this._userTickFunction = userTick;
		this._userInitFunction = userInit;
		_initInputs(userKey, userMouse)
		this._initDefaultGraphics(defaultCanvas, defaultVertex, defaultFragment, defaultPostVertex, defaultPostFragment)
			.then(() => {
				//delay initial running of code by 1s to allow stuff to load in
				//TODO: more dynamic wait to load
				
				this._userInitFunction();
				setTimeout(function () {
					this._queueNewTick(this._tick);
				}.bind(this), 100);
				this._gl.flush();
				this._render();

			})
			.catch((err) => { alert(err); console.error(err); })
	}

	//shuts down an engine, cleaning up its shaderprogramstorage object
	shutdown(){

		Engine.engines.delete(this)
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