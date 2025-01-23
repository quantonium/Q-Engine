"use strict";

import { Renderer, BufferSet  } from "./Renderer.js";

/**
 * SceneRenderer renders 3D objects with a default
 * shader model (see default-shaders). It can output
 * to either a texture or a canvas.
 */
export class SceneRenderer extends Renderer {

	constructor(gTarget, program, clearColor = vec4(0, 0, 0, 1),
		coordStr = "inPointsL", matStr = "inMatProp", matParamCount = 7, matIndStr = "inMatIndex",
		texStr = ["baseImage", "normalMap", "depthMap", "diffuseMap", "specularMap", "emissiveImage"],
		texCount = 6, projMatrixStr = "projMatrix", viewMatrixStr = "viewMatrix", normalMatrixStr = "normalMatrix",
		modelMatrixStr = "modelMatrix", lightsArrayStr = "lights", lightsIndexStr = "maxLightIndex",
		normalStr = "inNormalL", tanStr = "inTangentL", biTanStr = null, texCoordStr = "inTexCoord",
		cameraPosStr = "inCameraPosW", cameraScaleStr = "inCameraScale", customSetupFunction = function (gTarget, program) { },
		bufferMask = 0x1) {
			super()
			this._gTarget = gTarget;

		this._FLOATING_EXT = this._gTarget.getExtension("OES_texture_float_linear");
		if (!this._FLOATING_EXT) console.warn("Floating point textures unsupported! Postprocess buffers might have undesired effects!");
		this._FLOATING_BUF_EXT = this._gTarget.getExtension("EXT_color_buffer_float");
		if (!this._FLOATING_BUF_EXT) console.warn("Floating point buffers unsupported! Postprocess buffers might have undesired effects!");
		
		this.bufferMask = bufferMask;
		this._clearColor = clearColor;

		this._setupInfo = {
			coordStr: coordStr, matStr: matStr, matParamCount: matParamCount, matIndStr: matIndStr, texStr: texStr, texCount: texCount,
			projMatrixStr: projMatrixStr, viewMatrixStr: viewMatrixStr, normalMatrixStr: normalMatrixStr, modelMatrixStr: modelMatrixStr,
			lightsArrayStr: lightsArrayStr, lightsIndexStr: lightsIndexStr, normalStr: normalStr, tanStr: tanStr, biTanStr: biTanStr, texCoordStr: texCoordStr,
			cameraPosStr: cameraPosStr, cameraScaleStr: cameraScaleStr, customSetupFunction: customSetupFunction
		}
	}
	
	_initProgram(shaderProgram){
		super._initProgram(shaderProgram)
		this._inSetup = true
		if(shaderProgram != null){
			this.switchCurrentShaderPrograms(shaderProgram)

			//set up buffers, get attribute locations
			this._posBuffer = new BufferSet(this._setupInfo.coordStr, this._gTarget, shaderProgram);
			this._normBuf = new BufferSet(this._setupInfo.normalStr, this._gTarget, shaderProgram);
			this._txBuf = new BufferSet(this._setupInfo.texCoordStr, this._gTarget, shaderProgram);
			this._tanBuf = new BufferSet(this._setupInfo.tanStr, this._gTarget, shaderProgram);
			this._biTanBuf = new BufferSet(this._setupInfo.biTanStr, this._gTarget, shaderProgram);
			
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

			this._projMatrix = new UniformLocation(this._setupInfo.projMatrixStr, this._gTarget, shaderProgram);
			this._viewMatrix = new UniformLocation(this._setupInfo.viewMatrixStr, this._gTarget, shaderProgram);
			this._normalMatrix = new UniformLocation(this._setupInfo.normalMatrixStr, this._gTarget, shaderProgram);
			this._modelMatrix = new UniformLocation(this._setupInfo.modelMatrixStr, this._gTarget, shaderProgram);
			this._lightIndLoc = new UniformLocation(this._setupInfo.lightsIndexStr, this._gTarget, shaderProgram);
			this._cameraPosLoc = new UniformLocation(this._setupInfo.cameraPosStr, this._gTarget, shaderProgram);
			this._cameraSclLoc = new UniformLocation(this._setupInfo.cameraScaleStr, this._gTarget, shaderProgram);

			//TODO: cleanup
			if (this._setupInfo.lightsArrayStr != null)
				for (var i = 0; i < this.getActiveShaderProgram().maxLightCount; i++) {
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

			//finalize initial buffer setup
			this._bufLimit = (this._gTarget.MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS > this._gTarget.MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS ?
				this._gTarget.MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS :
				this._gTarget.MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS)

			
		}
	}

	_beginRender() {
		super._beginRender()
		
	}
}