"use strict";

/**
 * Material points to index that defines its functionality in the shader, as well as any necessary arguments, such as specular, diffuse, etc.
 * Default: index 0, parameters=[baseColor=(.5,.5,.5,1), diffuse = (.5,.5,.5,1), specular = (.5,.5,.5,1), ambient = (.5,.5,.5,1), emissive = (0,0,0,1) (emissive alpha unused), misc = (shininess=1,parallax min=0 (default 8),parallax max=0 (default 32),parallax scale=0 (default .1)), texCoord=(uScale=1, vScale=1, uAdd=0, vAdd=0)]
 */

class _Material {
    _index
    _parameters
    _prevIndex
    _prevParameters
    _updated
    _lightMask
    constructor(index = 1, parameters = [vec4(.5, .5, .5, 1), vec4(.5, .5, .5, 1), vec4(.5, .5, .5, 1), vec4(.5, .5, .5, 1), vec4(0,0,0,1), vec4(1, 8, 32, .1), vec4(1, 1, 0, 0)], lightMask = 0x1) {
        this._index = index
        this._parameters = parameters
        this._lightMask = lightMask
    }
}

class _BasicMaterial extends _Material{
    constructor(baseColor = vec4(1,1,1,1), diffuse=1,specular=1,ambient=1, emissiveColor = vec4(0,0,0,1), shininess=1,txCoordScl=vec2(1,1),txCoordDisp=vec2(0,0)){
        super(1, [baseColor, 
            vec4(diffuse, diffuse, diffuse, 1), 
            vec4(specular, specular, specular, 1), 
            vec4(ambient, ambient, ambient, 1), 
            emissiveColor,
            vec4(shininess, 0, 0, 0), 
            vec4(txCoordScl[0], txCoordScl[1], txCoordDisp[0], txCoordDisp[1])])
    }
}

class _NoDraw extends _Material {
    constructor() {
        super(-1)
    }
}

class _SolidColorNoLighting extends _Material {
    constructor(color) {
        super(0, [vec4(color[0], color[1], color[2], color[3]),
        vec4(0, 0, 0, 1),
        vec4(0, 0, 0, 1),
        vec4(0, 0, 0, 1),
        vec4(0, 0, 0, 1),
        vec4(1, 8, 32, .1),
        vec4(1, 1, 0, 0)])
    }
}

class _ScaledTexMat extends _Material {
    constructor(parallax=false, uScale = 1, vScale = 1, uDisp=0, vDisp=0, minLayers=8, maxLayers=32, heightScale=.1, parameters = [vec4(1, 1, 1, 1), vec4(.5, .5, .5, 1), vec4(1, 1, 1, 1), vec4(1, 1, 1, 1), vec4(0,0,0,1), vec4(1, 8, 32, .1), vec4(1, 1, 0, 0)]){
        super(1, [parameters[0], parameters[1], parameters[2], parameters[3], parameters[4], vec4(parameters[5][0], minLayers, maxLayers, heightScale), vec4(uScale, vScale, uDisp, vDisp)])
        if(parallax) this._index = 2;
        else this._index = 3;
    }
}

class _ScaledTexMatNoLight extends _ScaledTexMat {
    constructor(parallax=false, uScale = 1, vScale = 1, uDisp=0, vDisp=0, minLayers=8, maxLayers=32, heightScale=.1, parameters = [vec4(1, 1, 1, 1), vec4(.5, .5, .5, 1), vec4(1, 1, 1, 1), vec4(1, 1, 1, 1), vec4(0,0,0,1), vec4(1, 8, 32, .1), vec4(1, 1, 0, 0)]){
        super(parallax, uScale, vScale, uDisp, vDisp, minLayers, maxLayers, heightScale, parameters)
        if(parallax) this._index = 4;
        else this._index = 5;
    }
}

/**
 * Representation of a texture with a base color, normal, displacement, AO (diffuse) and roughness (specular) images
 * Default _urls: [base color image, normal map, displacement map, AO/diffuse map, specular map, emissive map]
 */
class _ComplexTexture {
    _images = []
    _texs = []
    _urls = []
    _imgTexMap = new Map()
    _imgChange = new Map()
    _lightMasks = []
    _cameraMasks = []
    _bufferMasks = []
    _defaultColors = []

    _gl;
    _sw;
    _tw;
    _fm;
    _generateMip;
    _id = null;

    constructor(gl, urls, generateMip = true, sWrap = null, tWrap = null, filterMode = null, defaultColors=[vec4(255,255,255,255),vec4(0,0,127,255),vec4(255,255,255,255),vec4(255,255,255,255),vec4(0,0,0,255),vec4(0,0,0,255)], lightMasks = 0x1, cameraMasks = 0x1, bufferMasks = 0x1) {
        
        this._urls = urls
        this._defaultColors = defaultColors
        this._sw = sWrap
        if (sWrap == null) this._sw = gl.REPEAT;
        this._tw = tWrap
        if (tWrap == null) this._tw = gl.REPEAT;
        this._fm = filterMode
        if (filterMode == null) this._fm = gl.NEAREST_MIPMAP_LINEAR;
        this._generateMip = generateMip;
        this._gl = gl;
        this._init(lightMasks, cameraMasks, bufferMasks);
        

    }

    _init(lightMasks, cameraMasks, bufferMasks) {
        this._texs = []
        this._lightMasks = []
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
            for (i = 0; _complexTextures[i] != null; i++) { }
            _complexTextures[i] = this
            this._id = i
        }
    }
    _destroyTexture() {
        _complexTextures[this._id] = null
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