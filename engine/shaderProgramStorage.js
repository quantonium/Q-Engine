"use strict"

import { PQueue } from "./common/helpers-and-types"

/**
 * Container which holds the programs and shaders for a given wgl context.
 * Shaders are indexed by their filename- shaders with matching filenames in different paths
 * will cause a conflict and override each other!
 */

export class ShaderProgramStorage {
	static storages = new Map()

	//the wgl context for this storage
	gl

	//shaders indexed by the filename (not url) of the source code
	shaders = new Map()

	//programs indexed by [vertex, fragment] names
	programs = new Map()

	//maps the shader name to the source url
	shaderToURL = new Map()

	//map wgl shader to its name
	shaderToName = new Map()

	//If a shader program can't be found, use this shader program by default
	defaultShaderProgram = null

	//A pqueue of all materials which use shaders in this object. Ordered by the material's priority,
	//renderers will use this order when rendering materials.
	materialQueue = new PQueue()

	constructor(gl){
		this.gl = gl
	}

	//defaultVertex, defaultFragment are URLs pointing to default shaders to create
	constructor(gl, defaultVertex, defaultFragment) {
		this(gl)
		this.addProgram(defaultVertex, defaultFragment)
	}

	//If one doesn't exist, creates a program from the given vertex and fragment shader paths
	addProgram(vShaderURL, fShaderURL, vShaderName = null, fShaderName = null) {
		if(vShaderName == null) vShaderName = vShaderURL.split(/[\/\\]/).at(-1)
		if(fShaderName == null) fShaderName = fShaderURL.split(/[\/\\]/).at(-1)

		let vs = this.changeShaderURL(vShaderName, vShaderURL, this.gl.VERTEX_SHADER)
		let fs = this.changeShaderURL(fShaderName, fShaderURL, this.gl.FRAGMENT_SHADER)

		this._linkShaders(vShaderName, fShaderName)
	}

	//Compiles a shader from a string source
	_compileShader(shaderScript, type) {
		let shader = this.gl.createShader(type)
		if (!shaderScript) {
			console.error("Could not find shader source: "+shaderName);
		}
		this.gl.shaderSource(shader, shaderScript);
		this.gl.compileShader(shader);

		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			console.error(this.gl.getShaderInfoLog(shader));
			return null;
		}
		return shader;
	}

	_compileAndSetShader(shaderName, shaderType, shaderCode){
		let compiledShader = this._compileShader(shaderCode, shaderType)
		this.shaders.set(shaderName, compiledShader)
		this.shaderToName.set(compiledShader, shaderName)
		return compiledShader
	}

	//recompiles an existing shader by filename, rereading the contents of the currently set URL
	//and relinking any programs using the shader
	recompileShader(shaderName){
		let v = null
		let f = null
		let shaderSource = loadFileAJAX(shaderURL)
		this.programs.keys().forEach(element => {
			if(element[0] == shaderName){
				if(v == null) v = this._compileAndSetShader(shaderName, this.gl.VERTEX_SHADER, shaderSource)
				this._linkShaders(shaderName, element[1])
			}
			else if(element[1] == shaderName){
				if(f == null) f = this._compileAndSetShader(shaderName, this.gl.FRAGMENT_SHADER, shaderSource)
					this._linkShaders(element[0], shaderName)
			}
		});
		return f == null ? v : f
	}

	//changes or sets a shader by URL and recompiles
	changeShaderURL(shaderName, shaderURL, typeIfNew){
		let s = this._setShaderURL(shaderName, shaderURL)
		if(this.shaders.get(shaderName))
			this.recompileShader(shaderName)
		else this._compileAndSetShader(shaderName, typeIfNew, s)
		return this.shaders.get(shaderName)
	}

	//changes a shader url by name and returns the source file
	//does not recompile
	_setShaderURL(shaderName, shaderURL){
		if(this.shaderToURL.get(shaderName)){
			this.shaderToURL.delete(shaderName)
		}
		this.shaderToURL.set(shaderName, shaderURL)
		return loadFileAJAX(shaderURL)
	}

	//Take two shader filenames, links them into a new or existing program
	_linkShaders(vShaderName, fShaderName) {
		let prg = this.programs.get([vName, fName])
		if(prg == null){
			prg = this.gl.createProgram()
			this.programs.set([vName, fName], prg)
		}
	
		let vs = this.shaders.get(vShaderName)
		let fs = this.shaders.get(fShaderName)


		this.gl.attachShader(prg, vs);
		this.gl.attachShader(prg, fs);

		this.gl.linkProgram(prg);
	
		if (!this._gl.getProgramParameter(prg, this.gl.LINK_STATUS)) {
			alert("Could not initialise shaders The error log is: " + this.gl.getProgramInfoLog( prg ));
			//console.error("Could not initialise shaders The error log is: " + this.gl.getProgramInfoLog( this._program ));
			return null;
		}
	};

	//Unloads a program from the wgl context.
	//Use only in cleanup operations when a shader pair is no longer
	//in use- will cause issues if a material is using the program! 
	unloadProgram(program) {
		if(this.gl.isProgram(program)){
			Material.programs.delete(program)
			this.gl.deleteProgram(program)
			return null
		}
		return program
	}

	//deletes a shader from a program
	//called only in delete function, do not call on own
	_removeShader(program, shader){
		if(this.gl.isShader(shader)){
			if(this.gl.isProgram(program)){
				this.gl.detachShader(program, shader)
			}
		}
	}

	//deletes a wgl shader if not in use by any program
	removeShader(shader){
		this.programs.values().forEach((element) => {
			if(this.gl.getAttachedShaders(element).includes(shader)){
				console.error("Attempting to remove an in-use shader!")
				return
			}
		})
		let name = this.shaderToName.get(shader)
		this.shaderToName.delete(shader)
		this.shaders.delete(name)
		this.shaderToURL.delete(name)
	}

	//deletes any shaders and programs
	delete() {
		this.programs.keys().forEach((element) => {
			this.unloadProgram(this.programs.get(element))
			this.programs.delete(element)
		})
		this.shaders.keys().forEach((element) => {
			this.unload
		})
	}
}
