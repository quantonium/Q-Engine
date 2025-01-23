"use strict"

import { Renderer } from "./Renderer.js"

export class PostprocessRenderer extends Renderer {
	constructor(gTarget, program, postTexStr, postTexCount) {
		super(gTarget)
		this.switchCurrentShaderPrograms(program)
		this._setupInfo = {
			postTexStr: postTexStr,
			postTexCount: postTexCount
		}
	}

	_initProgram(postProcessProgram){
		super._initProgram(postProcessProgram)
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
	}
}