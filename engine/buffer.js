"use strict"

import { vec4, vec2 } from "./common/MVnew.js";

/**
 * An attribute location for a given buffer, mapping name to wgl location
 */
class _bufferSet {
	buffer; //WebGL buffer
	inputAttribute; //attrib location
	locationName; //string

	constructor(locationName, gTarget = null, shaderProgram = null, defaultViewportSize = vec2(1280,720)){
		this.locationName = locationName;
		this.viewportSize = defaultViewportSize
		if(gTarget != null && shaderProgram != null)
			this.setupBuffer(gTarget, shaderProgram, true)
	}

	/**
	 * Set up a new buffer for an attribute, if possible. Creates
	 * TODO: @params
	 */
	 setupBuffer(gTarget, shaderProgram, createNewBuffer = false){
		if(this.locationName != null){
			if(createNewBuffer) this.buffer = gTarget.createBuffer();
			this.inputAttribute = gTarget.getAttribLocation(shaderProgram.program, this.locationName);
			if(this.inputAttribute == -1) alert(this.locationName + ": unknown/invalid shader location");
		}
	}

	isValid(){
		return this.locationName != null && this.inputAttribute != -1;
	}

	loadBufferData(gTarget, bufferType, drawType, data, size, type, normalized=false, stride=0, offset=0){
		if (this.isValid()) {
			gTarget.bindBuffer(bufferType, this.buffer);
			gTarget.bufferData(bufferType, data, drawType);
			gTarget.vertexAttribPointer(this.inputAttribute, size, type, normalized, stride, offset);
			gTarget.enableVertexAttribArray(this.inputAttribute);
		}
	}
}

/**
 * A shader uniform location for a given buffer, mapping name to wgl location
 */
class _uniformLocation {
	location;
	name;
	constructor(uniformName, gTarget, shaderProgram){
		this.setLocation(gTarget, shaderProgram, uniformName)
	}

	setLocation(gTarget, shaderProgram, uniformName = null){
		if(uniformName != null) this.name = uniformName;
		if (this.name != null) {
			this.location = gTarget.getUniformLocation(shaderProgram.program, this.name);
			if (this.location == -1) alert(this.name + ": unknown/invalid shader location");
		}
	}

	isValid(){
		return this.name != null && this.location != -1
	}
}

/**
 * buffer representing all data necessary for any output buffer/view
 * A buffer can swap shader programs but expects the shader support all the standard inputs/outputs.
 * In most cases, it is unnecessary to create your own buffer as the default buffer provides rendering and postprocess.
 */
export class ScreenBuffer {
	static _buffers = [];

	static getBuffers() {
		return ScreenBuffer._buffers
	}

	_matParams = []
	_matIndicies = []
	_points = []
	_types = [];
	_offsets = [];
	_texCoords = []
	_normals = []
	_bitangents = [] //NOTE: default shader calculates bitangents
	_tangents = []

	_posBuffer;
	_normBuf;
	_txBuf;
	_tanBuf;
	_biTanBuf;
	_matParamsBufs = [];
	_matIndBuf;

	_inMatIndex
	_inMatParams = [];

	_projMatrix;
	_viewMatrix;
	_normalMatrix;
	_modelMatrix;
	_lightTypeArrayLoc = [];
	_lightLocArrayLoc = [];
	_lightDirArrayLoc = [];
	_lightAngleArrayLoc = [];
	_lightColorArrayLoc = [];
	_lightDiffArrayLoc = [];
	_lightSpecArrayLoc = [];
	_lightShinyArrayLoc = [];
	_lightAttenArrayLoc = [];
	_lightNegativeArrayLoc = [];
	_lightAltNegativeArrayLoc = []
	_lightIndLoc;
	_cameraPosLoc;
	_textureLoc = []
	_cameraSclLoc;
	
	//Current 3D ShaderProgram that this buffer will use to render.
	//Set to null to disable
	currentProgram = null;

	//Current postprocess ShaderProgram that this buffer will use to render.
	//Set to null to disable (will not output to display!)
	postProcessProgram = null;

	//the actual active program
	_activeProgram = null;

	_bufLimit;
	_matParamCount = 0;
	_texCount = 0;
	_postTexCount = 0;
	_bufferMask = 0x1;
	_setup = false;
	_clearColor;

	_outImages = [];
	_postImageLoc = [];
	_postIn = [];
	_postPosBuf;
	_outBuffer;
	_depthBuffer;
	_inSetup = false;

	_drawBuffers = [];

	//WEBGL EXTENSIONS
	_FLOATING_EXT;
	_FLOATING_BUF_EXT;

	//Modify this value as needed to alter the size of the buffer viewport.
	viewportSize = new vec2(1280,720)

	_setupInfo = {
		coordStr: null, matStr: null, matParamCount: null, matIndStr: null, texStr: null, texCount: null, postTexStr: null, postTexCount: null, projMatrixStr: null,
		viewMatrixStr: null, normalMatrixStr: null, modelMatrixStr: null, lightsArrayStr: null, lightsIndexStr: null,
		normalStr: null, tanStr: null, biTanStr: null, texCoordStr: null, cameraPosStr: null, cameraScaleStr: null,
		customSetupFunction: null
	}

	_customClearFunction = (gTarget, program) => { }
	_customBeginRenderFunction = (gTarget, program) => { }
	_customPreRenderFunction = (gTarget, program) => { }
	_customRenderFunction = (gTarget, program) => { }
	_customPostRenderFunction = (gTarget, program) => { }

	_getUniform(loc) {
		return this._gTarget.getUniform(this._program, loc)
	}

	constructor(gTarget, program, postProcessProgram, clearColor = vec4(0, 0, 0, 1),
		coordStr = "inPointsL", matStr = "inMatProp", matParamCount = 7, matIndStr = "inMatIndex",
		texStr = ["baseImage", "normalMap", "depthMap", "diffuseMap", "specularMap", "emissiveImage"],
		texCount = 6, postTexStr =
			["scene", "depth", "normal", "position", "color", "diffuse", "specular", "emissive"],
		postTexCount = 8, projMatrixStr = "projMatrix", viewMatrixStr = "viewMatrix", normalMatrixStr = "normalMatrix",
		modelMatrixStr = "modelMatrix", lightsArrayStr = "lights", lightsIndexStr = "maxLightIndex",
		normalStr = "inNormalL", tanStr = "inTangentL", biTanStr = null, texCoordStr = "inTexCoord",
		cameraPosStr = "inCameraPosW", cameraScaleStr = "inCameraScale", customSetupFunction = function (gTarget, program) { },
		bufferMask = 0x1) {

			this._gTarget = gTarget;

		this._FLOATING_EXT = this._gTarget.getExtension("OES_texture_float_linear");
		if (!this._FLOATING_EXT) console.warn("Floating point textures unsupported! Postprocess buffers might have undesired effects!");
		this._FLOATING_BUF_EXT = this._gTarget.getExtension("EXT_color_buffer_float");
		if (!this._FLOATING_BUF_EXT) console.warn("Floating point buffers unsupported! Postprocess buffers might have undesired effects!");
		
		
		this.currentProgram = program;
		this._bufferMask = bufferMask;
		this._clearColor = clearColor;
		this.postProcessProgram = postProcessProgram;

		this._setupInfo = {
			coordStr: coordStr, matStr: matStr, matParamCount: matParamCount, matIndStr: matIndStr, texStr: texStr, texCount: texCount, postTexStr: postTexStr, postTexCount: postTexCount,
			projMatrixStr: projMatrixStr, viewMatrixStr: viewMatrixStr, normalMatrixStr: normalMatrixStr, modelMatrixStr: modelMatrixStr,
			lightsArrayStr: lightsArrayStr, lightsIndexStr: lightsIndexStr, normalStr: normalStr, tanStr: tanStr, biTanStr: biTanStr, texCoordStr: texCoordStr,
			cameraPosStr: cameraPosStr, cameraScaleStr: cameraScaleStr, customSetupFunction: customSetupFunction
		}

		ScreenBuffer._buffers.push(this);

	}

	switchCurrentShaderPrograms(newProgram){
		this._gTarget.useProgram(newProgram.program)
		this._activeProgram = newProgram;
		return this._activeProgram.program;
	}

	getWGLProgram(){
		return this._activeProgram.program;
	}

	//Sets up the buffer to work with the given shader program(s)
	init(shaderProgram = null, postProcessProgram = null) {
		this._inSetup = true
		if(shaderProgram != null){
			this.switchCurrentShaderPrograms(shaderProgram)

			//set up buffers, get attribute locations
			this._posBuffer = new _bufferSet(this._setupInfo.coordStr, this._gTarget, shaderProgram);
			this._normBuf = new _bufferSet(this._setupInfo.normalStr, this._gTarget, shaderProgram);
			this._txBuf = new _bufferSet(this._setupInfo.texCoordStr, this._gTarget, shaderProgram);
			this._tanBuf = new _bufferSet(this._setupInfo.tanStr, this._gTarget, shaderProgram);
			this._biTanBuf = new _bufferSet(this._setupInfo.biTanStr, this._gTarget, shaderProgram);
			
			//TODO: cleanup lines below
			if (this._setupInfo.matStr != null) {
				this._matIndBuf = this._gTarget.createBuffer();
				this._matParamCount = this._setupInfo.matParamCount;
				for (var i = 0; i < this._setupInfo.matParamCount; i++) {
					this._matParamsBufs.push(this._gTarget.createBuffer())
					if (!(this._setupInfo.matStr instanceof Array)) {
						this._inMatParams.push(this._gTarget.getAttribLocation(shaderProgram.program, this._setupInfo.matStr + "" + i));
						if (this._inMatParams[this._inMatParams.length - 1] == -1) alert(this._setupInfo.matStr + "" + i + ": unknown/invalid shader location");
					}
					else {
						this._inMatParams.push(this._gTarget.getAttribLocation(shaderProgram.program, this._setupInfo.matStr[i]));
						if (this._inMatParams[this._inMatParams.length - 1] == -1) alert(this._setupInfo.matStr[i] + ": unknown/invalid shader location");
					}

				}
			}

			

			if (this._setupInfo.texStr != null) {
				this._texCount = this._setupInfo.texCount;
				for (var i = 0; i < this._setupInfo.texCount; i++) {
					if (!(this._setupInfo.texStr instanceof Array)) {
						this._textureLoc.push(this._gTarget.getUniformLocation(shaderProgram.program, this._setupInfo.texStr + "[" + i + "]"));
						if (this._textureLoc[this._textureLoc.length - 1] == -1) alert(this._setupInfo.texStr + "[" + i + "]" + ": unknown/invalid shader location");
					}
					else {
						this._textureLoc.push(this._gTarget.getUniformLocation(shaderProgram.program, this._setupInfo.texStr[i]));
						if (this._textureLoc[this._textureLoc.length - 1] == -1) alert(this._setupInfo.texStr[i] + ": unknown/invalid shader location");
					}
				}
			}

			if (this._setupInfo.matIndStr != null) {
				this._inMatIndex = this._gTarget.getAttribLocation(shaderProgram.program, this._setupInfo.matIndStr);
				if (this._inMatIndex == -1) alert(this._setupInfo.matIndStr + ": unknown/invalid shader location");
			}

			//get uniform locations

			this._projMatrix = new _uniformLocation(this._setupInfo.projMatrixStr, this._gTarget, shaderProgram);
			this._viewMatrix = new _uniformLocation(this._setupInfo.viewMatrixStr, this._gTarget, shaderProgram);
			this._normalMatrix = new _uniformLocation(this._setupInfo.normalMatrixStr, this._gTarget, shaderProgram);
			this._modelMatrix = new _uniformLocation(this._setupInfo.modelMatrixStr, this._gTarget, shaderProgram);
			this._lightIndLoc = new _uniformLocation(this._setupInfo.lightsIndexStr, this._gTarget, shaderProgram);
			this._cameraPosLoc = new _uniformLocation(this._setupInfo.cameraPosStr, this._gTarget, shaderProgram);
			this._cameraSclLoc = new _uniformLocation(this._setupInfo.cameraScaleStr, this._gTarget, shaderProgram);

			//TODO: cleanup
			if (this._setupInfo.lightsArrayStr != null)
				for (var i = 0; i < this.currentProgram._maxLightCount; i++) {
					this._lightTypeArrayLoc.push(this._gTarget.getUniformLocation(shaderProgram.program, this._setupInfo.lightsArrayStr + "[" + i + "].type"))
					if (this._lightTypeArrayLoc == -1) alert(this._setupInfo.lightsArrayStr + ": unknown/invalid shader location (check that this points to an array of lights containing the necessary fields.)");
					this._lightLocArrayLoc.push(this._gTarget.getUniformLocation(shaderProgram.program, this._setupInfo.lightsArrayStr + "[" + i + "].locationW"))
					this._lightDirArrayLoc.push(this._gTarget.getUniformLocation(shaderProgram.program, this._setupInfo.lightsArrayStr + "[" + i + "].directionW"))
					this._lightAngleArrayLoc.push(this._gTarget.getUniformLocation(shaderProgram.program, this._setupInfo.lightsArrayStr + "[" + i + "].angle"))
					this._lightAttenArrayLoc.push(this._gTarget.getUniformLocation(shaderProgram.program, this._setupInfo.lightsArrayStr + "[" + i + "].attenuation"))
					this._lightColorArrayLoc.push(this._gTarget.getUniformLocation(shaderProgram.program, this._setupInfo.lightsArrayStr + "[" + i + "].color"))
					this._lightDiffArrayLoc.push(this._gTarget.getUniformLocation(shaderProgram.program, this._setupInfo.lightsArrayStr + "[" + i + "].diffuseMultiply"))
					this._lightSpecArrayLoc.push(this._gTarget.getUniformLocation(shaderProgram.program, this._setupInfo.lightsArrayStr + "[" + i + "].specularMultiply"))
					this._lightShinyArrayLoc.push(this._gTarget.getUniformLocation(shaderProgram.program, this._setupInfo.lightsArrayStr + "[" + i + "].shininess"))
					this._lightNegativeArrayLoc.push(this._gTarget.getUniformLocation(shaderProgram.program, this._setupInfo.lightsArrayStr + "[" + i + "].negativeHandler"))
					this._lightAltNegativeArrayLoc.push(this._gTarget.getUniformLocation(shaderProgram.program, this._setupInfo.lightsArrayStr + "[" + i + "].negativeHandlerAlt"))
					//this._lightsTypeArrayLoc.push(this._gTarget.getUniformLocation(shaderProgram.program, lightsArrayStr+"["+i+"].lightmask"))
				}

			//finalize initial buffer stup
			this._bufLimit = (this._gTarget.MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS > this._gTarget.MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS ?
				this._gTarget.MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS :
				this._gTarget.MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS)

			this._setupInfo.customSetupFunction(this._gTarget, shaderProgram.program);
		}

		if(postProcessProgram != null){
			//setup postprocess buffers
			this.switchCurrentShaderPrograms(postProcessProgram)
			this._outBuffer = this._gTarget.createFramebuffer();

			if (this._setupInfo.postTexStr != null) {
				this._postTexCount = this._setupInfo.postTexCount;
				for (var i = 0; i < this._setupInfo.postTexCount; i++) {
					this._outImages.push(this._gTarget.createTexture());
					this._gTarget.activeTexture(this._gTarget.TEXTURE0+i);
					this._gTarget.bindTexture(this._gTarget.TEXTURE_2D, this._outImages[i]);
					this._gTarget.texStorage2D(this._gTarget.TEXTURE_2D,
						1,
						(this._FLOATING_EXT && this._FLOATING_BUF_EXT ? this._gTarget.RGBA32F : this._gTarget.RGBA),
						this._gTarget.canvas.clientWidth,
						this._gTarget.canvas.clientHeight)
					/*this._gTarget.texImage2D(this._gTarget.TEXTURE_2D,
						0,
						(this._FLOATING_EXT && this._FLOATING_BUF_EXT ? this._gTarget.RGBA32F : this._gTarget.RGBA),
						this._gTarget.canvas.clientWidth,
						this._gTarget.canvas.clientHeight,
						0,
						this._gTarget.RGBA,
						(this._FLOATING_EXT && this._FLOATING_BUF_EXT ? this._gTarget.FLOAT : this._gTarget.UNSIGNED_BYTE),
						null);*/ //all postprocess textures will support floating point if possible
					// Mipmapping seems to cause problems in at least some cases
					//this._gTarget.generateMipmap(this._gTarget.TEXTURE_2D);
					this._gTarget.texParameteri(this._gTarget.TEXTURE_2D, this._gTarget.TEXTURE_MIN_FILTER, this._gTarget.NEAREST);
					this._gTarget.texParameteri(this._gTarget.TEXTURE_2D, this._gTarget.TEXTURE_MAG_FILTER, this._gTarget.NEAREST);
					this._gTarget.texParameteri(this._gTarget.TEXTURE_2D, this._gTarget.TEXTURE_WRAP_S, this._gTarget.CLAMP_TO_EDGE)
					this._gTarget.texParameteri(this._gTarget.TEXTURE_2D, this._gTarget.TEXTURE_WRAP_T, this._gTarget.CLAMP_TO_EDGE)
					this._gTarget.bindTexture(this._gTarget.TEXTURE_2D, null);

					if (!(this._setupInfo.texStr instanceof Array)) {
						this._postImageLoc.push(this._gTarget.getUniformLocation(postProcessProgram.program, this._setupInfo.postTexStr + "[" + i + "]"));
						if (this._postImageLoc[i] == -1) alert(this._setupInfo.postTexStr + "[" + i + "]" + ": unknown/invalid shader location");
					}
					else {
						this._postImageLoc.push(this._gTarget.getUniformLocation(postProcessProgram.program, this._setupInfo.postTexStr[i]));
						if (this._postImageLoc[i] == -1) alert(this._setupInfo.postTexStr[i] + ": unknown/invalid shader location");
					}
				}

				if (this._setupInfo.coordStr != null) {
					this._postPosBuf = this._gTarget.createBuffer();
					this._postPosIn = this._gTarget.getAttribLocation(postProcessProgram.program, this._setupInfo.coordStr);
				}
		
				this._depthBuffer = this._gTarget.createRenderbuffer();
		
				this._gTarget.bindFramebuffer(this._gTarget.FRAMEBUFFER, this._outBuffer);
				for (var i = 0; i < this._setupInfo.postTexCount; i++) {
					this._gTarget.framebufferTexture2D(this._gTarget.FRAMEBUFFER, this._gTarget.COLOR_ATTACHMENT0+i, this._gTarget.TEXTURE_2D,
						this._outImages[i], 0);
				}
		
				this._gTarget.bindRenderbuffer(this._gTarget.RENDERBUFFER, this._depthBuffer);
				this._gTarget.renderbufferStorage(this._gTarget.RENDERBUFFER, this._gTarget.DEPTH_COMPONENT16, this._gTarget.canvas.clientWidth, this._gTarget.canvas.clientHeight);
		
				this._gTarget.framebufferRenderbuffer(this._gTarget.FRAMEBUFFER, this._gTarget.DEPTH_ATTACHMENT, this._gTarget.RENDERBUFFER,
					this._depthBuffer);
		
				this._gTarget.bindFramebuffer(this._gTarget.FRAMEBUFFER, null);
				for(var i = 0; i < this._texCount; i++){
					this._gTarget.activeTexture(this._gTarget.TEXTURE0 + i);
					this._gTarget.bindTexture(this._gTarget.TEXTURE_2D, null);
				}
				this._gTarget.bindRenderbuffer(this._gTarget.RENDERBUFFER, null);
		
				for (var i = 0; i < this._setupInfo.postTexCount; i++) {
					this._gTarget.uniform1i(this._postImageLoc[i], i);
				}
		
				for(var i = 0; i < this._postTexCount; i++) this._drawBuffers.push(this._gTarget.COLOR_ATTACHMENT0+i)
			}
		}
		//complete setup
		if(this.currentProgram != null)
			this.switchCurrentShaderPrograms(this.currentProgram)
		this._setup = true
		this._inSetup = false
	}

	_clearBuffers() {
		this._customClearFunction(this._gTarget, this.currentProgram)
		for (var i = 0; i < this._matParamCount; i++)
			this._matParams[i] = []
		this._matIndicies = []
		this._points = []
		this._types = [];
		this._offsets = [];
		this._texCoords = []
		this._normals = []
		//this._bitangents = []
		this._tangents = []
	}

	_setViewMatrix(v, p, s) {
		if (this._viewMatrix.location != null) this._gTarget.uniformMatrix4fv(this._viewMatrix.location, false, flatten(v));
		if (this._cameraPosLoc.location != null) this._gTarget.uniform3fv(this._cameraPosLoc.location, flatten(p))
		if (this._cameraSclLoc.location != null) this._gTarget.uniform3fv(this._cameraSclLoc.location, flatten(s))
	}

	_setModelMatrix(m) {
		if (this._modelMatrix.location != null) this._gTarget.uniformMatrix4fv(this._modelMatrix.location, false, flatten(m))
		if (this._normalMatrix.location != null) this._gTarget.uniformMatrix4fv(this._normalMatrix.location, true, flatten(inverse(m)))
	}

	_setProjMatrix(p) {
		if (this._projMatrix.location != null) this._gTarget.uniformMatrix4fv(this._projMatrix.location, false, flatten(p));
	}

	_updateLights() {
		var x = -1
		if (this._lightIndLoc.isValid) {
			this._gTarget.uniform1iv(this._lightIndLoc.location, new Int32Array([x]))
			_lights.forEach((l) => {
				if (l != null && x < _maxLightCount - 1 && l._enabled && this._lightTypeArrayLoc.length - 1 > x && ((l._lightMask & this._bufferMask) != 0)) {
					x++;
					this._gTarget.uniform1iv(this._lightIndLoc.location, new Int32Array([x]))
					this._gTarget.uniform1iv(this._lightTypeArrayLoc[x], new Int32Array([l._type]))
					switch (l._type) {
						case 4:
							this._gTarget.uniform1fv(this._lightAngleArrayLoc[x], new Float32Array([l._angle]))
						case 3:
							this._gTarget.uniform1fv(this._lightAttenArrayLoc[x], new Float32Array([l._attenuation]))
							this._gTarget.uniform4fv(this._lightDiffArrayLoc[x], flatten(l._diffuseMultiply))
							this._gTarget.uniform4fv(this._lightSpecArrayLoc[x], flatten(l._specularMultiply))
							this._gTarget.uniform1fv(this._lightShinyArrayLoc[x], new Float32Array([l._shininess]))
							this._gTarget.uniform1iv(this._lightAltNegativeArrayLoc[x], new Int32Array([l._handleNegativeAlt]))
						case 2:
							var t = l._getWorldTransform(true)
							this._gTarget.uniform3fv(this._lightDirArrayLoc[x], flatten(forward(t.rot)))
							this._gTarget.uniform3fv(this._lightLocArrayLoc[x], flatten(t.pos))
						case 1:
							this._gTarget.uniform4fv(this._lightColorArrayLoc[x], flatten(l._color));
							break;

					}
					this._gTarget.uniform1iv(this._lightNegativeArrayLoc[x], new Int32Array([l._handleNegative]))
				} else if (x >= _maxLightCount - 1 && l != null && l._enabled) {
					_bufferedConsoleLog("WARNING: More than " + _maxLightCount + " used, light with ID " + l._id + " will not be visible.")
				} else if (l._lightMask & this._bufferMask == 0) {
					this._gTarget.uniform1iv(this._lightTypeArrayLoc[x], new Int32Array([0]))
				}
			})
			for (x++; x < _maxLightCount && x < this._lightTypeArrayLoc.length; x++)
				this._gTarget.uniform1iv(this._lightTypeArrayLoc[x], new Int32Array([0]))
		}
	}

	_loadMaterial(m, hasTexture = false, noLighting = false, noParallax = false) {
		if(m._index < 0) this._matIndicies.push(m._index)

		else if (!noLighting) {
			if (!hasTexture) {
				if (m._index == 2 || m._index == 3) this._matIndicies.push(1)
				else if (m._index == 4 || m._index == 5) this._matIndicies.push(0)
				else this._matIndicies.push(m._index)
			}
			else if (noParallax) {
				if (m._index == 2) this._matIndicies.push(3)
				else if (m._index == 4) this._matIndicies.push(5)
				else this._matIndicies.push(m._index)
			}

			else this._matIndicies.push(m._index)
		}
		else {
			if (hasTexture)
				if (m._index == 2 && !noParallax) this._matIndicies.push(4)
				else this._matIndicies.push(5)
			else this._matIndicies.push(0)
		}
		for (var i = 0; i < this._matParamCount; i++)
			this._matParams[i].push(m._parameters[i % m._parameters.length])
	}

	_loadTexture(t, cameraMask) {
		if (this._textureLoc.length > 0) t._applyTexture(this._textureLoc, this._bufferMask, cameraMask)
	}

	_beginRender() {
		//("Rendering")
		//load new buffer data
		//TODO: modify for custom programs
		this.switchCurrentShaderPrograms(this.currentProgram)
		this._gTarget.viewport(0, 0, this.viewportSize.x, this.viewportSize.y);
		this._gTarget.enable(this._gTarget.DEPTH_TEST);
		this._gTarget.enable(this._gTarget.CULL_FACE);
		//this._gTarget.enable(this._gTarget.DEPTH_CLAMP); //not supported in WebGL
		this._gTarget.colorMask(true, true, true, true);
		this._gTarget.enable(this._gTarget.BLEND)
		this._gTarget.blendFunc(this._gTarget.SRC_ALPHA, this._gTarget.ONE_MINUS_SRC_ALPHA);
		this._gTarget.frontFace(this._gTarget.CW);
		this._gTarget.depthFunc(this._gTarget.LESS);

		if (!this._inSetup) {
			if (!this._setup) this.init(this.currentProgram, this.postProcessProgram);

			this._customBeginRenderFunction(this._gTarget, this.currentProgram)
			this._updateLights();

			for(var i = 0; i < this._texCount; i++){
				this._gTarget.activeTexture(this._gTarget.TEXTURE0 + i);
				this._gTarget.bindTexture(this._gTarget.TEXTURE_2D, null);
			}

			this._gTarget.bindFramebuffer(this._gTarget.FRAMEBUFFER, this._outBuffer);
			for (var i = 0; i < this._setupInfo.postTexCount; i++) {
				this._gTarget.framebufferTexture2D(this._gTarget.FRAMEBUFFER, this._gTarget.COLOR_ATTACHMENT0+i, this._gTarget.TEXTURE_2D,
					this._outImages[i], 0);
			}

			this._gTarget.drawBuffers(this._drawBuffers);
			//this._gTarget.useProgram(this._program.program);
			this._gTarget.clearColor(0, 0, 0, 0)
			this._gTarget.clear(this._gTarget.COLOR_BUFFER_BIT | this._gTarget.DEPTH_BUFFER_BIT);
			this._clearBuffers();
		}
	}

	_renderData() {
		if (this._points.length > 0) {
			this._customPreRenderFunction(this._gTarget, this._program);

			this._posBuffer.loadBufferData(this._gTarget, 
				this._gTarget.ARRAY_BUFFER, 
				this._gTarget.STATIC_DRAW, 
				flatten(this._points), 
				3, 
				this._gTarget.FLOAT, 
				false, 
				0, 
				0);

			//TODO: update when _matIndBuf is made into custom class
			if (this._matIndBuf != null) {
				this._gTarget.bindBuffer(this._gTarget.ARRAY_BUFFER, this._matIndBuf);
				this._gTarget.bufferData(this._gTarget.ARRAY_BUFFER, new Int16Array(this._matIndicies), this._gTarget.STATIC_DRAW);
				this._gTarget.vertexAttribIPointer(this._inMatIndex, 1, this._gTarget.SHORT, 0, 0);
				this._gTarget.enableVertexAttribArray(this._inMatIndex);
			}

			//load materials
			//TODO: clean this up
			for (var i = 0; i < this._matParamCount; i++) {
				this._gTarget.bindBuffer(this._gTarget.ARRAY_BUFFER, this._matParamsBufs[i]);
				this._gTarget.bufferData(this._gTarget.ARRAY_BUFFER, flatten(this._matParams[i]), this._gTarget.STATIC_DRAW);
				this._gTarget.vertexAttribPointer(this._inMatParams[i], 4, this._gTarget.FLOAT, false, 0, 0);
				this._gTarget.enableVertexAttribArray(this._inMatParams[i]);
			}

			this._normBuf.loadBufferData(this._gTarget, 
				this._gTarget.ARRAY_BUFFER, 
				this._gTarget.STATIC_DRAW, 
				flatten(this._normals), 
				3, 
				this._gTarget.FLOAT, 
				true, 
				0, 
				0);

			this._tanBuf.loadBufferData(this._gTarget, 
				this._gTarget.ARRAY_BUFFER, 
				this._gTarget.STATIC_DRAW, 
				flatten(this._tangents), 
				3, 
				this._gTarget.FLOAT, 
				true, 
				0, 
				0);

			this._biTanBuf.loadBufferData(this._gTarget, 
				this._gTarget.ARRAY_BUFFER, 
				this._gTarget.STATIC_DRAW, 
				flatten(this._bitangents), 
				3, 
				this._gTarget.FLOAT, 
				true, 
				0, 
				0);

			this._txBuf.loadBufferData(this._gTarget, 
				this._gTarget.ARRAY_BUFFER, 
				this._gTarget.STATIC_DRAW, 
				flatten(this._texCoords), 
				2, 
				this._gTarget.FLOAT, 
				false, 
				0, 
				0);

			//draw
			var offset = 0;
			for (var i = 0; i < this._types.length; i++) {
				this._customRenderFunction(this._gTarget, this.currentProgram);
				this._gTarget.drawArrays(this._types[i], offset, this._offsets[i]);
				offset += this._offsets[i];
			}
			this._customPostRenderFunction(this._gTarget, this.postProcessProgram);
		}
		/*var tmp = this._gTarget.getError()
		if (tmp != this._gTarget.NO_ERROR) {
			switch (tmp) {
				case this._gTarget.INVALID_OPERATION:
				case this._gTarget.INVALID_FRAMEBUFFER_OPERATION:
				case this._gTarget.OUT_OF_MEMORY:
					alert("WebGL error " + tmp + "; Make sure hardware acceleration is enabled in your web browser.")
				default:
					alert("WebGL error " + tmp)
			}
		}*/
		this._clearBuffers();
	}

	/**
	 * Manually apply final step postprocessing to output image by drawing a rectangle on the entire screen containing the scene image processed via the post process shaders
	 */
	_applyPostProcessToScene() {

		//this._gTarget.drawBuffers([this._gTarget.NONE, this._gTarget.NONE]);
		this.switchCurrentShaderPrograms(this.postProcessProgram)
		this._gTarget.depthFunc(this._gTarget.LESS)
		this._gTarget.bindFramebuffer(this._gTarget.FRAMEBUFFER, null);

		for(var i = 0; i < this._postTexCount; i++){
			this._gTarget.activeTexture(this._gTarget.TEXTURE0+i);
			this._gTarget.bindTexture(this._gTarget.TEXTURE_2D, this._outImages[i]);
		}


		this._gTarget.clearColor(this._clearColor[0], this._clearColor[1], this._clearColor[2], this._clearColor[3])
		this._gTarget.clear(this._gTarget.COLOR_BUFFER_BIT | this._gTarget.DEPTH_BUFFER_BIT);
		if (this._postPosBuf != null) {
			this._gTarget.bindBuffer(this._gTarget.ARRAY_BUFFER, this._postPosBuf);
			this._gTarget.bufferData(this._gTarget.ARRAY_BUFFER, new Float32Array([-1, -1,
			-1, 1,
				1, 1,
				1, 1,
				1, -1,
			-1, -1]), this._gTarget.STATIC_DRAW);
			this._gTarget.vertexAttribPointer(this._postPosIn, 2, this._gTarget.FLOAT, false, 0, 0);
			this._gTarget.enableVertexAttribArray(this._postPosIn);
		} else throw "Missing required shader input for vertex location"
		this._gTarget.drawArrays(this._gTarget.TRIANGLES, 0, 6)
	}
}