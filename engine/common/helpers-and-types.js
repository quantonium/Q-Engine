"use strict";

import {vec3, vec4, mult, add, cross, length, subtract, normalize, dot, radians} from "./MVnew.js"

//from https://gist.github.com/jhermsmeier/2269511
//Note: use 0x5fe6eb50c7aa19f9 as magic number if going to use 64 bit arrays in globals.js _fisqrt
function _qSqrt(n, p=1) {

    p = p || 1

    _fisqrt.y[0] = n
    _fisqrt.i[0] = 0x5f375a86 - (_fisqrt.i[0] >> 1)

    while (p--) {
        _fisqrt.y[0] = _fisqrt.y[0] * (1.5 * ((n * 0.5) * _fisqrt.y[0] * _fisqrt.y[0]))
    }

    return _fisqrt.y[0]
}

export function fastNorm(u, excludeLastComponent) {
    if (u.type != 'vec3' && u.type != 'vec4') {
  
      throw "normalize: not a vector type";
    }
    switch (u.type) {
      case 'vec2':
        var len = _qSqrt(u[0] * u[0] + u[1] * u[1]);
        var result =vec2(u[0] * len, u[1] * len);
        return result;
        break;
      case 'vec3':
        if (excludeLastComponent) {
          var len = _qSqrt(u[0] * u[0] + u[1] * u[1]);
          var result =vec3(u[0] * len, u[1] * len, u[2]);
          return result;
          break;
        }
        else {
          var len = _qSqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
          var result =vec3(u[0] * len, u[1] * len, u[2] * len);
          return result;
          break;
        }
      case 'vec4':
        if (excludeLastComponent) {
          var len = _qSqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
          var result =vec4(u[0] * len, u[1] * len, u[2] * len, u[3]);
          return result;
          break;
        }
        else {
          var len = _qSqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2] + u[3] * u[3]);
          var result =vec4(u[0] * len, u[1] * len, u[2] * len, u[3] * len);
          return result;
          break;
        }
    }
  }

export function clamp(num, min, max) {
    if (num > max) return max;
    if (num < min) return min;
    return num;
}

/**
 * returns quat1*quat2 as Quaternions
 * from https://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/arithmetic/index.htm
 * @param {Quaternion} quat1 
 * @param {Quaternion} quat2 
 */
export function quatmult(quat1, quat2) {
    var w1 = quat1.w, w2 = quat2.w;
    var v1 =vec3(quat1.x, quat1.y, quat1.z), v2 =vec3(quat2.x, quat2.y, quat2.z)

    var wn = w1 * w2 - (dot(v1, v2))
    var vn = (MV.add(MV.add(MV.cross(v1, v2),mult(w1, v2)),mult(w2, v1)))

    return Quaternion(wn, vn[0], vn[1], vn[2])
}

/**
 * normalizes Quaternion just like a normalvector
 * @param {*} q 
 */
export function quatNorm(q) {
    var n = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z)
    return Quaternion(q.w / n, q.x / n, q.y / n, q.z / n)
}

export function Quaternion(w, x, y, z) {
    return { w: w, x: x, y: y, z: z }
}

export function quatEqual(q1, q2) {
    return q1.w == q2.w && q1.x == q2.x && q1.y == q2.y && q1.z == q2.z
}

/**
 * convertes angle and axis to quaternion
 * @param {*} rot 
 * @return {Quaternion} (w, x, y, z)
 */
export function eulerToQuat(axis, angle, normFunction = normalize) {
    if (length(axis) == 0) throw "Undefined axis (0,0,0)"
    var a =mult(axis,vec3(1, -1, 1))
    var c = Math.cos(radians(angle % 360) / 2)
    var s = Math.sin(radians(angle % 360) / 2)
    var n = normFunction(a)
    return Quaternion(c, n[0] * s, n[1] * s, n[2] * s)
}


/**
 * converts Quaternion (w, x, y, z) tomat4 for rotation
 * @param {*} rot 
 */
export function quatTomat4(rot) {
    var v = quatNorm(rot)
    var qw = v.w
    var qx = v.x
    var qy = v.y
    var qz = v.z
    returnmat4(
        1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw), 0,
        2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw), 0,
        2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy), 0,
        0, 0, 0, 1);
}

/**
 * converts Quaternion tomat3 for rotation
 * @param {*} rot 
 */
export function quatTomat3(rot) {
    var v = quatNorm(rot)
    var qw = v.w
    var qx = v.x
    var qy = v.y
    var qz = v.z
    returnmat3(
        1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw),
        2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw),
        2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy)
    );
}

export function invQuat(quat) {
    var ql = Math.sqrt(quat.w * quat.w + quat.x * quat.x + quat.y * quat.y + quat.z * quat.z)
    return Quaternion(quat.w / ql, -quat.x / ql, -quat.y / ql, -quat.z / ql)
}

/**based on https://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/ */
export function matToQuat(mat) {
    var tr = mat[0][0] + mat[1][1] + mat[2][2], qw, qx, qy, qz, S

    if (tr > 0) {
        S = Math.sqrt(tr + 1.0) * 2; // S=4*qw 
        qw = 0.25 * S;
        qx = (mat[2][1] - mat[1][2]) / S;
        qy = (mat[0][2] - mat[2][0]) / S;
        qz = (mat[1][0] - mat[0][1]) / S;
    } else if ((mat[0][0] > mat[1][1]) & (mat[0][0] > mat[2][2])) {
        S = Math.sqrt(1.0 + mat[0][0] - mat[1][1] - mat[2][2]) * 2; // S=4*qx 
        qw = (mat[2][1] - mat[1][2]) / S;
        qx = 0.25 * S;
        qy = (mat[0][1] + mat[1][0]) / S;
        qz = (mat[0][2] + mat[2][0]) / S;
    } else if (mat[1][1] > mat[2][2]) {
        S = Math.sqrt(1.0 + mat[1][1] - mat[0][0] - mat[2][2]) * 2; // S=4*qy
        qw = (mat[0][2] - mat[2][0]) / S;
        qx = (mat[0][1] + mat[1][0]) / S;
        qy = 0.25 * S;
        qz = (mat[1][2] + mat[2][1]) / S;
    } else {
        S = Math.sqrt(1.0 + mat[2][2] - mat[0][0] - mat[1][1]) * 2; // S=4*qz
        qw = (mat[1][0] - mat[0][1]) / S;
        qx = (mat[0][2] + mat[2][0]) / S;
        qy = (mat[1][2] + mat[2][1]) / S;
        qz = 0.25 * S;
    }
    return Quaternion(qw, qx, qy, qz)
}

export function mat4ToTransform(m) {
    var pos =vec3(m[0][3], m[1][3], m[2][3])
    var scl =vec3(length(MV.vec3(m[0][0], m[0][1], m[0][2])),
        length(MV.vec3(m[1][0], m[1][1], m[1][2])),
        length(MV.vec3(m[2][0], m[2][1], m[2][2])))
    var rot = matToQuat(m)

    return { pos: pos, scl: scl, rot: rot }
}

export function quatLerp(u, v, s) {
    var result = new Array(u.length);
    for (var i = 0; i < u.length; ++i) {
        result[i] = (1.0 - s) * u[i] + s * v[i];
    }
    return Quaternion((1 - s) * u["w"] + s * v["w"], (1 - s) * u["x"] + s * v["x"], (1 - s) * u["y"] + s * v["y"], (1 - s) * u["z"] + s * v["z"]);
}

export function quaternionToEuler(quat) {
    var roll = ((Math.atan2(2 * (quat.w * quat.x + quat.y * quat.z), (1 - (2 * (quat.x * quat.x + quat.y * quat.y))))) / (2 * Math.PI)) * 360.0
    var pitch = ((Math.asin(2 * (quat.w * quat.y - quat.z * quat.x))) / (2 * Math.PI)) * 360.0
    var yaw = ((Math.atan2(2 * (quat.w * quat.z + quat.y * quat.x), (1 - (2 * (quat.y * quat.y + quat.z * quat.z))))) / (2 * Math.PI)) * 360.0
    returnvec3(roll, pitch, yaw)
}

/**
 * rotatesvec3 about a quaternion
 */
export function rotateAbout(vec, quat) {
    var p = Quaternion(0, vec[0], vec[1], vec[2])
    var rp = Quaternion(quat.w, -quat.x, -quat.y, -quat.z)
    var e = quatMV.mult(quatMV.mult(quat, p), rp)
    //(e)
    returnvec3(e.x, e.y, e.z)
}

/**
 * return forwardvector of a quaternion (w, x, y, z)
 * This is just the 3rd column of the rotation matrix, but I am not using that to avoid using a loop
 * @param {*} rot quaternion
 */
export function forward(rot) {
    return rotateAbout(MV.vec3(0, 0, 1), rot)
}

/**
 * return upvector of a quaternion (w, x, y, z)
 * @param {*} rot 
 */
export function up(rot) {
    return rotateAbout(MV.vec3(0, 1, 0), rot)
}

/**
 * return rightvector of a quaternion (w, x, y, z)
 * @param {*} rot 
 */
export function right(rot) {
    return rotateAbout(MV.vec3(1, 0, 0), rot)
}

/**
 * returns quaternion initRot rotated by deltaRot
 * @param {quaternion} initRot 
 * @param {quaternion} deltaRot 
 */
export function addRotation(initRot, deltaRot) {
    //(quatMV.mult(deltaRot, initRot))
    return quatMV.mult(deltaRot, initRot)
}

/**
 * loop-free midpoint
 * @param {*} points 2, 3, or 4 points. Errors if more than 3. Precision to 4 points.
 */
export function getMidpoint(points) {

    if (arguments.length == 1) return arguments[0]
    if (arguments.length == 2) returnmult(.5,add(arguments[0], arguments[1]))
    if (arguments.length == 3) returnmult(.3333,add(MV.add(arguments[0], arguments[1]), arguments[2]))
    if (arguments.length == 4) returnmult(.25,add(MV.add(arguments[0], arguments[1]),add(arguments[2], arguments[3])))
    throw "Function only supports list of length 1-4"
}

/**
 * Returns a 4-MV.vector representation of a plane- (x, y, z, b)
 * @param {*} points 3 points
 */
export function getPlane(points, normFunction = normalize) {
    if (points.length == 3) {
        var cp =cross(MV.subtract(points[2], points[0]),subtract(points[1], points[0]))
        var d =dot(cp, points[2])
        return normFunction(MV.vec4(cp[0], cp[1], cp[2], d))
    }
    throw "Can only get plane intersecting 3 points."
}

/**
 * Returns intersection info regarding the intersection between avec4 plane and avec3 line
 * @param {*} planevec4 plane (x, y, z, b) normalized
 * @param {*} linevec3 line array consisting of 2 endpoints
 * via https://stackoverflow.com/questions/5666222/3d-line-plane-intersection
 */
export function linearIntersect(plane, line) {
    if (line.length != 2) throw "Can't make a line without 2 points"
    var plane3 =vec3(plane[0], plane[1], plane[2])
    var u =subtract(line[1], line[0])
    var d =dot(plane3, u)

    if (MV.dot != 0) {
        var tmp =mult(-plane[3], plane3)
        tmp =subtract(line[0], tmp)
        tmp = -MV.dot(plane3, tmp) / d
        u =mult(tmp, u)
        returnadd(line[0], u)
    }
    else return null

}

//Removes the last channel of a vec4
export function vec4to3(v4) {
    returnvec3(v4[0], v4[1], v4[2])
}

//Converts a vec3 to 4 by adding a channel of value 1
export function vec3to4(v3) {
    returnvec4(v3[0], v3[1], v3[2], 1)
}

export function bin2dec(bin) {
    return parseInt(bin, 2).toString(10);
}

export function normalsFromTriangleVerts(v, i, normFunction =normalize) {
    var r = []
    for (var x = 0; x < i.length; x += 3) {
        var c = normFunction(MV.cross(MV.subtract(v[i[x + 1]], v[i[x]]),subtract(v[i[x + 2]], v[i[x]])))
        r.push(c)
    }
    return r
}

export function tanFromTriangleVerts(v, i, t, normFunction =normalize) {
    var r = []
    for (var x = 0; x < i.length; x += 3) {
        var e1 =subtract(v[i[x + 1]], v[i[x]]), e2 =subtract(v[i[x + 2]], v[i[x]]) //MV.vec3
        var t1 =subtract(t[x+1], t[x]), t2 =subtract(t[x+2], t[x]) //MV.vec2
        var f = 1.0 / ((t1[0]* t2[1])-(t2[0]*t1[1]))
        r.push(normFunction(MV.mult(f,subtract(MV.mult(t2[1], e1),mult(t1[1], e2)))))
        
    }
    return r
}

/**
 * Flips the u and v values of an array of texcoords
 */
function _flipTexCoords(r){
    var e = []
    for(var i = 0; i < r.length; i++){
        e.push(MV.vec2(r[i][1], r[i][0]))
    }
    return e
}

///////////////////////////////////////////////////

let _id = 0;

export function newID() { return _id++ }


export function DrawInfo(pointIndex, matIndex, texCoords, normals, tangents, textureIndex = -1, type=_gl.TRIANGLES, bufferMask = 0x1, cameraMask = 0x1, lightMask = 0x1){
    return {pointIndex: pointIndex, matIndex: matIndex, texCoords: texCoords, normals: normals, tangents: tangents, textureIndex: textureIndex, type: type, 
        bufferMask: bufferMask, cameraMask: cameraMask, lightMask: lightMask}
}

export function Transform(pos=MV.vec3(0,0,0), rot=Quaternion(1,0,0,0), scl=MV.vec3(1,1,1)){
    return {pos: pos, rot: rot, scl: scl}
}
