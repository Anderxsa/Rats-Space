import Enemy from "./Enemy.js";
import MovingDirection from "./MovingDirection.js";

export default class EnemyController {
  enemyMap = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [2, 2, 2, 3, 3, 3, 3, 2, 2, 2],
    [2, 2, 2, 3, 3, 3, 3, 2, 2, 2],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  ];
  enemyRows = [];

  currentDirection = MovingDirection.right;
  // Control del movimiento mediante desplazamientos (offsets)
  xVelocity = 0;
  yVelocity = 0; 
  // se mantiene por compatibilidad pero no se usa para mover enemigos directamente
  defaultXVelocity = 0.5;
  defaultYVelocity = 0.5;
  moveDownTimerDefault = 30;
  moveDownTimer = this.moveDownTimerDefault;
  fireBulletTimerDefault = 100;
  fireBulletTimer = this.fireBulletTimerDefault;

  // esplazamientos y restricciones a nivel de formación
  xOffset = 0; // desplazamiento horizontal
  fallOffset = 0; // descenso hacia abajo
  margin = 20; // q no choque al borde 
  curveAmplitude = 18; // distancia en pixeles con una curvita

  constructor(canvas, enemyBulletController, playerBulletController) {
    this.canvas = canvas;
    this.enemyBulletController = enemyBulletController;
    this.playerBulletController = playerBulletController;

    this.enemyDeathSound = new Audio("sounds/enemy-death.wav");
    this.enemyDeathSound.volume = 0.1;

    this.createEnemies();
  }

  draw(ctx) {
    this.decrementMoveDownTimer();
    this.updateVelocityAndDirection();

    // aplicae el desplazamiento horizontal en base a la velocidad
    this.xOffset += this.xVelocity;

    // hitbox
    this.positionEnemies();
    this.collisionDetection();
    this.drawEnemies(ctx);
    this.resetMoveDownTimer();
    this.fireBullet();
  }

  collisionDetection() {
    this.enemyRows.forEach((enemyRow) => {
      enemyRow.forEach((enemy, enemyIndex) => {
        if (this.playerBulletController.collideWith(enemy)) {
          this.enemyDeathSound.currentTime = 0;
          this.enemyDeathSound.play();
          enemyRow.splice(enemyIndex, 1);
        }
      });
    });

    this.enemyRows = this.enemyRows.filter((enemyRow) => enemyRow.length > 0);
  }

  fireBullet() {
    this.fireBulletTimer--;
    if (this.fireBulletTimer <= 0) {
      this.fireBulletTimer = this.fireBulletTimerDefault;
      const allEnemies = this.enemyRows.flat();
      const enemyIndex = Math.floor(Math.random() * allEnemies.length);
      const enemy = allEnemies[enemyIndex];
      this.enemyBulletController.shoot(enemy.x + enemy.width / 2, enemy.y, -3);
    }
  }

  resetMoveDownTimer() {
    if (this.moveDownTimer <= 0) {
      this.moveDownTimer = this.moveDownTimerDefault;
    }
  }

  decrementMoveDownTimer() {
    if (
      this.currentDirection === MovingDirection.downLeft ||
      this.currentDirection === MovingDirection.downRight
    ) {
      // Mover la formación hacia abajo mientras el temporizador corre
      this.fallOffset += this.defaultYVelocity;
      this.moveDownTimer--;
    }
  }

  updateVelocityAndDirection() {
    // Calcular las posiciones base más a la izquierda y a la derecha para comprobar límites con las margenes q esatn en el borde p
    const firstRow = this.enemyRows[0];
    if (!firstRow || firstRow.length === 0) return;
    const leftMostBase = this.enemyRows[0][0];
    const rightMostBase = this.enemyRows[0][this.enemyRows[0].length - 1];

    // Bordes efectivos
    const leftEdge = leftMostBase.baseX + this.xOffset;
    const rightEdge = rightMostBase.baseX + this.xOffset + rightMostBase.width;

    if (this.currentDirection == MovingDirection.right) {
      this.xVelocity = this.defaultXVelocity;
      this.yVelocity = 0;
      if (rightEdge >= this.canvas.width - this.margin) {
        this.currentDirection = MovingDirection.downLeft;
      }
    } else if (this.currentDirection === MovingDirection.downLeft) {
      if (this.moveDown(MovingDirection.left)) {
        // termino de moverse hacia abajo
      }
    } else if (this.currentDirection === MovingDirection.left) {
      this.xVelocity = -this.defaultXVelocity;
      this.yVelocity = 0;
      if (leftEdge <= this.margin) {
        this.currentDirection = MovingDirection.downRight;
      }
    } else if (this.currentDirection === MovingDirection.downRight) {
      if (this.moveDown(MovingDirection.right)) {
        // termino de moverse hacia abajo
      }
    }
  }

  moveDown(newDirection) {
    // Durante el movimiento hacia abajo, la velocidad horizontal es cero asi q la vertical se maneja en decrementMoveDownTimer
    this.xVelocity = 0;
    this.yVelocity = 0;
    if (this.moveDownTimer <= 0) {
      this.currentDirection = newDirection;
      return true;
    }
    return false;
  }

  drawEnemies(ctx) {
    const centerX = this.canvas.width / 2;
    this.enemyRows.flat().forEach((enemy) => {

      enemy.draw(ctx);
    });
  }

  // ayudante para actualizar posiciones una vez por cuadro antes de colisiones y dibujo
  positionEnemies() {
    const centerX = this.canvas.width / 2;
    this.enemyRows.flat().forEach((enemy) => {
      const x = enemy.baseX + this.xOffset;
      // profe aqui puse una curvatura usando una parábola con raiz cuadrada:
      // y = baseY + fallOffset + A * ((x - centerX) / centerX)^2
      // A (curveAmplitude) controla qué tan marcada es la curva
      const norm = (x - centerX) / centerX; // -1..1
      const quad = this.curveAmplitude * (norm * norm);
      enemy.x = x;
      enemy.y = enemy.baseY + this.fallOffset + quad;
    });
  }

  happy = () => {};

  createEnemies() {
    this.enemyMap.forEach((row, rowIndex) => {
      this.enemyRows[rowIndex] = [];
      row.forEach((enemyNubmer, enemyIndex) => {
        if (enemyNubmer > 0) {
  // tamaño de la rata
          this.enemyRows[rowIndex].push(
            new Enemy(enemyIndex * 45, rowIndex * 32, enemyNubmer)
          );
        }
      });
    });
  }

  collideWith(sprite) {
    return this.enemyRows.flat().some((enemy) => enemy.collideWith(sprite));
  }
}
