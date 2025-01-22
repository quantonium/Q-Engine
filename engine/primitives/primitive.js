"use strict";

import { mult, add, subtract, vec3, scale, inverse4, equal } from "../common/MVnew.js";
import { rotateAbout, addRotation, quatToMat4, Quaternion, invQuat, eulerToQuat, mat4ToTransform, quatEqual } from "../common/helpers-and-types.js";

/**
 * something in 3D space that can be attached to other primitives
 */
export class Primitive {
	//Location of the primitive
	transform = { pos: vec3(), rot: Quaternion(0, 1, 0, 0), scl: vec3() };

	//Subobject primitives which share the transform defined by the primitive
	connectedObjects = new Set()

	//The previous parent primitive which this primitive is attached to via connectedObjects before the current tick
	_prevParent

	//A list of objects to remove on tick, private
	_addRemoveObjects = []

	//The primitive which this object is connected to
	parent = null

	_prevTransform;
	_updated;

	//If true, the z rotation is flipped, handles some world transform issues.
	flipZRotation = false;

	//Function(delta, time) run to update the object in the main tick
	customTickFunc = function (delta, time) { }
	//Function(delta, time) that runs before customTickFunc
	customPreTick = function (delta, time) { }
	//Function(delta, time) that runs after customTickFunc
	customPostTick = function (delta, time) { }

	_cameraMask = 0x1;
	_bufferMask = 0x1;
	_lightMask = 0x1;

	constructor(transform, bufferMask = 0x1, cameraMask = 0x1, lightMask = 0x1) {
		this.transform = transform
		this._bufferMask = bufferMask
		this._cameraMask = cameraMask
		this._lightMask = lightMask

	}

	/**
	 * gets transform adjusted by all parents
	 */

	getWorldTransform(flipZ = false) {
		if (this.parent != null) {
			var p = this.parent.getWorldTransform(!this.parent.flipZRotation)
			if ((!this.parent.flipZRotation || flipZ) && !(!this.parent.flipZRotation && flipZ))
				return {
					pos: add(rotateAbout(mult(this.transform.pos, p.scl), p.rot), p.pos),
					rot: addRotation(p.rot, this.transform.rot),
					scl: mult(p.scl, this.transform.scl)
				}
			else return {
				pos: add(mult(vec3(1, 1, -1), rotateAbout(mult(mult(this.transform.pos, vec3(1, 1, -1)), p.scl), p.rot)), p.pos),
				rot: addRotation(p.rot, this.transform.rot),
				scl: mult(p.scl, this.transform.scl)
			}
		}
		return { pos: mult(this.transform.pos, vec3(1, 1, 1)), rot: this.transform.rot, scl: this.transform.scl }
	}

	getModelMat(flipZ = false) {
		var t = this.getWorldTransform(flipZ);
		//var tmpf = mult(forward(this.transform.rot),vec3(1,1,flipZ?-1:1)), tmpu = mult(up(this.transform.rot), vec3(1,1,flipZ?-1:1))

		return mult(
			mult(translate(t.pos[0], t.pos[1], -t.pos[2]),
				scale(t.scl[0], t.scl[1], t.scl[2])),
			quatToMat4(t.rot))
	}

	/**
	 * Attaches own object to a new parent p
	 * @param {*} p the new parent to attach to 
	 * @param {*} attachType keepWorld: converts world transform into relative transform and sets own transform; keepRelative: Calculates relative transform based on current transform and parent's 
	 * @param {*} newAttachTransform Optional. Set a relative transform if attachType = "relative". If empty, set to parent transform
	 */
	attachSelfToParent(p, attachType, newAttachTransform = null) {
		this.detach("keepWorld")
		var wt = this.getWorldTransform()
		var pt = p.getWorldTransform()
		var it = mat4ToTransform(inverse4(p.getModelMat()))
		switch (attachType.pos) {
			case "keepWorld":
				this.transform.pos = rotateAbout(subtract(wt.pos, pt.pos), it.rot)
				//console.log(this.transform.pos)
				break
			case "relative":
				if (newAttachTransform == null)
					this.transform.pos = vec3(0, 0, 0)
				else
					this.transform.pos = newAttachTransform.pos
				break
			case "dontChange":
				break
		}

		switch (attachType.rot) {
			case "keepWorld":
				this.transform.rot = addRotation(wt.rot, invQuat(pt.rot))
				break
			case "relative":
				if (newAttachTransform == null)
					this.transform.rot = eulerToQuat(vec3(1, 0, 0), 0)
				else
					this.transform.rot = newAttachTransform.rot
				break
			case "dontChange":
				break
		}

		switch (attachType.scl) {
			case "keepWorld":
				this.transform.scl = vec3(wt.scl[0] / pt.scl[0], wt.scl[1] / pt.scl[1], wt.scl[2] / pt.scl[2])
				break
			case "relative":
				if (newAttachTransform == null)
					this.transform.scl = vec3(1, 1, 1)
				else
					this.transform.scl = newAttachTransform.scl
				break
			case "dontChange":
				break
		}
		this.parent = p
		//console.log(p.connectedObjects)
		this.parent._addRemoveObjects.push(this)
		p.connectedObjects.add(this)
		this._updated = true
		p._updated = true

	}

	attachChildToSelf(child, attachType, newAttachTransform = null) {
		child.attachSelfToParent(this, attachType, newAttachTransform)
	}

	detach(detachType) {
		if (this.parent == null) return
		var newTransform = this.transform
		var wt = this.getWorldTransform()
		switch (detachType.pos) {
			case "keepWorld":
				newTransform.pos = wt.pos
		}
		switch (detachType.rot) {
			case "keepWorld":
				newTransform.rot = wt.rot
		}
		switch (detachType.scl) {
			case "keepWorld":
				newTransform.scl = wt.scl
		}
		this.transform = newTransform
		this.parent._updated = true
		this.parent._addRemoveObjects.push(this)
		this.parent.connectedObjects.delete(this)
		this.parent = null
		this._updated = true
	}

	_preTick(delta, time) {
		if ((this._prevTransform == null) || (!equal(this.transform.pos, this._prevTransform.pos) || !quatEqual(this.transform.rot, this._prevTransform.rot) || !equal(this.transform.scl, this._prevTransform.scl)))
			this._updated = true
		this.customPreTick(delta, time)
	}

	_onTick(delta, time) {
		this.customTickFunc(delta, time)
	}

	_postTick(delta, time) {
		if (this._updated) {
			this._updated = false
			this._prevTransform = this.transform
			this._prevParent = this.parent
			this._addRemoveObjects = []
		}
		this.customPostTick(delta, time)
	}
}