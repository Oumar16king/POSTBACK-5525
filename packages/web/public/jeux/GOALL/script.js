/* eslint-disable no-unused-vars -- Imported legacy code retained without functional refactoring. */
let currentRow = null;
let currentCol = -1;
let ROWS = 4;
let COLS = 7;

document.addEventListener("DOMContentLoaded", () => {
  createGrid(ROWS, COLS);
});

function createGrid(rows, cols) {
  const gridContainer = document.querySelector(".grid-container");
  gridContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gridContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  gridContainer.innerHTML = '';
  
  for (let i = 0; i < rows * cols; i++) {
    const gridItem = document.createElement("div");
    gridItem.className = "grid-item";
    gridItem.style.animationDelay = (i * 50) + 'ms';
    gridContainer.appendChild(gridItem);
  }
}

function changeGridSize(rows, cols) {
  resetGame();
  ROWS = rows;
  COLS = cols;
  const ratio = cols / rows;
  document.documentElement.style.setProperty("--grid-ratio", ratio);
  createGrid(rows, cols);

  // Sync dropdown
  const select = document.getElementById('gridSizeSelect');
  if (select) select.value = `${rows}x${cols}`;
}

function updateGridSize() {
  const select = document.getElementById('gridSizeSelect');
  const [rows, cols] = select.value.split('x').map(Number);
  changeGridSize(rows, cols);
}

function createBall() {
  const ballImg = document.createElement("img");
  ballImg.src = "https://img.icons8.com/emoji/48/soccer-ball-emoji.png";
  ballImg.className = "ball landing";
  
  const ballContainer = document.createElement("div");
  ballContainer.className = "ball-container";
  ballContainer.appendChild(ballImg);
  
  ballImg.style.opacity = '0';
  ballImg.style.transform = "scale(0)";
  
  setTimeout(() => {
    ballImg.style.transition = "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";
    ballImg.style.opacity = '1';
    ballImg.style.transform = "scale(1)";
  }, 50);
  
  return ballContainer;
}

function createTrailEffect(x, y, size) {
  const trailContainer = document.createElement("div");
  trailContainer.className = "ball-trail";
  document.body.appendChild(trailContainer);
  
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      if (document.body.contains(trailContainer)) {
        const particle = document.createElement("div");
        particle.className = "trail-particle";
        const randomX = (Math.random() - 0.5) * 20;
        const randomY = (Math.random() - 0.5) * 20;
        particle.style.width = size * (0.3 + Math.random() * 0.3) + 'px';
        particle.style.height = particle.style.width;
        particle.style.left = (x + randomX) + 'px';
        particle.style.top = (y + randomY) + 'px';
        trailContainer.appendChild(particle);
        
        setTimeout(() => {
          if (trailContainer.contains(particle)) {
            trailContainer.removeChild(particle);
          }
        }, 800);
      }
    }, i * 100);
  }
  
  setTimeout(() => {
    if (document.body.contains(trailContainer)) {
      document.body.removeChild(trailContainer);
    }
  }, 1500);
}

function showGameOver() {
  const gameOverModal = document.getElementById("gameOverModal");
  gameOverModal.style.display = "flex";
}

function resetGame() {
  const gameOverModal = document.getElementById("gameOverModal");
  gameOverModal.style.display = "none";
  
  const gridItems = document.querySelectorAll(".grid-item");
  gridItems.forEach(item => {
    item.classList.remove("visited");
    if (item.contains(ball)) {
      item.removeChild(ball);
    }
  });
  
  currentRow = null;
  currentCol = -1;
  ball = null;
  isMoving = false;
}

function moveBall() {
  if (isMoving) {
    return;
  }
  
  const gridItems = document.querySelectorAll(".grid-item");
  
  if (currentCol === -1) {
    currentRow = Math.floor(Math.random() * ROWS);
    currentCol = 0;
    ball = createBall();
    const currentCell = gridItems[currentRow * COLS + currentCol];
    currentCell.appendChild(ball);
    currentCell.classList.add("visited");
    currentCell.style.boxShadow = "inset 0 0 30px rgba(255, 255, 255, 0.4), 0 0 20px rgba(255, 255, 255, 0.2)";
    
    setTimeout(() => {
      currentCell.style.boxShadow = '';
    }, 800);
    return;
  }
  
  if (currentCol >= COLS - 1) {
    showGameOver();
    return;
  }
  
  isMoving = true;
  let newRow = Math.floor(Math.random() * ROWS);
  const currentCell = gridItems[currentRow * COLS + currentCol];
  const nextCell = gridItems[newRow * COLS + currentCol + 1];
  nextCell.classList.add("visited");
  
  const ballClone = ball.cloneNode(true);
  const ballElement = ballClone.querySelector(".ball");
  ballElement.classList.remove("landing");
  ballElement.classList.add("ball-moving");
  document.body.appendChild(ballClone);
  
  const currentRect = currentCell.getBoundingClientRect();
  const nextRect = nextCell.getBoundingClientRect();
  ballClone.style.position = "fixed";
  
  const ballSize = Math.min(currentRect.width, currentRect.height) * 0.6;
  const startX = currentRect.left + (currentRect.width - ballSize) / 2;
  const startY = currentRect.top + (currentRect.height - ballSize) / 2;
  
  ballClone.style.left = startX + 'px';
  ballClone.style.top = startY + 'px';
  ballClone.style.width = ballSize + 'px';
  ballClone.style.height = ballSize + 'px';
  ballClone.style.zIndex = "100";
  
  const endX = nextRect.left + (nextRect.width - ballSize) / 2;
  const endY = nextRect.top + (nextRect.height - ballSize) / 2;
  const startTime = Date.now();
  const jumpHeight = Math.abs(endY - startY) * 0.5 + 50;
  
  const trailInterval = setInterval(() => {
    const ballRect = ballClone.getBoundingClientRect();
    const ballCenterX = ballRect.left + ballRect.width / 2;
    const ballCenterY = ballRect.top + ballRect.height / 2;
    createTrailEffect(ballCenterX, ballCenterY, ballSize * 0.3);
  }, 100);
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / 800, 1);
    const easedProgress = cubicBezier(0.34, 1.56, 0.64, 1, progress);
    const currentX = startX + (endX - startX) * easedProgress;
    let currentY = startY + (endY - startY) * easedProgress;
    
    const parabola = 4 * easedProgress * (1 - easedProgress);
    const jumpOffset = -jumpHeight * parabola;
    
    ballClone.style.left = currentX + 'px';
    ballClone.style.top = (currentY + jumpOffset) + 'px';
    ballElement.style.transform = `rotate(${easedProgress * 360}deg)`;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      clearInterval(trailInterval);
      nextCell.style.boxShadow = "inset 0 0 30px rgba(255, 255, 255, 0.4), 0 0 20px rgba(255, 255, 255, 0.2)";
      
      setTimeout(() => {
        nextCell.style.boxShadow = '';
      }, 800);
      
      document.body.removeChild(ballClone);
      currentCell.removeChild(ball);
      ball.querySelector(".ball").classList.add("landing");
      nextCell.appendChild(ball);
      
      setTimeout(() => {
        const ballEl = ball.querySelector(".ball");
        if (ballEl) {
          ballEl.classList.remove("landing");
        }
      }, 800);
      
      currentRow = newRow;
      currentCol++;
      isMoving = false;
    }
  }
  
  animate();
}

function cubicBezier(p1x, p1y, p2x, p2y, t) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  
  const t2 = t * t;
  const t3 = t2 * t;
  
  return ay * t3 + by * t2 + cy * t;
}

let ball = null;
let isMoving = false;