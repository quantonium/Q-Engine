"use strict";

import * as Common from "./common/helpers-and-types.js"
import * as MV from "./common/MVnew.js"

function getSphere(pos, radius, numFaces, numLayers, rot=Common.eulerToQuat(MV.vec3(0,1,0), 0), normFunction=MV.normalize){
	var nl = numLayers+1
	var r = [MV.add(pos, Common.rotateAbout(MV.vec3(0,radius[1],0), rot)), MV.subtract(pos, Common.rotateAbout(MV.vec3(0,radius[1],0), rot))]
	var p = []
	var tx = []
	var txy, txy2, tyi, ty, ty2
	for(var y = 1; y < nl; y++){
		txy = MV.mix(1, -1, y / nl)
		txy2 = MV.mix(1, -1, (y-1) / nl)
		tyi = Math.cos(MV.radians(txy * 90))
		ty = Math.sin(MV.radians(txy * 90))
		ty2 = Math.sin(MV.radians(txy2 * 90))
		for(var x = 0; x < numFaces; x++){
			var tmpx = ((x / numFaces) * 360)
			var txx = Math.sin(MV.radians(tmpx))
			var txx2 = Math.sin(MV.radians(((((x+1)%numFaces) / numFaces) * 360)))
			r.push(MV.add(pos, Common.rotateAbout(MV.mult(radius, MV.vec3(txx*tyi, ty, Math.cos(MV.radians(tmpx))*tyi)), rot)))
			if(y == 1){
				p.push(((y*numFaces)+x+2)-numFaces)
				tx.push(MV.vec2(txx, ty))
				p.push((((y*numFaces)+((x+1)%numFaces))+2)-numFaces)
				tx.push(MV.vec2(txx2, ty))
				p.push(0)
				tx.push(MV.vec2(txx,1))
			}
			else {
				
				p.push((((y-1)*numFaces)+x+2)-numFaces)
				tx.push(MV.vec2(txx,ty2))
				p.push(((y*numFaces)+x+2)-numFaces)
				tx.push(MV.vec2(txx,ty))
				p.push((((y*numFaces)+((x+1)%numFaces))+2)-numFaces)
				tx.push(MV.vec2(txx2,ty))
				
				p.push((((y*numFaces)+((x+1)%numFaces))+2)-numFaces)
				tx.push(MV.vec2(txx2,ty))
				p.push(((((y-1)*numFaces)+((x+1)%numFaces))+2)-numFaces)
				tx.push(MV.vec2(txx2,ty2))
				p.push((((y-1)*numFaces)+x+2)-numFaces)
				tx.push(MV.vec2(txx,ty2))
			}
			
		}
	}
	for(var x = 0; x < numFaces; x++){
		var tmpx = ((x / numFaces) * 360)
		var txx = Math.sin(MV.radians(tmpx))
		var txx2 = Math.sin(MV.radians(((((x+1)%numFaces) / numFaces) * 360)))
		
		p.push((((nl-1)*numFaces)+((x+1)%numFaces)+2)-numFaces)
		tx.push(MV.vec2(txx2, ty))
		p.push((((nl-1)*numFaces)+x+2)-numFaces)
		tx.push(MV.vec2(txx, ty))
		p.push(1)
		tx.push(MV.vec2(txx, -1))
	}

	var norm = normalsFromTriangleVerts(r, p, normFunction)
	var t = tanFromTriangleVerts(r, p, tx, normFunction)
	return{points: r, index: p, texCoords: tx, normals: norm, tangents: t}
}

function getCylinder(pos, radiusHalfHeight, numFaces, rot=eulerToQuat(MV.vec3(0,1,0), 0), normFunction = MV.normalize) {
	var facePoints = []
	for (var i = 0; i < numFaces; i++) {
		var tmp = ((i / numFaces) * 360)
		facePoints.push(MV.vec2(Math.sin(MV.radians(tmp)), Math.cos(MV.radians(tmp))))
	}
	var tmp = MV.vec2(radiusHalfHeight[0], radiusHalfHeight[2])
	var r = []
	var ind = []
	var tx = []
	var m = r.push(MV.subtract(pos, Common.rotateAbout(MV.vec3(0, radiusHalfHeight[1], 0), rot)))-1//always texcoord (0,0)
	var t = r.push(MV.add(pos, Common.rotateAbout(MV.vec3(0, radiusHalfHeight[1], 0), rot)))-1//always texcoord (0,0)
	var i1, i2, i3, i4
	var oi1, oi2
	
	for (var i = 0; i < facePoints.length; i++) {
		var f1 = facePoints[(i + 1) % facePoints.length][0]
		var f2 = facePoints[(i + 1) % facePoints.length][1]
		if (i == 0) {
			i1 = r.push(MV.add(Common.rotateAbout(MV.mult(radiusHalfHeight, MV.vec3(facePoints[i][0], 1, facePoints[i][1])), rot), pos))-1;
			i2 = r.push(MV.add(Common.rotateAbout(MV.mult(radiusHalfHeight, MV.vec3(facePoints[i][0], -1, facePoints[i][1])), rot), pos))-1;
			i3 = r.push(MV.add(Common.rotateAbout(MV.mult(radiusHalfHeight, MV.vec3(f1, 1, f2)), rot), pos))-1;
			i4 = r.push(MV.add(Common.rotateAbout(MV.mult(radiusHalfHeight, MV.vec3(f1, -1, f2)), rot), pos))-1;
			oi1 = i1
			oi2 = i2
		}
		else {
			i1 = i3
			i2 = i4
			if (i == facePoints.length - 1) {
				i3 = oi1
				i4 = oi2
			} else {
				i3 = r.push(MV.add(Common.rotateAbout(MV.mult(radiusHalfHeight, MV.vec3(f1, 1, f2)), rot), pos))-1;
				i4 = r.push(MV.add(Common.rotateAbout(MV.mult(radiusHalfHeight, MV.vec3(f1, -1, f2)), rot), pos))-1;
			}

		}
		ind.push(i1, i2, i3,
			i4, i3, i2,
			i2, m, i4,
			i3, t, i1)

		var d = Math.sin(MV.radians((i/facePoints.length)*360))
		var d2 = Math.sin(MV.radians((((i+1)%facePoints.length)/facePoints.length)*360))
		

		tx.push(MV.vec2(d, radiusHalfHeight[1]), MV.vec2(d, -radiusHalfHeight[1]), MV.vec2(d2, radiusHalfHeight[1]),
			MV.vec2(d2, -radiusHalfHeight[1]), MV.vec2(d2, radiusHalfHeight[1]), MV.vec2(d, -radiusHalfHeight[1]),
			MV.mult(tmp, facePoints[i]), MV.vec2(0, 0), MV.mult(tmp, facePoints[(i + 1) % facePoints.length]),
			MV.mult(tmp, facePoints[(i + 1) % facePoints.length]), MV.vec2(0, 0), MV.mult(tmp, facePoints[i]))
	}

	var norm = Common.normalsFromTriangleVerts(r, ind, normFunction)
	var t = Common.tanFromTriangleVerts(r, ind, tx, normFunction)
	return { points: r, index: ind, texCoords: tx, normals: norm, tangents: t};
}

/**
 * returns line segments corresponding to a wireframe cube, optionally with diagonals
 * @param {MV.vec3} pos center of the rectangle
 * @param {MV.vec3} extent size of the rectangle from center to edge
 */
function getRect(pos, extent, rot=Common.eulerToQuat(MV.vec3(0,1,0), 0), normFunction = MV.normalize) {
	//0
	var blb = MV.add(pos, Common.rotateAbout(MV.vec3(-extent[0], -extent[1], -extent[2]), rot))
	//1
	var flb = MV.add(pos, Common.rotateAbout(MV.vec3(-extent[0], -extent[1], extent[2]), rot))
	//2
	var frb = MV.add(pos, Common.rotateAbout(MV.vec3(extent[0], -extent[1], extent[2]), rot))
	//3
	var frt = MV.add(pos, Common.rotateAbout(MV.vec3(extent[0], extent[1], extent[2]), rot))
	//4
	var brt = MV.add(pos, Common.rotateAbout(MV.vec3(extent[0], extent[1], -extent[2]), rot))
	//5
	var blt = MV.add(pos, Common.rotateAbout(MV.vec3(-extent[0], extent[1], -extent[2]), rot))
	//6
	var brb = MV.add(pos, Common.rotateAbout(MV.vec3(extent[0], -extent[1], -extent[2]), rot))
	//7
	var flt = MV.add(pos, Common.rotateAbout(MV.vec3(-extent[0], extent[1], extent[2]), rot))
	
	var ind = []
	var tx = []
	var p = [blb, flb, frb, frt, brt, blt, brb, flt]
	ind.push(0, 6, 2,
		2, 1, 0, //bottom face (-y)
		
		4, 5, 3,
		7, 3, 5, //top face (+y)

		6, 0, 4,
		5, 4, 0, //back face (-z)

		1, 2, 3,
		3, 7, 1, //front face (+z)

		5, 0, 7,
		1, 7, 0, //left face (-x)

		6, 4, 3,
		3, 2, 6) //right face (+x)

	tx.push(MV.vec2(-extent[0],extent[2]), MV.vec2(extent[0], extent[2]), MV.vec2(extent[0],-extent[2]),
	MV.vec2(extent[0],-extent[2]), MV.vec2(-extent[0], -extent[2]), MV.vec2(-extent[0],extent[2]),
	
	MV.vec2(extent[0],-extent[2]), MV.vec2(-extent[0], -extent[2]), MV.vec2(extent[0],extent[2]),
	MV.vec2(-extent[0],extent[2]), MV.vec2(extent[0], extent[2]), MV.vec2(-extent[0],-extent[2]),

	MV.vec2(extent[0],-extent[1]), MV.vec2(-extent[0], -extent[1]), MV.vec2(extent[0], extent[1]),
	MV.vec2(-extent[0], extent[1]), MV.vec2(extent[0], extent[1]), MV.vec2(-extent[0], -extent[1]),
	
	MV.vec2(extent[0],-extent[1]), MV.vec2(-extent[0],-extent[1]), MV.vec2(-extent[0],extent[1]),
	MV.vec2(-extent[0],extent[1]), MV.vec2(extent[0],extent[1]), MV.vec2(extent[0],-extent[1]),
	
	MV.vec2(extent[2],extent[1]), MV.vec2(extent[2], -extent[1]), MV.vec2(-extent[2],extent[1]),
	MV.vec2(-extent[2],-extent[1]), MV.vec2(-extent[2], extent[1]), MV.vec2(extent[2],-extent[1]),
	
	MV.vec2(-extent[2],-extent[1]), MV.vec2(-extent[2], extent[1]), MV.vec2(extent[2],extent[1]),
	MV.vec2(extent[2],extent[1]), MV.vec2(extent[2], -extent[1]), MV.vec2(-extent[2],-extent[1]))
	var norm = normalsFromTriangleVerts(p, ind, normFunction)
	var t = tanFromTriangleVerts(p, ind, tx, normFunction)
	return{points: p, index: ind, texCoords: tx, normals: norm, tangents: t}
}

//Adds the val to all elements in arr
function _addToPointIndArr(arr, val){
	var r = []
	for(var x = 0; x < arr.length; x++)
		r.push(arr[x]+val)
	return r
}

//Merge two arrays into one
function _mergePointArrs(firstArr, secArr){
	return [...firstArr, ...secArr]
}