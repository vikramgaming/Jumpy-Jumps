import { VirtualJoystick as Joystick } from "./module/Controller.js";
import { Entity, collision } from "./module/Game.js";
import { image, onProgressAll } from "./module/Assets.js";
import { Canvas2D } from "./module/Draw.js";

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas");
canvas.width = innerWidth;
canvas.height = innerHeight;
const ctx = canvas.getContext("2d");
console.log(innerWidth, innerHeight);

const game = new Canvas2D(ctx);
const joystick = new Joystick(canvas, canvas.width * 0.2, canvas.height * 0.85);
const player = new Entity(
	"player",
	100,
	canvas.width / 2,
	0,
	40,
	40,
	image("./character/idle.png"),
	image([
		"./character/idle.png",
		"./character/walk1.png",
		"./character/idle.png",
		"./character/walk2.png",
	])
);
const camera = { x: 0, y: 0 };
let gameover = false;
let stage = 1;
let nextStage = false;
let displayTitle = true;
let hardmode = false;

const gravity = 0.5;
const world = 10;
const ground = canvas.height - 120;
let background = [];
let decoration = [];

const bgImg = {
	classic: {
		bg: image("./background/grass.png"),
		deco: image([
			"./background/tree1.png",
			"./background/tree2.png",
			"./background/tree3.png",
			"./background/tree4.png",
			"./background/tree5.png",
			"./background/tree6.png",
			"./background/tree7.png",
			"./background/tree8.png",
		]),
	},
	error: {
		bg: image("./background/grassError.png"),
		deco: image([
			"./background/treeError1.png",
			"./background/treeError2.png",
			"./background/treeError3.png",
			"./background/treeError4.png",
			"./background/treeError5.png",
			"./background/treeError6.png",
		]),
	},
};

changeBg(bgImg.classic.bg, bgImg.classic.deco);

const setEnemy = {
	away: {
		idle: image("./enemy/away1.png"),
		walk: image([
			"./enemy/away1.png",
			"./enemy/away2.png",
			"./enemy/away3.png",
			"./enemy/away4.png",
		]),
		width: 25,
		height: 25,
		speed: -3,
		spawnIndex: 1,
		spawnTime: 3000,
		damage: 5,
	},
	low: {
		idle: image("./enemy/low2.png"),
		walk: image([
			"./enemy/low1.png",
			"./enemy/low2.png",
			"./enemy/low3.png",
		]),
	},
	tall: {
		idle: image("./enemy/tall2.png"),
		walk: image([
			"./enemy/tall1.png",
			"./enemy/tall2.png",
			"./enemy/tall3.png",
		]),
	},
};
let enemy = {
	away: [],
	low: [],
	tall: [],
};

let lastTime = 0;
let playerInBg = 0;
function update() {
	const maxWorld = canvas.width * world - world;
	camera.x = player.x - canvas.width / 2 + player.width / 2;
	camera.x = Math.max(0, Math.min(camera.x, maxWorld - canvas.width));

	// === player ===
	const move = joystick.getVector().mul(3);

	const prevXPlayer = player.x;
	const prevYPlayer = player.y;
	if (joystick.direction !== "none") player.facingLeft = move.x < 0;

	if (player.x < 0) player.x = 0;
	player.isWalking = move.x !== 0 && move.y !== 0;

	player.velocityY += gravity;

	if (player.isLanding && joystick.direction === "up") player.velocityY = -9;

	// Collision
	let isCollidingX = false;
	let isCollidingY = false;
	let differentY = 0;

	for (const bg of background) {
		const playerHitbox = {
			x: player.x,
			y: player.y + player.velocityY,
			width: player.width,
			height: player.height,
		};

		if (!isCollidingY) {
			isCollidingY = collision(playerHitbox, bg);
			if (isCollidingY) playerInBg = bg.index;
		}

		playerHitbox.x += move.x;
		playerHitbox.y -= player.velocityY;
		if (!isCollidingX) {
			isCollidingX = collision(playerHitbox, bg);

			if (isCollidingX && player.isLanding) {
				differentY = bg.y - (player.y + player.height);
			}
		}
	}

	if (isCollidingX) {
		player.x = prevXPlayer;
		player.isWalking = false;
	} else {
		player.x += move.x;
	}
	if (isCollidingY) {
		player.velocityY = 0;
		player.y = prevYPlayer;
		player.isLanding = true;
	} else {
		player.isLanding = false;
	}
	player.y += player.velocityY;

	// === enemy ===
	for (let i = enemy.away.length - 1; i >= 0; i--) {
		const e = enemy.away[i];
		const speed = setEnemy.away.speed;
		const damage = setEnemy.away.damage;

		const prevY = e.y;

		let isCollidingXenemy = false;
		let isCollidingYenemy = false;

		if (e.x < 0) {
			enemy.away.splice(i, 1);
			continue;
		} else if (collision(player, e)) {
			enemy.away.splice(i, 1);
			player.hp -= damage;
		}
		e.velocityY += gravity;

		for (const bg of background) {
			const hitbox = {
				x: e.x + speed,
				y: e.y,
				width: e.width,
				height: e.height,
			};
			if (!isCollidingXenemy) isCollidingXenemy = collision(hitbox, bg);

			hitbox.x -= speed;
			hitbox.y += e.velocityY;
			if (!isCollidingYenemy) isCollidingYenemy = collision(hitbox, bg);
		}

		if (isCollidingXenemy) {
			enemy.away.splice(i, 1);
			continue;
		} else {
			e.x += speed;
		}

		if (isCollidingYenemy) {
			e.y = prevY;
			e.velocityY = 0;
		}
		e.y += e.velocityY;
	}

	// === condition ===
	// == add enemy away ==
	const now = performance.now();
	if (now - lastTime > setEnemy.away.spawnTime && !gameover) {
		lastTime = now;
		const away = setEnemy.away;
		const i = playerInBg + away.spawnIndex;
		const setPos = background[i];

		if (setPos) {
			const bg = background[i];
			addEnemy(
				1,
				"away",
				100,
				bg.x + bg.width - away.width,
				bg.x + bg.width - away.width,
				bg.y
			);
		}
	}

	if (differentY >= -15 && differentY < 0) {
		player.x += move.x;
		player.y += differentY;
	}

	if (player.hp <= 0 && !gameover) {
		gameover = true;

		titleText = "defeat";
		colorTitle.hue = 0;
		colorTitle.lightness = 50;
		alphaTitleText = 1;
		displayTitle = true;
	}

	if (player.x + player.width >= maxWorld) {
		if (gameover) {
			player.x = maxWorld - player.width;
		} else {
			stage++;
			nextStage = true;

			alphaTitleText = 1;
			titleText = `Stage: ${stage}`;
			displayTitle = true;
		}
		if (nextStage) {
			if (stage === 3) {
				changeBg(bgImg.error.bg, bgImg.error.deco);
				canvas.style.backgroundColor = "hsl(198, 72%, 35%)";
				colorTitle.lightness = 50;
			} else {
				changeBg(bgImg.classic.bg, bgImg.classic.deco);
				colorTitle.lightness = 25;
			}
			setEnemy.away.speed -= 2;

			if (stage > 3) {
				gameover = true;
				titleText = "You Win";
				canvas.style.backgroundColor = "hsl(198, 72%, 72%)";
				colorTitle.hue = 130;
			}

			player.x = 0;
			player.y = background[0].y - player.height;

			nextStage = false;
		}
	}
}

/** @param {{x: number, width: number}} obj */
function render(obj) {
	return obj.x + obj.width > camera.x && obj.x < camera.x + canvas.width;
}

function draw() {
	// === draw entity and object ===
	ctx.save();
	ctx.translate(-camera.x, -camera.y);

	for (const bg of background) {
		if (render(bg))
			game.drawImage(bg.image, bg.x, bg.y, bg.width, bg.height);
	}

	for (const d of decoration) {
		if (render(d)) game.drawImage(d.image, d.x, d.y, d.width, d.height);
	}

	player.draw(
		({ name, image, x, y, width, height, facingLeft, maxHp, hp }) => {
			ctx.save();
			ctx.translate(0, 0.5);
			game.drawImage(image, x, y, width, height, facingLeft);
			game.drawText(name, x + width / 2, y + height * 1.5, {
				color: "white",
				textAlign: "center",
			});
			game.drawRect(x, y, width, 5, {
				color: "grey",
			});
			game.drawRect(x, y, (hp / maxHp) * width, 5, {
				color: "lime",
			});
			ctx.restore();
		},
		250
	);

	for (const a of enemy.away) {
		if (render(a)) {
			a.draw(e => {
				ctx.save();
				ctx.translate(0, 3);
				game.drawImage(e.image, e.x, e.y, e.width, e.height);
				ctx.restore();
			}, 250);
		}
	}

	ctx.restore();

	// === others ===

	joystick.update();

	fps = fps.toFixed(0);
	game.drawText(`${fps} fps`, canvas.width * 0.95, 30, {
		color: fps > 20 ? (fps > 40 ? "green" : "yellow") : "red",
		font: "10px Arial",
	});
}

let alphaTitleText = 1;
let colorTitle = {
	hue: 0,
	saturation: 100,
	lightness: 0,
};
let lastStamp = 0;
let fps = 0;
let titleText = `Stage: ${stage}`;
function loop(timeStamp) {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	let delta = 0;
	if (lastStamp) delta = timeStamp - lastStamp;
	lastStamp = timeStamp;
	fps = 1000 / delta;

	update();
	draw();

	if (displayTitle) {
		if (gameover) {
			alphaTitleText = 1;
		} else {
			alphaTitleText -= (1 / 2500) * delta;
			alphaTitleText = Math.max(0, alphaTitleText);
		}

		game.drawText(titleText, canvas.width / 2, canvas.height / 2, {
			color: `hsla(${colorTitle.hue}, ${colorTitle.saturation}%, ${colorTitle.lightness}%, ${alphaTitleText})`,
			font: "64px Arial",
		});
		if (alphaTitleText === 0) displayTitle = false;
	}

	requestAnimationFrame(loop);
}

window.start = function () {
	const menu = document.getElementById("menu");
	const inputEl = menu.querySelector("input");
	const input = inputEl.value.trim();

	if (input.length < 3 || input.length > 10) {
		alert("Nama pemain harus 3–10 karakter");
		inputEl.focus();
		return;
	}

	player.name = input;
	menu.style.display = "none";

	requestAnimationFrame(loop);
};

/**
 * @param {number} add
 * @param {number} hp
 * @param {string} name
 * @param {number} minX
 * @param {number} maxX
 * @param {number} y
 */
function addEnemy(add, name, hp, minX, maxX, y) {
	const e = setEnemy[name];
	if (!e) throw new Error(`${e} not found`);

	for (let i = 0; i < add; i++) {
		const randomPosX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;

		const en = new Entity(
			"away",
			hp,
			randomPosX,
			y - e.height,
			e.width,
			e.height,
			e.idle,
			e.walk
		);
		if (name === "away") en.isWalking = true;

		enemy[name].push(en);
	}
}

/**
 * @param {HTMLImageElement} bg
 * @param {HTMLImageElement[]} deco
 */
function changeBg(bgImg, decoImg) {
	decoration = [];
	const decoWidth = 100;
	const decoHeight = 100;

	background = [];
	const maxYbg = 20;
	const minYbg = -20;

	for (let i = 0; i < world; i++) {
		const randomYbg =
			Math.floor(Math.random() * (maxYbg - minYbg + 1)) + minYbg;
		const bg = {
			image: bgImg,
			x: canvas.width * i - i,
			y: ground + randomYbg,
			width: canvas.width,
			height: canvas.height - ground - randomYbg,
			index: i,
		};
		background.push(bg);

		const randomChoice = Math.floor(Math.random() * decoImg.length);
		const randomXdeco =
			Math.floor(
				Math.random() * (bg.x + bg.width - decoWidth - bg.x + 1)
			) + bg.x;

		const deco = {
			image: decoImg[randomChoice],
			x: randomXdeco,
			y: bg.y - decoWidth,
			width: decoWidth,
			height: decoHeight,
			index: i,
		};
		decoration.push(deco);
	}
}

/**
 * @param {string} enemyName
 * @param {number} maxX
 * @param {number} minX
 * @param {number} y
 * @param {number} width
 * @param {number} height
 */

!(function () {
	const fullScreen = document.getElementById("fullScreen");
	let access = false;

	fullScreen.addEventListener("click", () => {
		if (!access) {
			if (confirm("performa mungkin akan menurun, kamu yakin?")) {
				access = true;
			} else {
				return;
			}
		}

		const elem = document.documentElement;
		if (elem.requestFullscreen) {
			elem.requestFullscreen();
		} else if (elem.webkitRequestFullscreen) {
			elem.webkitRequestFullscreen();
		} else if (elem.msRequestFullscreen) {
			elem.msRequestFullscreen();
		}

		onProgressAll(() => {
			fullScreen.style.display = "none";
		});
	});

	document.addEventListener("fullscreenchange", () => {
		if (!document.fullscreenElement) {
			fullScreen.style.display = "block";
		}
	});
	onProgressAll(() => {
		fullScreen.style.display = "block";
	});
})();
