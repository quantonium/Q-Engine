"use strict";

import { loadFileAJAX } from "./common/helpers-and-types.js";

//Wrapper for openGL shader program, working with a vertex and fragment shader
export class ShaderProgram{

	program;
	gl;
	vertexShader;
	fragmentShader

	//max light count to be supported by this shader program.
	//ScreenBuffers read from this value to load in light info.
	//Value should be ignored for UI and postprocess ShaderPrograms,
	//though maybe not for postprocess so as to allow for deferred shading
	maxLightCount = 16 //NOTE: THIS VALUE MUST MATCH THE SIZE OF THE LIGHT ARRAYS IN THE SHADERS

	constructor(gl, vShader, fShader){
		this.gl = gl
		this.compileShaders(gl, vShader, fShader);
	}

	getProgram(){
		return this.program;
	}

	//initially from common files
	compileShaders(gl, vShaderName, fShaderName) {
		function getShader(gl, shaderName, type) {
			var shader = gl.createShader(type),
				shaderScript = loadFileAJAX(shaderName);
			if (!shaderScript) {
				alert("Could not find shader source: "+shaderName);
			}
			gl.shaderSource(shader, shaderScript);
			gl.compileShader(shader);
	
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				alert(gl.getShaderInfoLog(shader));
				return null;
			}
			return shader;
		}
		this.vertexShader = getShader(gl, vShaderName, gl.VERTEX_SHADER)
		this.fragmentShader = getShader(gl, fShaderName, gl.FRAGMENT_SHADER);
		this.program = gl.createProgram();
	
		gl.attachShader(this.program, vertexShader);
		gl.attachShader(this.program, fragmentShader);
		gl.linkProgram(this.program);
	
		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			alert("Could not initialise shaders The error log is: " + gl.getProgramInfoLog( this.program ));
			console.error("Could not initialise shaders The error log is: " + gl.getProgramInfoLog( this.program ));
			return null;
		}
	};
}


