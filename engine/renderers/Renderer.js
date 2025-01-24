"use strict"

import { vec4, vec2, flatten, inverse } from "./common/MVnew.js";
import { getLights } from "./primitives/lights.js";
import { bufferedConsoleLog } from "./console.js";

export const RENDERER_BUFFER_TYPES = {
	VIEW: "viewMatrix",
	PROJ: "projMatrix",
	NORM: "normalMatrix",
	MVP: "MVPMatrix",
	MODL: "modelMatrix",
	CAMW: "inCameraPosW",
	CAMS: "inCameraScale",
	MLIG: "maxLightIndex",
	MISC: "MiscVarSetManually"
}

/**
 * An attribute location for a given buffer, mapping name to wgl location
 */
export class BufferSet {
	buffer; //WebGL buffer
	inputAttribute; //attrib location
	locationName; //string
	size = 3; //size of the datatype, ie 3 for vec3
	type = null; //the webgl data type, ie gl.FLOAT

	_gl

	_vao //renderer has a VAO which it enables by default, so that it doesn't override DrawInfo VAOs

	constructor(locationName, gTarget, shaderProgram, type, size = 3) {
		this.locationName = locationName;
		this.type = type
		this.size = size
		this._gl = gTarget
		if (gTarget != null && shaderProgram != null)
			this.setupBuffer(gTarget, shaderProgram, true)
	}

	/**
	 * Set up a new buffer for an attribute, if possible. Creates
	 * TODO: @params
	 */
	setupBuffer(shaderProgram, createNewBuffer = false) {
		if (this.locationName != null) {
			if (createNewBuffer) this.buffer = this._gl.createBuffer();
			this.inputAttribute = this._gl.getAttribLocation(shaderProgram.program, this.locationName);
			if (this.inputAttribute == -1) alert(this.locationName + ": unknown/invalid shader location");
		}
	}

	isValid() {
		return this.locationName != null && this.inputAttribute != -1;
	}

	loadBufferData(bufferType, drawType, data, normalized = false, stride = 0, offset = 0, useIPointer = false) {
		if (this.isValid()) {
			this._gl.bindBuffer(bufferType, this.buffer);
			this._gl.bufferData(bufferType, data, drawType);
			if (!useIPointer)
				this._gl.vertexAttribPointer(this.inputAttribute, this.size, this.type, normalized, stride, offset);
			else this._gl.vertexAttribIPointer(this.inputAttribute, this.size, this.type, stride, offset)
			this._gl.enableVertexAttribArray(this.inputAttribute);
		}
	}
}

/**
 * A shader uniform location for a given buffer, mapping name to wgl location
 */
export class UniformLocation {
	location;
	name;
	type; //match webgl uniform types as strings, ie 1fv, Matrix2fv, etc. Must match exact or it will error!
	//see: https://www.khronos.org/files/webgl20-reference-guide.pdf uniforms

	_gl
	constructor(uniformName, gTarget, shaderProgram, type) {
		this.name = uniformName
		this.type = type
		this._gl = gTarget
		this.location = this.getLocation(shaderProgram, uniformName)
	}

	getLocation(shaderProgram, uniformName) {
		let val = gTarget.getUniformLocation(shaderProgram.program, uniformName);
		if (val == -1){
			console.log(this.name + ": unknown/invalid shader location");
			return -1
		}
		return val
	}

	loadUniform(data, matrixTranspose = false) {
		UniformLocation.loadUniform(this._gl, this.location, this.type, data, matrixTranspose)
	}

	static loadUniform(gTarget, location, type, data, matrixTranspose = false) {
		
		if(type.indexOf("Matrix") >= 0){
			fn = Function("gTarget", "location", "matrixTranspose", "data",
				"gTarget.uniform"+type+"(location, matrixTranspose, data)")
			fn(gTarget, location, matrixTranspose, data)
		}
		else {
			fn = Function("gTarget", "location", "data",
				"gTarget.uniform"+type+"(location, data)")
			fn(gTarget, location, matrixTranspose, data)
		}
	}

	isValid() {
		return this.name != null && this.location != -1
	}
}

/**
 * Like UniformLocation but modified to work with a struct in wgl.
 * Critical difference is the loadUniform function expects data and matrixTranspose
 * to be Maps mapping the field to the data for that field.
 */
export class StructUniformLocation extends UniformLocation {
	structFields = new Map() //map the struct field name to the index
	structTypes = new Map() //map field name to type

	//type is the struct type
	constructor(uniformName, gTarget, shaderProgram, type, structFields, structTypes) {
		this.name = uniformName
		this.type = type
		this._gl = gTarget
		for(i = 0; i < structFields.length(); i++){
			let fieldName = uniformName + "." + structFields[i]
			this.structFields.set(structFields[i], this.loadUniform(shaderProgram, fieldName))
			this.structTypes.set(structFields[i], structTypes[i])
		}
	}

	//data expected to be a map-like structure mapping field name to the data. Similar for matrixTranspose.
	loadUniform(data, matrixTranspose) {
		this.structFields.keys().forEach(element => {
			this.loadUniformField(element, data.get(element), matrixTranspose.get(element))
		});
	}

	loadUniformField(fieldName, data, matrixTranspose = false){
		UniformLocation.loadUniform(this._gl, this.structFields.get(fieldName), this.structTypes.get(fieldName), data, matrixTranspose)
	}
}

/**
 * A renderer generates an image, exporting it either to a texture
 * or a canvas. 
 */
export class Renderer {
	static _renderers = [];

	static getRenderers() {
		return Renderer._renderers
	}

	//bufferMap maps {program, string} to BufferSet
	_bufferMap = Map()
	_uniformMap = Map()
	_structUniformMap = Map()

	drawElements = false //if true, draw via wgl drawelement feature instead of drawarrays
	drawInstanced = false //if true, shader takes in RENDERER_BUFFER_TYPES as attributes instead of uniforms,
	//allowing for instanced drawing
	

	//Current 3D ShaderProgram that this buffer will use to render.
	//Set to null to disable
	//todo: maybe obsolete this variable
	currentProgram = null;

	//the actual active program
	_activeProgram = null;

	_bufLimit;

	//buffer renders only objects that match this mask
	bufferMask = 0x1;

	_setup = false;

	//color which to clear to after rendering a frame
	clearColor;

	_inSetup = false;

	//WEBGL EXTENSIONS
	_FLOATING_EXT;
	_FLOATING_BUF_EXT;

	//Modify this value as needed to alter the size of the buffer viewport.
	viewportSize = new vec2(1280, 720)

	_customClearFunction = (gTarget, program) => { }
	_customBeginRenderFunction = (gTarget, program) => { }
	_customPreRenderFunction = (gTarget, program) => { }
	_customRenderFunction = (gTarget, program) => { }
	_customPostRenderFunction = (gTarget, program) => { }

	_getUniform(loc) {
		return this._gTarget.getUniform(this._program, loc)
	}

	constructor(gTarget) {
		this._gTarget = gTarget
		Renderer._renderers.push(this);
	}

	switchCurrentShaderPrograms(newProgram) {
		this._gTarget.useProgram(newProgram.program)
		this._activeProgram = newProgram;
		return this._activeProgram.program;
	}

	getWGLProgram() {
		return this._activeProgram.program;
	}

	getActiveShaderProgram() {
		return this._activeProgram;
	}

	//Sets up the buffer to work with the given shader program(s)
	//@param shaderProgram the shader program to initialize
	//@param buffers a list of strings of attribute values in the given program to create buffers for
	_initProgram(shaderProgram, buffers = [], attributes = [], uniforms = []) {
		this._inSetup = true
		this.switchCurrentShaderPrograms(shaderProgram)
		this._setupInfo.customSetupFunction(this._gTarget, shaderProgram);
		this._setup = true
		this._inSetup = false
	}

	_clearBuffers() {
		this._customClearFunction(this._gTarget, this.getActiveShaderProgram())
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

	_loadMaterial(m, hasTexture = false, noLighting = false, noParallax = false) {
		if (m.index < 0) this._matIndicies.push(m.index)

		else if (!noLighting) {
			if (!hasTexture) {
				if (m.index == 2 || m.index == 3) this._matIndicies.push(1)
				else if (m.index == 4 || m.index == 5) this._matIndicies.push(0)
				else this._matIndicies.push(m.index)
			}
			else if (noParallax) {
				if (m.index == 2) this._matIndicies.push(3)
				else if (m.index == 4) this._matIndicies.push(5)
				else this._matIndicies.push(m.index)
			}

			else this._matIndicies.push(m.index)
		}
		else {
			if (hasTexture)
				if (m.index == 2 && !noParallax) this._matIndicies.push(4)
				else this._matIndicies.push(5)
			else this._matIndicies.push(0)
		}
		for (var i = 0; i < this._matParamCount; i++)
			this._matParams[i].push(m.parameters[i % m.parameters.length])
	}

	_loadTexture(t, cameraMask) {
		if (this._textureLoc.length > 0) t._applyTexture(this._textureLoc, this.bufferMask, cameraMask)
	}

	//Called before each frame is rendered with this buffer
	_beginRender() {
		//("Rendering")
		//load new buffer data
		//TODO: modify for custom programs
		this.switchCurrentShaderPrograms(this.currentProgram)
		this._clearBuffers();
	}

	//Renders data as needed. By default, only clears buffers- call super after your render code
	_renderData() {

		this._clearBuffers();
	}
}