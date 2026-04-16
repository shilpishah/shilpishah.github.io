// morph.js
const canvas = document.getElementById('morphCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Placeholder assets
const placeholderOrb = new Image();
placeholderOrb.src = 'assets/placeholderOrb.png'; // replace later
const placeholderCenter = new Image();
placeholderCenter.src = 'assets/placeholderCenter.png'; // replace later

let orbs = [];
for (let i = 0; i < 40; i++) {
  orbs.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    size: 6 + Math.random() * 6
  });
}

function updateOrbs() {
  for (let o of orbs) {
    o.x += o.vx; o.y += o.vy;
    if (o.x < 0 || o.x > canvas.width) o.vx *= -1;
    if (o.y < 0 || o.y > canvas.height) o.vy *= -1;
  }
}

function drawOrbs() {
  for (let o of orbs) {
    ctx.drawImage(placeholderOrb, o.x - o.size/2, o.y - o.size/2, o.size, o.size);
  }
}

function drawCenter() {
  // Placeholder center morphing image
  ctx.drawImage(placeholderCenter, canvas.width/2 - 225, canvas.height/2 - 130, 450, 260);
}

function loop() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  updateOrbs();
  drawOrbs();
  drawCenter();
  requestAnimationFrame(loop);
}

loop();