"use strict"

import {vec3, mult, subtract, add, vec4} from "./common/MVnew.js"
import {vec3to4} from "./common/helpers-and-types.js"
import {getSphere, getRect} from "./geometry.js"


export const BoundsType = {
	RECT : "rect",
	SPHERE: "sphere"
}

/**
 * extremely rough class representing visibility Bounds for an Object.
 * Todo: implement a proper transform so that this class can be used for collision bounds
 */
export class Bounds {
	//static _bounds = []

	//constant bound types
	static RECT = BoundsType.RECT
	static SPHERE = BoundsType.SPHERE

	//the actual bound type
	type;

	//root position of the bound relative to parentObject
	pos;

	//extent of the bound, either as a radius or vector
	extent;

	//the object which this bound is associated with
	parentObject;

	//The points which make up this bound. Use updateBounds(pointInfo) to update.
	shape;

	//If true, not set to draw when in debug view
	noDraw = false;


	constructor(pointInfo, type, parentObject) {
		this.type = type;
		this.parentObject = parentObject;
		this.updateBounds(pointInfo);
		//get center of all points rendered

	}

	//Updates the shape based on the points of pointInfo
	updateBounds(pointInfo) {
		this._pos = vec3(0, 0, 0)
		if (pointInfo.length > 0) {
			var min = vec3(pointInfo[0][0], pointInfo[0][1], pointInfo[0][2]) //POINTERS PLS
			var max = vec3(pointInfo[0][0], pointInfo[0][1], pointInfo[0][2])
			//get min and max x, y, z values
			for (var i = 0; i < pointInfo.length; i++) {
				for (var ii = 0; ii < pointInfo[i].length; ii++) {
					if (pointInfo[i][ii] > max[ii]) { max[ii] = pointInfo[i][ii] }
					if (pointInfo[i][ii] < min[ii]) { min[ii] = pointInfo[i][ii] }
				}
			}

			this.pos = mult(.5, add(min, max))
			//(this._pos)
			this.extent = mult(.5, subtract(max, min));
			if (this.type == Bounds.SPHERE) {
				//get furthest point from points rendered

				this.shape = getSphere(this.pos, this.extent, 5, 5)

			} else if (this.type == Bounds.RECT) {
				this.shape = getRect(this.pos, this.extent);
				//set pos to the middle of the min and max points

			} else throw "Only Bounds types supported now are RECT and SPHERE"
		} else {
			this.extent = vec3(0, 0, 0)
			this.noDraw = true
		}
	}

	//renders bounds to a given renderer
	renderBounds(renderer) {
		buf._types.push(buf._gTarget.LINE_LOOP);
		var b = this.bounds.getGraphicsDrawBounds();
		buf._offsets.push(b.points.length)
		for (var i = 0; i < b.points.length; i++) {
			buf._points.push(b.points[i])
			var tmp = new SolidColorNoLighting(b.colors[i % b.colors.length]);
			buf._loadMaterial(tmp, false, wireframe || noLighting)
			buf._normals.push(vec3(1, 0, 0))//Bounds have no normals, this is just filler
			buf._tangents.push(vec3(0, 1, 0))
			buf._texCoords.push(vec2(0, 0)) //Bounds have no textures, again just filler
			//buf_bitangents.push(vec3(0, 0, 1))
		}
	}

	//defines points to draw _Bounds, manually
	getDrawBounds(multMat = vec3(1, 1, 1)) {
		var r = []
		if (!this.noDraw) {
			var tmp = this.shape;
			for (var i = 0; i < tmp.index.length; i++)
				r.push(mult(multMat, vec3to4(tmp.points[tmp.index[i]])))
		}
		return r
	}

	//defines points to draw _Bounds, manually
	getGraphicsDrawBounds(boundsColor = vec4(1, 1, 0, 1)) {
		var r = { points: [], colors: [] }
		if (!this.noDraw) {
			var tmp = this.shape;
			r.colors.push(boundsColor);
			for (var i = 0; i < tmp.index.length; i++)
				r.points.push(vec3to4(tmp.points[tmp.index[i]]))
		}
		return r
	}

	
}

export function getBounds() {
	return Bounds._bounds
}