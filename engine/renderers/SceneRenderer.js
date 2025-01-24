"use strict";

import { Renderer, BufferSet, RENDERER_BUFFER_TYPES, UniformLocation, StructUniformLocation } from "./Renderer.js";
import { vec3, mat4, mult, inverse, flatten } from "../common/MVnew.js";


/**
 * SceneRenderer renders 3D objects with a default
 * shader model (see default-shaders). It can output
 * to either a texture or a canvas.
 */
export class SceneRenderer extends Renderer {

	//these buffers match those in default-shaders/vertex.glsl
	static _DEFAULT_BUFFERS = [
		"inPointsL",
		"inNormalL",
		"inTexCoord",
		"inTangentL",
		"inMatFunc",
		"inMatProp0",
		"inMatProp1",
		"inMatProp2",
		"inMatProp3",
		"inMatProp4",
		"inMatProp5",
		"inMatProp6"]

	static _DEFAULT_BUFSIZE = [
		3,
		3,
		2,//inTexCoord
		3,
		3,
		4,//inMatProp0-6 below
		4,
		4,
		4,
		4,
		4,
		4
	]

	static _DEFAULT_BUFTYPE = [] //filled manually in constructor with gTarget

	static _DEFAULT_UNIFORMS = [
		RENDERER_BUFFER_TYPES.CAMS,
		RENDERER_BUFFER_TYPES.VIEW,
		RENDERER_BUFFER_TYPES.PROJ,
		RENDERER_BUFFER_TYPES.NORM,
		RENDERER_BUFFER_TYPES.MODL,
		RENDERER_BUFFER_TYPES.MVP,
		RENDERER_BUFFER_TYPES.CAMW,
		RENDERER_BUFFER_TYPES.MILG
	]

	static _DEFAULT_UNIFORMTYPES = [
		"3fv", //camera scale
		"Matrix4fv",
		"Matrix4fv",
		"Matrix4fv",
		"Matrix4fv",
		"Matrix4fv",
		"3fv", //camera world pos
		"1iv" //maxLightIndex
	]

	static _DEFAULT_LIGHT_STRUCT = "lights"
	static _DEFAULT_LIGHT_STRUCTTYPE = "light"

	static _DEFAULT_LIGHT_UNIFORMS = [
		"type",
		"locationW",
		"directionW",
		"angle",
		"attenuation",
		//"lightmask",
		"color",
		"diffuseMultiply",
		"specularMultiply",
		"shininess",
		"negativeHandler",
		"negativeHandlerAlt"
	]

	static _DEFAULT_LIGHT_UNIFORMTYPES = [
		"1uiv", //type
		"3fv",
		"3fv",
		"1fv",//angle
		"1fv",//attenuation
		"4fv",
		"4fv",
		"1fv", //shininess
		"1uiv", //negative handler
		"1uiv" //negative handler alt
	]

	_currentProjMat = mat4()
	_currentViewMat = mat4()
	_currentModelMat = mat4()
	_currentNormMat = mat4()
	_currentMVPMat = mat4()

	_cameraPos = vec3();
	_cameraScl = vec3();

	constructor(gTarget, clearColor = vec4(0, 0, 0, 1), bufferMask = 0x1) {
			super()
			this._gTarget = gTarget;

			if (SceneRenderer._DEFAULT_BUFTYPE.length() == 0) {
				_DEFAULT_BUFTYPE = [
					gTarget.FLOAT,
					gTarget.FLOAT,
					gTarget.FLOAT,
					gTarget.FLOAT,
					gTarget.SHORT, //inMatIndex
					gTarget.FLOAT,
					gTarget.FLOAT,
					gTarget.FLOAT,
					gTarget.FLOAT,
					gTarget.FLOAT,
					gTarget.FLOAT,
					gTarget.FLOAT
				]
			}

		this._FLOATING_EXT = this._gTarget.getExtension("OES_texture_float_linear");
		if (!this._FLOATING_EXT) console.warn("Floating point textures unsupported! Postprocess buffers might have undesired effects!");
		this._FLOATING_BUF_EXT = this._gTarget.getExtension("EXT_color_buffer_float");
		if (!this._FLOATING_BUF_EXT) console.warn("Floating point buffers unsupported! Postprocess buffers might have undesired effects!");
		
		this.bufferMask = bufferMask;
		this._clearColor = clearColor;
	}
	
	//Initialize a shaderprogram into this buffer, storing the location of attributes and uniforms,
	//and creating necessary buffers. Override if your code supports more or different shader fields.
	_initProgram(shaderProgram, 
		buffers = SceneRenderer._DEFAULT_BUFFERS, 
		bufferTypes = SceneRenderer._DEFAULT_BUFSIZE, 
		bufferSizes = SceneRenderer._DEFAULT_BUFSIZE, 
		uniforms = SceneRenderer._DEFAULT_UNIFORMS,
		uniformTypes = SceneRenderer._DEFAULT_UNIFORMTYPES,
		lightUniform = SceneRenderer._DEFAULT_LIGHT_STRUCT,
		lightStruct = SceneRenderer._DEFAULT_LIGHT_STRUCTTYPE,
		lightFields = SceneRenderer._DEFAULT_LIGHT_UNIFORMS,
		lightFieldTypes = SceneRenderer._DEFAULT_LIGHT_UNIFORMTYPES){ //no bitangent buffer by default
		super._initProgram(shaderProgram)
		this._inSetup = true
		if(shaderProgram != null){
			this.switchCurrentShaderPrograms(shaderProgram)

			//create buffers
			for(i = 0; i < buffers.length(); i++){
				this._bufferMap.set([shaderProgram, buffers[i]], new BufferSet(buffers[i], this._gTarget, shaderProgram, bufferTypes[i], bufferSizes[i]))
			}

			//get uniform locations
			for(i=0; i < uniforms.length(); i++){
				this._uniformMap.set([shaderProgram, uniforms[i]], new UniformLocation(uniforms[i], this._gTarget, shaderProgram, uniformTypes[i]))
			}

			//get uniform locations for lights
			for(i=0; i < shaderProgram.maxLightCount; i++){
				let name = lightUniform + "[" + i + "]"
				this._structUniformMap.set([shaderProgram, name], new StructUniformLocation(name, gTarget, shaderProgram, lightStruct, lightFields, lightFieldTypes))
			}

			//finalize initial buffer setup
			this._bufLimit = (this._gTarget.MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS > this._gTarget.MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS ?
				this._gTarget.MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS :
				this._gTarget.MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS)

			
		}
	}

	setViewMatrix(v, p, s) {
		this._currentViewMat = v
		this._cameraPos = p
		this._cameraScl = s

		this._uniformMap.get(RENDERER_BUFFER_TYPES.VIEW).loadUniform(flatten(this._currentViewMat), false)
		this._uniformMap.get(RENDERER_BUFFER_TYPES.CAMW).loadUniform(flatten(this._cameraPos))
		this._uniformMap.get(RENDERER_BUFFER_TYPES.CAMS).loadUniform(flatten(this._cameraScl))

		this._updateMVPMatrix()
	}

	setModelMatrix(m) {
		this._currentModelMat = m
		this._currentNormMat = inverse(m)
		this._uniformMap.get(RENDERER_BUFFER_TYPES.MODL).loadUniform(flatten(this._currentModelMat))
		this._uniformMap.get(RENDERER_BUFFER_TYPES.NORM).loadUniform(flatten(this._currentNormMat))

		this._updateMVPMatrix()
	}

	setProjMatrix(p) {
		this._currentProjMat = p
		this._uniformMap.get(RENDERER_BUFFER_TYPES.PROJ).loadUniform(flatten(this._currentProjMat))
		
		this._updateMVPMatrix()
	}

	_updateMVPMatrix() {
		this._currentMVPMat = mult(this._currentProjMat, mult(this._currentViewMat, this._currentModelMat))

		this._uniformMap.get(RENDERER_BUFFER_TYPES.MVP).loadUniform(flatten(this._currentMVPMat))
	}

	_beginRender() {
		super._beginRender()
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
		}
	}

	_updateLights() {
		var x = -1
		if (this._lightIndLoc.isValid) {
			this._gTarget.uniform1iv(this._lightIndLoc.location, new Int32Array([x]))
			getLights().forEach((l) => {
				if (l != null && x < this.getActiveShaderProgram().maxLightCount - 1 && l._enabled && this._lightTypeArrayLoc.length - 1 > x && ((l._lightMask & this.bufferMask) != 0)) {
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
				} else if (x >= this.getActiveShaderProgram().maxLightCount - 1 && l != null && l._enabled) {
					bufferedConsoleLog("WARNING: More than " + this.getActiveShaderProgram().maxLightCount + " used, light with ID " + l._id + " will not be visible.")
				} else if (l._lightMask & this.bufferMask == 0) {
					this._gTarget.uniform1iv(this._lightTypeArrayLoc[x], new Int32Array([0]))
				}
			})
			for (x++; x < this.getActiveShaderProgram().maxLightCount && x < this._lightTypeArrayLoc.length; x++)
				this._gTarget.uniform1iv(this._lightTypeArrayLoc[x], new Int32Array([0]))
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
			this._customPostRenderFunction(this._gTarget, this.currentProgram);
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

		super._renderData()
	}
}