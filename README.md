# Q Engine

Q engine, or Qeng, is an open source WebGL 3D game engine in active development. The engine started as a final project for an intro to computer graphics class, and is since being updated with the goal of developing a highly versatile 3D engine, providing developers a wide range of capabilities to make 3D games and programs, designed in a modular manner intended to ease development.

The Q Engine was initially made as a class project and is being expanded with the latest features of Javascript ES6 for optimal software design and performance. Feel free to contribute by submitting a pull request with some changes!

## Using:
See the examples folder for examples on how to integrate into your own website.

Tldr: add into the header your own JS code such as userCode.js in the examples. In userCode, import Q from /engine/engine.js. Define some functions of your own, such as mouse or keyboard events, or a tick function- build a game or what not! Finally, call Q.engineInit(...) filling in the necessary parameters based on your HTML and your user code, and the engine will begin running!

Please note that the engine is currently undergoing major refactoring and may be broken in its current state. If you want to try to use the engine as it was before refactoring, check out where the project originated: https://andyherbert.net/engine and its mirrored github pages source https://github.com/andyman1222/andyman1222.github.io/tree/release/engine

## Current features:

*   Dynamic mesh updating- modify the location of any number of points in any mesh in real time
*   Material system- utilize PBR textures to create realistic materials, or specify parameters for many unique material types (emissive, transparent, specular and diffusive, unlit)
*   Sophisticated lighting- support currently for up to 16 lights, with customizable parameters to cast on materials differently, and negative and translucent lighting
*   Postrpocess layer- supports 10+ buffer inputs
*   Object system- create parent-child relationships with 3D primitives to control multiple objects as one
*   Gameplay update mechanics- tick-based updating with optional customizable functions to be called before or after tick/graphics/input
*   Buffered input controls- Handle all inputs by the player in the order they arrive, not missing any inputs
*   Separate graphics thread- Updates visuals independently from game logic
*   Camera system- swap between multiple cameras in the 3D environment, with orthographic and perspective options, and customized scaling and FOV

  

## Future/in development features:

*   Shadow mapping implemented with 3D textures
*   Simplified shader swapping mechanics for more customized materials and per-camera postprocessing effects and/or alternate vertex shading
*   Collision hit/overlap detection system
*   Gradient skyboxes
*   UI layers with interaction
*   Documentation
*   3D model importing
*   Possibly even a proprietary GUI development environment
