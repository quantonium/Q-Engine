"use strict"

import vec4 from "./common/MVnew.js"

complexTextures = [];

/**
 * Representation of a texture with a base color, normal, displacement, AO (diffuse) and roughness (specular) images
 * Default urls: [base color image, normal map, displacement map, AO/diffuse map, specular map, emissive map]
 */
export class ComplexTexture {
    _images = []
    _texs = []


    urls = []
    _imgTexMap = new Map()
    _imgChange = new Map()

    //WIP light mask feature allowing textures to change depending on the light
    _lightMasks = []
    _cameraMasks = []
    _bufferMasks = []
    _defaultColors = []

    //webgl ref
    _gl;

    //sWrap mode
    sw;

    //tWrap mode
    tw;

    //filterMode
    fm;

    //generates mips for this texture if true
    generateMip;

    
    _id = null;

    constructor(gl, urls, generateMip = true, sWrap = null, tWrap = null, filterMode = null, defaultColors=[vec4(255,255,255,255),vec4(0,0,127,255),vec4(255,255,255,255),vec4(255,255,255,255),vec4(0,0,0,255),vec4(0,0,0,255)], lightMasks = 0x1, cameraMasks = 0x1, bufferMasks = 0x1) {
        
        this.urls = urls
        this.defaultColors = defaultColors
        this.sw = sWrap
        if (sWrap == null) this._sw = gl.REPEAT;
        this.tw = tWrap
        if (tWrap == null) this._tw = gl.REPEAT;
        this.fm = filterMode
        if (filterMode == null) this._fm = gl.NEAREST_MIPMAP_LINEAR;
        this.generateMip = generateMip;
        this.gl = gl;
        this._init(lightMasks, cameraMasks, bufferMasks);
        

    }

    _init(lightMasks, cameraMasks, bufferMasks) {
        this._texs = []
        this.lightMasks = []
        this._cameraMasks = []
        this._bufferMasks = []
        for (var x = 0; x < this._urls.length; x++) {
            if(lightMasks instanceof Array)
                this._lightMasks.push(lightMasks[x%lightMasks.length])
            else this._lightMasks.push(lightMasks)
            if(cameraMasks instanceof Array)
                this._cameraMasks.push(cameraMasks[x%cameraMasks.length])
            else this._cameraMasks.push(cameraMasks)
            if(bufferMasks instanceof Array)
                this._bufferMasks.push(bufferMasks[x%bufferMasks.length])
            else this._bufferMasks.push(bufferMasks)
            var i = this._texs.push(_gl.createTexture()) - 1;
            this._gl.bindTexture(this._gl.TEXTURE_2D, this._texs[i]);
            if (this._images[x] == null || this._images[a].src == null) {
                this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA,
                    1, 1, 0, this._gl.RGBA, this._gl.UNSIGNED_BYTE,
                    new Uint8Array(this._defaultColors[x]));
                if (this._images[x] == null) var a = this._images.push(new Image()) - 1
                else var a = x
                this._images[a].onload = function (e) {
                    var image = e.target
                    this._imgChange.set(image, true)

                }.bind(this);
                this._imgTexMap.set(this._images[a], this._texs[i])
                this._imgChange.set(this._images[a], false)
                if(this._urls[x] != null) this._images[a].src = this._urls[x];
            } else {
                this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA,
                    this._gl.RGBA, this._gl.UNSIGNED_BYTE, this._images[x]);
                if (this._generateMip) this._gl.generateMipmap(this._gl.TEXTURE_2D);
                this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, this._sw);
                this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, this._tw);
                this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, this._fm);
                this._imgChange.set(this._images[x], false)
                this._imgTexMap.set(this._images[a], this._texs[i])
            }
        }
        if (this.id == null) {
            var i = 0;
            for (i = 0; complexTextures[i] != null; i++) { }
            complexTextures[i] = this
            this._id = i
        }
    }
    _destroyTexture() {
        complexTextures[this._id] = null
        delete this;
    }

    _applyTexture(locations, bufferMask, cameraMask) {
        for (var x = 0; x < this._texs.length; x++) {
            if((cameraMask & bufferMask & this._cameraMasks[x] & this._bufferMasks[x]) != 0){
                if (this._imgChange.get(this._images[x]) == true) {
                    this._gl.bindTexture(this._gl.TEXTURE_2D, this._texs[x]);
                    this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA,
                        this._gl.RGBA, this._gl.UNSIGNED_BYTE, this._images[x]);
                    if (this._generateMip) this._gl.generateMipmap(this._gl.TEXTURE_2D);
                    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, this._sw);
                    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, this._tw);
                    this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, this._fm);
                    this._imgChange.set(this._images[x], false)
                }
                this._gl.activeTexture(this._gl.TEXTURE0 + x);
                this._gl.bindTexture(this._gl.TEXTURE_2D, this._texs[x]);
                this._gl.uniform1i(locations[x], x);
            }
        }
    }
}