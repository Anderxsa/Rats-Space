import EnemyController from "./EnemyController.js";
import Player from "./Player.js";
import BulletController from "./BulletController.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// area del juego
canvas.width = 500;
canvas.height = 500;

const background = new Image();
background.src = "images/space.png";

// game over 
const gameOverImg = new Image();
gameOverImg.src = "images/Game%20over.png";
const retryImg = new Image();
retryImg.src = "images/retry.png";

// Video de victoria 
const winVideo = document.createElement("video");
winVideo.src = "images/win.mp4";
winVideo.muted = true;
winVideo.playsInline = true;
winVideo.preload = "auto";
let winVideoLoaded = false;
let winVideoStarted = false;
winVideo.addEventListener("loadedmetadata", () => {
  winVideoLoaded = true;
});

// Música de fondo
const bgMusic = new Audio("sounds/las torres.mp3");
bgMusic.loop = true;
bgMusic.volume = 1.0; 
bgMusic.play().catch(() => {
  const resume = () => {
    bgMusic.play().catch(() => {});
    window.removeEventListener("click", resume);
    window.removeEventListener("keydown", resume);
  };
  window.addEventListener("click", resume);
  window.addEventListener("keydown", resume);
});

// fuente 
let arcadeFontLoaded = false;
try {
  const arcadeFont = new FontFace("Arcade", "url(ARCADE_N.TTF)");
  arcadeFont.load().then((f) => {
    document.fonts.add(f);
    arcadeFontLoaded = true;
  }).catch(() => {});
} catch (e) {}

let playerBulletController = new BulletController(canvas, 10, "red", true);
let enemyBulletController = new BulletController(canvas, 4, "white", false);
let enemyController = new EnemyController(
  canvas,
  enemyBulletController,
  playerBulletController
);
let player = new Player(canvas, 3, playerBulletController);

let isGameOver = false;
let didWin = false;

// boton para volver a jugar 
let retryRect = null;

// sonido al perder
const gameOverVO = new Audio("sounds/Quieres comenzar de nuevo.mp3");
gameOverVO.volume = 1.0;
let gameOverVOPlayed = false;

// cuenta regresiva
let countdownActive = true;
let countdownStart = performance.now();

function game() {
  checkGameOver();
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  displayGameOver();
  if (!isGameOver) {
    // Manejar cuenta regresiva antes de iniciar el juego
    if (countdownActive) {
      drawCountdown();
      updateRatsHudDOM();
      return; // no actualizar entidades durante la cuenta regresiva
    }
    enemyController.draw(ctx);
    player.draw(ctx);
    playerBulletController.draw(ctx);
    enemyBulletController.draw(ctx);
    updateRatsHudDOM();
  }
}

function displayGameOver() {
  retryRect = null;
  if (isGameOver) {

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (didWin) {
      // ganar
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.font = arcadeFontLoaded ? "36px Arcade" : "36px Arial";
      const textY = Math.max(40, canvas.height * 0.2);
      ctx.fillText("GANASTE OE", canvas.width / 2, textY);

      // video
      const srcVW = winVideoLoaded && winVideo.videoWidth ? winVideo.videoWidth : 640;
      const srcVH = winVideoLoaded && winVideo.videoHeight ? winVideo.videoHeight : 360;
      const srcSize = Math.min(srcVW, srcVH);
      const sx = Math.max(0, (srcVW - srcSize) / 2);
      const sy = Math.max(0, (srcVH - srcSize) / 2);
    
      const maxSide = Math.min(canvas.width * 0.7, canvas.height * 0.45);
      const dSide = Math.min(maxSide, srcSize);
      const vX = (canvas.width - dSide) / 2;
      const vY = textY + 16;

      // Iniciar el video al ganar
      if (!winVideoStarted) {
        try { winVideo.currentTime = 0; winVideo.play().catch(() => {}); } catch (e) {}
        winVideoStarted = true;
      }
      try { ctx.drawImage(winVideo, sx, sy, srcSize, srcSize, vX, vY, dSide, dSide); } catch (e) {}

      // boton de volver a jugar 
      const rNatW = retryImg.naturalWidth || retryImg.width || 0;
      const rNatH = retryImg.naturalHeight || retryImg.height || 0;
      let rW = rNatW;
      let rH = rNatH;
      const maxRW = canvas.width * 0.6;
      if (rW > maxRW && rW > 0) {
        const rScale = maxRW / rW;
        rW = rW * rScale;
        rH = rH * rScale;
      }
      const rX = (canvas.width - rW) / 2;
      const rY = vY + dSide + 20;
      if (rW > 0 && rH > 0) {
        ctx.drawImage(retryImg, rX, rY, rW, rH);
        retryRect = { x: rX, y: rY, w: rW, h: rH };
      }
    } else {
   
      if (!gameOverVOPlayed) {
        try {
          gameOverVO.currentTime = 14;
          gameOverVO.play().catch(() => {});
        } catch (e) {}
        gameOverVOPlayed = true;
      }

      // texto de perder XD
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.font = arcadeFontLoaded ? "28px Arcade" : "28px Arial"; // smaller size
      const textY = canvas.height / 2 - 20;
      ctx.fillText("PERDISTE CAUSA", canvas.width / 2, textY);

      const rNatW = retryImg.naturalWidth || retryImg.width || 0;
      const rNatH = retryImg.naturalHeight || retryImg.height || 0;
      let rW = rNatW;
      let rH = rNatH;
      const maxRW = canvas.width * 0.6;
      if (rW > maxRW && rW > 0) {
        const scale = maxRW / rW;
        rW = rW * scale;
        rH = rH * scale;
      }
      const rX = (canvas.width - rW) / 2;
      const rY = textY + 20;
      if (rW > 0 && rH > 0) {
        ctx.drawImage(retryImg, rX, rY, rW, rH);
        retryRect = { x: rX, y: rY, w: rW, h: rH };
      }
    }
  }
}

function checkGameOver() {
  if (isGameOver) {
    return;
  }

  if (enemyBulletController.collideWith(player)) {
    isGameOver = true;
    try { bgMusic.pause(); } catch (e) {}
  }

  if (enemyController.collideWith(player)) {
    isGameOver = true;
    try { bgMusic.pause(); } catch (e) {}
  }

  if (enemyController.enemyRows.length === 0) {
    didWin = true;
    isGameOver = true;
  }
}

setInterval(game, 1000 / 60);

// logica para volver a empezar
function resetGame() {
  playerBulletController = new BulletController(canvas, 10, "red", true);
  enemyBulletController = new BulletController(canvas, 4, "white", false);
  enemyController = new EnemyController(
    canvas,
    enemyBulletController,
    playerBulletController
  );
  player = new Player(canvas, 3, playerBulletController);
  isGameOver = false;
  didWin = false;
  // esto inicia la musica despues de la cuenta regresiva
  countdownActive = true;
  countdownStart = performance.now();
  try {
    gameOverVO.pause();
    gameOverVO.currentTime = 0;
  } catch (e) {}
  gameOverVOPlayed = false;
  // Detener y reiniciar video de victoria
  try { winVideo.pause(); winVideo.currentTime = 0; } catch (e) {}
  winVideoStarted = false;
}

canvas.addEventListener("click", (e) => {
  if (!isGameOver || !retryRect) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (x >= retryRect.x && x <= retryRect.x + retryRect.w && y >= retryRect.y && y <= retryRect.y + retryRect.h) {
    resetGame();
  }
});

//  mostrar cantidad de ratas restantes
function updateRatsHudDOM() {
  const hudEl = document.getElementById("rats-hud");
  const controlsEl = document.getElementById("controls-hud");
  const logoEl = document.querySelector(".logo-title");
  if (!hudEl) return;
  // Actualizar texto
  const remaining = enemyController.enemyRows.reduce((sum, row) => sum + row.length, 0);
  hudEl.textContent = `RATAS RESTANTES: ${remaining}`;
  // Posicionar debajo del logo si está disponible
  if (logoEl) {
    const rect = logoEl.getBoundingClientRect();
    const bodyRect = document.body.getBoundingClientRect();
    const top = rect.top - bodyRect.top + rect.height + 8; // 8px gap
    hudEl.style.top = `${top}px`;
    // Posicionar controles debajo del HUD de ratas
    if (controlsEl) {
      const hudRect = hudEl.getBoundingClientRect();
      const controlsTop = hudRect.top - bodyRect.top + hudRect.height + 6; // pequeño espacio
      controlsEl.style.top = `${controlsTop}px`;
    }
  } else if (controlsEl) {
    // fallback: si no hay logo, coloca controles debajo del hud con un espacio fijo
    const hudRect = hudEl.getBoundingClientRect();
    const bodyRect = document.body.getBoundingClientRect();
    const controlsTop = hudRect.top - bodyRect.top + hudRect.height + 6;
    controlsEl.style.top = `${controlsTop}px`;
  }
}

// cuenta regresiva, nose quien vea esto pero me demore bastante en esta hvda
function drawCountdown() {
  const elapsed = (performance.now() - countdownStart) / 1000;
  const sec = Math.floor(elapsed) + 1; // 1-based
  let text = "";
  if (sec <= 5) {
    text = String(sec);
  } else if (sec === 6) {
    text = "JUEGA";
  } else {
    // Finalizar la cuenta regresiva e iniciar la música
    countdownActive = false;
    try { bgMusic.play().catch(() => {}); } catch (e) {}
    return;
  }

  ctx.save();
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = arcadeFontLoaded ? (sec === 6 ? "48px Arcade" : "72px Arcade") : (sec === 6 ? "48px Arial" : "72px Arial");
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  ctx.restore();
}
