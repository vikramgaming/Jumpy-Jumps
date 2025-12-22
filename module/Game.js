export class Entity {
	/**
	 * @param {string} name
	 * @param {number} x
	 * @param {number} y
	 * @param {number} width
	 * @param {number} height
	 * @param {HTMLImageElement} idle
	 * @param {HTMLImageElement[]} walk
	 */
	constructor(name, hp, x, y, width, height, idle, walk) {
		/** @type {string} */
		this.name = name;

		/** @type {number} */
		this.x = x;

		/** @type {number} */
		this.y = y;

		/** @type {number} */
		this.maxHp = hp;

		/** @type {number} */
		this.hp = hp;

		this.velocityX = 0;
		this.velocityY = 0;

		// === condition ===
		this.isWalking = false;
		this.facingLeft = false;
		this.isLanding = false;

		// === image ===
		/** @type {number} */
		this.width = width;

		/** @type {number} */
		this.height = height;

		/** @type {HTMLImageElement | null} */
		this.image = null;

		/** @type {HTMLImageElement} */
		this._idleImg = idle;

		/** @type {HTMLImageElement[]} */
		this._walkImg = walk;

		//=== for drawing ===
		/** @private */
		this._hasBeenSet = false;

		/** @private */
		this._time = 0;

		/** @private */
		this._lastTime = 0;

		/** @private */
		this._index = 0;
	}
	/**
	 * @param {(entity: {image: HTMLImageElement, name: string, x: number, y: number, width: number, height: number, facingLeft: boolean}) => void} callback
	 * @param {number} interval
	 * @param {number} step
	 */
	draw(callback, interval = 1000, step = 1) {
		if (this.isWalking) {
			this._time = performance.now();
			if (this._time - this._lastTime > interval) {
				this._lastTime = this._time;
				this._index = this._index + step;
				if (this._index < 0) this._index = this._walkImg.length - 1;
				if (this._index >= this._walkImg.length) this._index = 0;
			}
			this.image = this._walkImg[this._index];
		} else {
			this.image = this._idleImg;
		}
		callback({
			image: this.image,
			name: this.name,
			x: this.x,
			y: this.y,
			width: this.width,
			height: this.height,
			facingLeft: this.facingLeft,
			maxHp: this.maxHp,
			hp: this.hp,
		});
	}
}

/**
 * @param {object} obj
 * @param {string} type
 * @param {string[]} prop
 */
function checkObjArg(obj, type, prop) {
	if (obj === null || typeof obj !== "object") {
		throw new Error(`Argument must be an object, got ${typeof obj}`);
	}
	for (const p of prop) {
		if (!(p in obj)) throw new Error(`${p} is missing`);
		if (typeof obj[p] !== type) {
			throw new Error(
				`Property "${p}" must be a ${type}, got ${typeof obj[
					p
				]} instead.`
			);
		}
	}
}

/**
 * @param {{x: number, y: number, width: number, height: number}} objA
 * @param {{x: number, y: number, width: number, height: number}} objB
 * @returns {boolean}
 * @throw make sure the arguments type is object or the arguments property is type of number
 */
export function collision(objA, objB) {
	// === Error handling ===
	checkObjArg(objA, "number", ["x", "y", "width", "height"]);
	checkObjArg(objB, "number", ["x", "y", "width", "height"]);

	return (
		objA.x + objA.width > objB.x &&
		objA.x < objB.x + objB.width &&
		objA.y + objA.height > objB.y &&
		objA.y < objB.y + objB.height
	);
}
/**
 * @param {{x: number, width: number}} objA
 * @param {{x: number, width: number}} objB
 * @returns {boolean}
 * @throw make sure the arguments type is object or the arguments property is type of number
 */
export function collisionX(objA, objB) {
	// === Error handling ===
	checkObjArg(objA, "number", ["x", "width"]);
	checkObjArg(objB, "number", ["x", "width"]);

	return objA.x + objA.width > objB.x && objA.x < objB.x + objB.width;
}

/**
 * @param {{y: number, height: number}} objA
 * @param {{y: number, height: number}} objB
 * @returns {boolean}
 * @throw make sure the arguments type is object or the arguments property is type of number
 */
export function collisionY(objA, objB) {
	// === Error handling ===
	checkObjArg(objA, "number", ["y", "height"]);
	checkObjArg(objB, "number", ["y", "height"]);

	return objA.y + objA.height > objB.y && objA.y < objB.y + objB.height;
}
