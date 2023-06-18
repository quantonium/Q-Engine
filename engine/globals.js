////CONSTANTS
"use strict";
var _defaultAspect = 16 / 9
var _maxLightCount = 64 //NOTE: THIS VALUE MUST MATCH THE SIZE OF THE LIGHT ARRAYS IN THE SHADERS
var _fisqrt = {y: new Float32Array( 1 ), i: null}
_fisqrt.i = new Int32Array( _fisqrt.y.buffer )
////DO-NOT-TOUCH VARIABLES (updated constantly in the engine)
var _time = 0;
var _id = 0;
var _requestId = 0;
var _tickEnabled = true;
//var _offsetThreshold = 99; //Used to reduce array sizes created with flatten because otherwise JS will waste teime garbage collecting


////USER INPUT
var _keyBuffer = [];
var _mouseBuffer = []


////ENGINE ELEMENTS
var _objects = new Map();
var _buffers = [];
var _cameras = [];
var _lights = [];
var _complexTextures = [];
var _bounds = []

//WEBGL EXTENSIONS
var _FLOATING_EXT;
var _FLOATING_BUF_EXT;


////COLLISION VARIABLES
var _maskMap = []


////DEFAULT RENDERING ELEMENTS
var _gl;
var _canvas;
var _bData;
var _mainCamera;
var _defaultProgram;
var _postProcessProgram;


////DEFAULT GAME OBJECTS
var _coords;


////DEBUG CONSOLE VARS
var _consoleBuffer = []
var _consoleBufferLock = false
var _removedMessages = 0, _maxConsoleBuffer = 1000


////USER-DEFINED FUNCTIONS
var _userTickFunction, _userInitFunction, _userPostTickFunction, _userKeyFunction, _userMouseFunction