"use strict";

function _render(time) {
	for (var i = 0; i < _buffers.length; i++)
		_buffers[i]._beginRender();
	for (var i = 0; i < _cameras.length; i++)
		_cameras[i]._pushToBuffers();
	for (var i = 0; i < _buffers.length; i++)
		_buffers[i]._applyPostProcessToScene();

	_requestId = requestAnimationFrame(_render);
}

function _queueNewTick(f) {
	setTimeout(f, 1, Date.now());
}

function _postTickFunction(delta, time) {
	_userPostTickFunction(delta, time)
	_lights.forEach((o) => (o._postTick(delta, time)))
	_objects.forEach((o) => (o._postTick(delta, time)))
	_cameras.forEach((o) => (o._postTick(delta, time)))
}

function _tick(prevTime) {
	var delta = Date.now() - prevTime;
	_time += delta;
	var l = _keyBuffer.length
	for (var x = 0; x < l; x++)
		_userKeyFunction(_keyBuffer.shift())
	l = _mouseBuffer.length
	for (var x = 0; x < l; x++)
		_userMouseFunction(_mouseBuffer.shift())
	_lights.forEach((o) => (o._preTick(delta, _time)))
	_objects.forEach((o) => (o._preTick(delta, _time)))
	_cameras.forEach((o) => (o._preTick(delta, _time)))

	if (_tickEnabled) {
		_lights.forEach((o) => (o._onTick(delta, _time)))
		_objects.forEach((o) => (o._onTick(delta, _time)))
		_cameras.forEach((o) => (o._onTick(delta, _time)))
		_userTickFunction(delta, _time)
	}

	_consoleBufferLock = true
	var tmp = [..._consoleBuffer]
	_consoleBuffer = []
	var r = _removedMessages
	_removedMessages = 0
	_consoleBufferLock = false
	tmp.forEach(function (i) {
		console.log(i)
	})
	if (r > 0) console.log(r + " messages removed.\n")

	_postTickFunction(delta, _time)
	_queueNewTick(_tick);
}

function _setDefaultGraphics(vertexPath, fragmentPath, postVertexPath, postFragmentPath) {
	//  Load shaders and initialize attribute buffers
	_defaultProgram = new shaderProgram(_gl, vertexPath, fragmentPath);
	_postProcessProgram = new shaderProgram(_gl, postVertexPath, postFragmentPath);

	_bData = new _ScreenBuffer(_gl, _defaultProgram, _postProcessProgram);

	_mainCamera = new _Camera(_bData);

	_coords = new _Object({ pos: vec3(0, 0, 0), rot: eulerToQuat(vec3(1, 0, 0), 0), scl: vec3(1, 1, 1) }, [{
		pointIndex: [0, 1, 2, 3, 4, 5], matIndex: [0, 0, 1, 1, 2, 2], texCoords: [vec2(0, 0), vec2(1, 1), vec2(0, 0), vec2(1, 1), vec2(0, 0), vec2(1, 1)], type: _gl.LINES,
		normals: [vec3(-1, 0, 0), vec3(1, 0, 0), vec3(0, -1, 0), vec3(0, 1, 0), vec3(0, 0, -1), vec3(0, 0, 1)],
		tangents: [vec3(0, 1, 0), vec3(0, -1, 0), vec3(0, 0, 1), vec3(0, 0, -1), vec3(1, 0, 0), vec3(-1, 0, 0)], textureIndex: -1, bufferMask: 0x1, cameraMask: 0x1, lightMask: 0x1
	}],
		[vec3(-1000000, 0, 0), vec3(1000000, 0, 0), vec3(0, -1000000, 0), vec3(0, 1000000, 0), vec3(0, 0, -1000000), vec3(0, 0, 1000000)],
		[new _SolidColorNoLighting(vec4(1, 0, 0, 1)), new _SolidColorNoLighting(vec4(0, 1, 0, 1)), new _SolidColorNoLighting(vec4(0, 0, 1, 1))], _Bounds._RECT, [], true)
}

async function _initDefaultGraphics(defaultCanvas, vertexPath, fragmentPath, postVertex, postFragment) {
	return new Promise((resolve, reject) => {

		_canvas = document.getElementById(defaultCanvas);
		var ratio = window.devicePixelRatio || 1;
		_canvas.width = ratio * _canvas.clientWidth;
		_canvas.height = ratio * _canvas.clientHeight;
		_canvas.addEventListener("webglcontextlost", function (event) {
			event.preventDefault();
			cancelAnimationFrame(_requestId);
			alert("WebGL context lost. Please reload the page.")
		}, false);
		/*_canvas.addEventListener("webglcontextrestored", function(event) {
			_setDefaultGraphics();
			_complexTextures.forEach((o) => {
				o._init();
			})
			_render();
		}, false);*/
		_gl = _canvas.getContext('webgl2');
		if (!_gl) {
			reject("WebGL 2.0 isn't available");
		}
		var warn = "";
		_FLOATING_EXT = _gl.getExtension("OES_texture_float_linear");
		if (!_FLOATING_EXT) console.warn("Floating point textures unsupported! Postprocess buffers might have undesired effects!");
		_FLOATING_BUF_EXT = _gl.getExtension("EXT_color_buffer_float");
		if (!_FLOATING_BUF_EXT) console.warn("Floating point buffers unsupported! Postprocess buffers might have undesired effects!");
		_setDefaultGraphics(vertexPath, fragmentPath, postVertex, postFragment);
		resolve();
	});
}

function _engineInit(defaultCanvas, userInit, userTick, userKey = function (e) { }, userMouse = function (e) { }, defaultVertex = "../default-shaders/vertex.glsl", defaultFragment = "../default-shaders/fragment.glsl",
	defaultPostVertex = "../default-shaders/postprocess-vertex.glsl", defaultPostFragment = "../default-shaders/postprocess-fragment.glsl", userPostTick = function (delta, time) { }) {
	_userInitFunction = userInit
	_userTickFunction = userTick;
	_userKeyFunction = userKey;
	_userMouseFunction = userMouse;
	_userPostTickFunction = userPostTick;
	_initDefaultGraphics(defaultCanvas, defaultVertex, defaultFragment, defaultPostVertex, defaultPostFragment)
	.then(() => {
		//delay initial running of code by 1s to allow stuff to load in
		//TODO: more dynamic wait to load
		_userInitFunction();
		setTimeout(function () {
			_queueNewTick(_tick);
		}, 100);
		//_gl.flush();
		_render();
		
	})
	.catch((err) => {alert(err); console.error(err);})

}

