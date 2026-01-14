import { VirtualJoystick as Joystick } from "./module/Controller.js";
import { Entity, Timer, collision } from "./module/Game.js";
import { image, onProgressAll } from "./module/Assets.js";
import { Canvas2D } from "./module/Draw.js";

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas");
canvas.width = innerWidth;
canvas.height = innerHeight;
const ctx = canvas.getContext("2d");

const gravity = 0.5;
const game = new Canvas2D(ctx);
const joystick = new Joystick(canvas, canvas.width * 0.2, canvas.height * 0.85);
const player = new Entity( "player", 100, canvas.width / 2, 0, 40, 40, image("./character/idle.png"), image([ "./character/idle.png", "./character/walk1.png", "./character/idle.png", "./character/walk2.png", ]) );

const camera = { x: 0, y: 0 };
let gameover = false;
let nextStage = false;
let displayTitle = true;
let hardmode = false;

const world = 1;
const ground = canvas.height - 120;
let background = [];
let decoration = [];
let lastBg = null;

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
		width: 40,
		height: 40,
		speed: 3,
		changeDirectionDelay: 3000,
	},
	tall: {
		idle: image("./enemy/tall2.png"),
		walk: image([
			"./enemy/tall1.png",
			"./enemy/tall2.png",
			"./enemy/tall3.png",
		]),
		width: 50,
		height: 50,
		speed: 2,
		changeDirectionDelay: 4000
	},
};
let enemy = {
	away: [],
	low: [],
	tall: [],
};

let delay = {
    awaySpawn: new Timer(setEnemy.away.spawnTime),
}

let stage = setStage();
function* setStage() {
    for (let i = 1; i <= 3; i++) {
        if (i === 3) {
            canvas.style.backgroundColor = "hsl(198, 72%, 35%)";
            changeBg(bgImg.error.bg, bgImg.error.deco);
        } else {
            changeBg(bgImg.classic.bg, bgImg.classic.deco);
        }
        
        enemy.low = [];
        enemy.tall = [];
        if (i <= 2) {
            addEnemy(2 * i, "low", 10, background[Math.floor(background.length / 2)].x, lastBg.x + lastBg.width, 0);
        } else if (i === 3) {
            addEnemy(4, "tall", 50, background[Math.floor(background.length / 2)].x, lastBg.x + lastBg.width, 0);
        }
        yield i;
        
        setEnemy.away.speed -= 2;
        
        colorTitle.lightness = Math.min(50, colorTitle.lightness + 25);
        
        nextStage = true;
    }
}

function update(dt) {
	const maxWorld = canvas.width * world - world;
	camera.x = player.x - canvas.width / 2 + player.width / 2;
	camera.x = Math.max(0, Math.min(camera.x, maxWorld - canvas.width));

	// === player ===
	const move = joystick.getVector().mul(3);

	if (joystick.direction !== "none") player.mirror = move.x < 0;
	player.isWalking = move.x !== 0 && move.y !== 0;
	
	player.velocityY += gravity;
	player.velocityX = move.x;

	// Collision
	player.isCollideX = false;
	player.isCollideY = false;
	player.differentY = 0;
	
	player.onCollideX = ({y}) => {
        player.isWalking = false;
        player.velocityX = 0;
        
        if (player.isLanding) player.differentY = y - player.y - player.height;
	};
	player.onCollideY = ({index}) => {
        if (index === player.objIndex || index === player.objIndex - 1) {
            player.isLanding = true;
            player.velocityY = 0;
        }
    };
	player.checkCollisionMultiObj(background);
	
	if (!player.isCollideY) player.isLanding = false;
	if (player.x + player.velocityX < 0) player.velocityX = 0;
	
	player.x += player.velocityX;
	player.y += player.velocityY;
	
	if (player.isLanding && joystick.direction === "up") player.velocityY = -9;

	// === enemy ===
	// === away ===
	for (let i = enemy.away.length - 1; i >= 0; i--) {
		const e = enemy.away[i];
		const away = setEnemy.away;
		let isAlive = true;
		
		e.velocityX = away.speed;
		e.velocityY += gravity;
		
		e.isCollideX = false;
		e.isCollideY = false;
		
		e.onCollideX = () => { isAlive = false };
		e.onCollideY = () => { e.velocityY = 0 };
		e.checkCollisionMultiObj(background);
		
		if (collision(e, player)) {
		    player.hp -= away.damage;
		    isAlive = false;
		}
		
		e.x += e.velocityX;
		e.y += e.velocityY;
		
		if (!isAlive) {
		    enemy.away.splice(i, 1);
		}
	}

	// === low ===
	for (let i = enemy.low.length - 1; i >= 0; i--) {
		const e = enemy.low[i];
		const low = setEnemy.low;
		let jumpAble = false;
		
		if (e.timer.update(dt)) {
		    const random = randomInt(0, 2);
		    e.direction = random === 0 ? "none" : (random === 1 ? "left" : "right");
		    e.timer.interval = Math.min(low.changeDirectionDelay, Math.max(low.changeDirectionDelay / 4, e.timer.interval + randomInt(-low.changeDirectionDelay / 4, low.changeDirectionDelay / 4)));
		}
		
		e.velocityX = e.direction === "none" ? 0 : (e.direction === "left" ? -low.speed : low.speed);
		e.velocityY += gravity;
		
		e.isWalking = e.direction !== "none";
		if (e.direction !== "none") e.mirror = e.direction === "right";
		
		
		e.isCollideX = false;
		e.isCollideY = false;
		
	    e.onCollideX = () => { e.velocityX = 0; jumpAble = true; };
	    e.onCollideY = ({index}) => {
	        if (index === e.objIndex) {
	            e.velocityY = 0;
	            e.isLanding = true;
	        }; 
	    }
		e.checkCollisionMultiObj(background);
	    
	    if (!e.isCollideY) e.isLanding = false;
	    if (e.x + e.velocityX < 0 | e.x + e.width + e.velocityX > lastBg.x + lastBg.width) e.velocityX = 0;
		
		e.x += e.velocityX;
		e.y += e.velocityY;
		
		if (e.isLanding && jumpAble) e.velocityY = -9;
	}
	
	// === low ===
	for (let i = enemy.tall.length - 1; i >= 0; i--) {
		const e = enemy.tall[i];
		const tall = setEnemy.tall;
		let jumpAble = false;
		
		if (e.timer.update(dt)) {
		    const random = randomInt(0, 2);
		    e.direction = random === 0 ? "none" : (random === 1 ? "left" : "right");
		    e.timer.interval = Math.min(tall.changeDirectionDelay, Math.max(tall.changeDirectionDelay / 4, e.timer.interval + randomInt(-tall.changeDirectionDelay / 4, tall.changeDirectionDelay / 4)));
		}
		
		e.velocityX = e.direction === "none" ? 0 : (e.direction === "left" ? -tall.speed : tall.speed);
		e.velocityY += gravity;
		
		e.isWalking = e.direction !== "none";
		if (e.direction !== "none") e.mirror = e.direction === "right";
		
		
		e.isCollideX = false;
		e.isCollideY = false;
		
	    e.onCollideX = () => { e.velocityX = 0; jumpAble = true; };
	    e.onCollideY = ({index}) => {
	        if (index === e.objIndex) {
	            e.velocityY = 0;
	            e.isLanding = true;
	        }; 
	    }
		e.checkCollisionMultiObj(background);
	    
	    if (!e.isCollideY) e.isLanding = false;
	    if (e.x + e.velocityX < 0 | e.x + e.width + e.velocityX > lastBg.x + lastBg.width) e.velocityX = 0;
		
		e.x += e.velocityX;
		e.y += e.velocityY;
		
		if (e.isLanding && jumpAble) e.velocityY = -9;
	}

	// === condition ===
	// == add enemy away ==
	if (delay.awaySpawn.update(dt) && !gameover) {
		const away = setEnemy.away;
		const i = player.objIndex + away.spawnIndex;
		const setPos = background[i];

		if (setPos) {
			const bg = background[i];
			addEnemy( 1, "away", 100, bg.x + bg.width - away.width, bg.x + bg.width - away.width, bg.y );
		}
	}

	if (player.differentY >= -15 && player.differentY < 0) {
		player.x += move.x;
		player.y += player.differentY;
	}

	if (player.hp <= 0 && !gameover) {
		gameover = true;

		titleText = "defeat";
		colorTitle.hue = 0;
		colorTitle.lightness = 50;
		alphaTitleText = 1;
		displayTitle = true;
	}
	
	if (gameover) {
	    enemy = {
	        away: [],
	        low: [],
	        tall: []
	    }
	}

	if (player.x + player.width >= maxWorld) {
        const s = stage.next().value;
        
		if (gameover) {
			player.x = maxWorld - player.width;
		} else {
            if (s) {
    			alphaTitleText = 1;
    			titleText = `Stage: ${s}`;
    			displayTitle = true;
            }
		}
		if (nextStage) {
			if (!s) {
				gameover = true;
				titleText = "You Win";
				canvas.style.backgroundColor = "hsl(198, 72%, 72%)";
				colorTitle.hue = 130;
				changeBg(bgImg.classic.bg, bgImg.classic.deco);
				displayTitle = true;
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
		({ name, image, x, y, width, height, mirror, maxHp, hp }) => {
			ctx.save();
			ctx.translate(0, 0.5);
			game.drawImage(image, x, y, width, height, mirror);
			game.strokeRect(x, y, width, height);
			game.drawText(name, x + width / 2, y + height * 1.5, { color: "white", textAlign: "center", });
			game.drawRect(x, y, width, 5, { color: "grey", });
			game.drawRect(x, y, (hp / maxHp) * width, 5, { color: "lime", });
			ctx.restore();
		},
		250
	);

	for (const a of enemy.away) {
		if (render(a)) {
			a.draw(({ image, x, y, width, height }) => {
				ctx.save();
				ctx.translate(0, 3);
				game.drawImage(image, x, y, width, height);
				ctx.restore();
			}, 250);
		}
	}
	for (const a of enemy.low) {
		if (render(a)) {
			a.draw(({ image, x, y, width, height, mirror }) => {
				ctx.save();
				ctx.translate(0, 3);
				game.drawImage(image, x, y, width, height, mirror);
				ctx.restore();
			}, 250);
		}
	}
	for (const a of enemy.tall) {
		if (render(a)) {
			a.draw(({ image, x, y, width, height, mirror }) => {
				ctx.save();
				ctx.translate(0, 3);
				game.drawImage(image, x, y, width, height, mirror);
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
let titleText = `Stage: 1`;
function loop(timeStamp) {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	let delta = 0;
	if (lastStamp) delta = timeStamp - lastStamp;
	lastStamp = timeStamp;
	fps = 1000 / delta;

	update(delta);
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
	changeBg(bgImg.classic.bg, bgImg.classic.deco);
    addEnemy(4, "low", 10, background[Math.floor(background.length / 2)].x, lastBg.x + lastBg.width, 0);
    
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
		const randomPosX = randomInt(minX, maxX);

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
		if (e.changeDirectionDelay) en.timer = new Timer(e.changeDirectionDelay);

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

	for (let i = 0; i < world; i++) {
		const randomYbg = randomInt(-20, 20);
		const bg = {
			image: bgImg,
			x: canvas.width * i - i,
			y: ground + randomYbg,
			width: canvas.width,
			height: canvas.height - ground - randomYbg,
			index: i,
		};
		background.push(bg);

		const deco = {
			image: decoImg[randomInt(0, decoImg.length - 1)],
			x: randomInt(bg.x, bg.x + bg.width - decoWidth),
			y: bg.y - decoWidth,
			width: decoWidth,
			height: decoHeight,
			index: i,
		};
		decoration.push(deco);
	}
	lastBg = background[background.length - 1];
}

/**
 * @param {number} min
 * @param {number} max
*/
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
