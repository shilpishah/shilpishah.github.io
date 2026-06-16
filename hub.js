// Neural Hub - Navigable Mind System

document.addEventListener('DOMContentLoaded', () => {

// ============================================
// TITLE SCRAMBLE
// ============================================
const titleEl   = document.getElementById('main-title');
const subtitleEl = document.getElementById('subtitle');
const targetTitle = "SHILPI SHAH";
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";

function scrambleText(element, target, duration = 1500) {
  const steps = 20, stepTime = duration / steps;
  let step = 0;
  const iv = setInterval(() => {
    step++;
    const revealed = Math.floor((step / steps) * target.length);
    let result = "";
    for (let i = 0; i < target.length; i++) {
      if (target[i] === " ") result += " ";
      else if (i < revealed)  result += target[i];
      else result += chars[Math.floor(Math.random() * chars.length)];
    }
    element.textContent = result;
    if (step >= steps) { clearInterval(iv); element.textContent = target; }
  }, stepTime);
}
setTimeout(() => {
  scrambleText(titleEl, targetTitle, 2200);
  subtitleEl.style.opacity = "0";
  subtitleEl.style.transition = "opacity 0.8s ease";
  setTimeout(() => { subtitleEl.style.opacity = "1"; }, 1200);
}, 300);

// ============================================
// COGNITIVE NODES CONFIG  (radius 128 → 256 px display)
// ============================================
const cognitiveNodes = [
  { id:"self",        primary:"SELF",        secondary:"about me",    color:0xF2BE5C, radius:128, section:"about",       yOffset:-15, depthScale:1.0  },
  { id:"archive",     primary:"ARCHIVE",     secondary:"resume / CV", color:0x4ecdc4, radius:128, section:"cv",          yOffset: 12, depthScale:0.95 },
  { id:"work",        primary:"WORK",        secondary:"projects",    color:0xa855f7, radius:128, section:"projects",    yOffset: -8, depthScale:1.02 },
  { id:"memory",      primary:"MEMORY",      secondary:"blog",        color:0xf59e0b, radius:128, section:"blog",        yOffset: 18, depthScale:0.92 },
  { id:"signal",      primary:"SIGNAL",      secondary:"contact",     color:0xf472b6, radius:128, section:"contact",     yOffset: -5, depthScale:0.98 },
  { id:"exploration", primary:"EXPLORATION", secondary:"experiments", color:0x22d3ee, radius:128, section:"experiments", yOffset: 10, depthScale:0.88 },
];

// ============================================
// PIXI APP
// ============================================
const canvas = document.getElementById("hubCanvas");
const app = new PIXI.Application({
  view: canvas,
  resizeTo: window,
  backgroundColor: 0x04060e,
  antialias: true,
  resolution: window.devicePixelRatio || 1,
});

// ============================================
// CAMERA
// ============================================
const NODE_SPACING = 380;
const WORLD_WIDTH  = (cognitiveNodes.length - 1) * NODE_SPACING + 800;
let cameraX = 0;
let targetCameraX = (WORLD_WIDTH - window.innerWidth) / 2;
const CAMERA_SMOOTH = 0.05;
const PAN_SPEED     = 35;
let idleTime = 0, lastInputTime = 0;

const PARALLAX_BG    = 0.02;
const PARALLAX_FLOOR = 0.08;
const PARALLAX_ORBS  = 0.15;

// ============================================
// LAYERS
// ============================================
const bgLayer         = new PIXI.Container();
const fogLayer        = new PIXI.Container();
const roomLayer       = new PIXI.Container();
const connectionLayer = new PIXI.Container();
const orbLayer        = new PIXI.Container();

app.stage.addChild(bgLayer);
app.stage.addChild(fogLayer);
app.stage.addChild(roomLayer);
app.stage.addChildAt(connectionLayer, 3);
app.stage.addChild(orbLayer);

// ============================================
// BACKGROUND
// ============================================
const bg = new PIXI.Graphics();
bg.beginFill(0x04060e);
bg.drawRect(-2000, -1000, WORLD_WIDTH + 4000, 4000);
bg.endFill();
bgLayer.addChild(bg);

const vignette = new PIXI.Graphics();
for (let x = -2000; x < WORLD_WIDTH + 2000; x += 200) {
  vignette.beginFill(0x000000, 0.12 + Math.random() * 0.08);
  vignette.drawRect(x, -500, 200, 3000);
  vignette.endFill();
}
bgLayer.addChild(vignette);

const fogParticles = [];
for (let i = 0; i < 15; i++) {
  const fog = new PIXI.Graphics();
  fog.beginFill(0x1a2744, 0.03);
  fog.drawEllipse(0, 0, 400 + Math.random() * 600, 200 + Math.random() * 300);
  fog.endFill();
  fog.worldX = Math.random() * WORLD_WIDTH;
  fog.worldY = Math.random() * window.innerHeight;
  fog.speed  = 0.1 + Math.random() * 0.2;
  fogLayer.addChild(fog);
  fogParticles.push(fog);
}

const floor  = new PIXI.Graphics();
const floorY = window.innerHeight * 0.78;
for (let y = 0; y < window.innerHeight * 0.4; y += 2) {
  floor.beginFill(0x0a1020, 0.02 + (y / (window.innerHeight * 0.4)) * 0.12);
  floor.drawRect(-2000, floorY + y, WORLD_WIDTH + 4000, 2);
  floor.endFill();
}
roomLayer.addChild(floor);

const particles = [];
for (let i = 0; i < 60; i++) {
  const p = new PIXI.Graphics();
  p.beginFill(0xF2BE5C, 0.03 + Math.random() * 0.08);
  p.drawCircle(0, 0, 0.5 + Math.random() * 2);
  p.endFill();
  p.worldX = Math.random() * WORLD_WIDTH;
  p.worldY = Math.random() * window.innerHeight;
  p.floatOffset = Math.random() * Math.PI * 2;
  p.speed = 0.1 + Math.random() * 0.3;
  roomLayer.addChild(p);
  particles.push(p);
}

// ============================================
// HELPERS
// ============================================
function createPulseFromCenter(container, color, radius) {
  const pulse = new PIXI.Graphics();
  pulse.beginFill(color, 0.4);
  pulse.drawCircle(0, 0, radius);
  pulse.endFill();
  container.pulseContainer.addChild(pulse);
  let scale = 1, alpha = 0.4;
  const animate = () => {
    scale += 0.08; alpha -= 0.015;
    pulse.scale.set(scale); pulse.alpha = alpha;
    if (alpha > 0) requestAnimationFrame(animate);
    else container.pulseContainer.removeChild(pulse);
  };
  animate();
}

function spawnParticlesFromEdge(container, nodeData) {
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
    // Pixel size snapped to whole numbers for crunchy look
    const pxSize = Math.floor(2 + Math.random() * 3);
    const p = new PIXI.Graphics();
    p.beginFill(0xffffff, 0.9);
    p.drawRect(0, 0, pxSize, pxSize);
    p.endFill();
    p.pivot.set(pxSize / 2, pxSize / 2);
    p.x = Math.cos(angle) * nodeData.radius;
    p.y = Math.sin(angle) * nodeData.radius;
    const speed = 1.5 + Math.random() * 2.5;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.life = 1;
    container.addChild(p);
    const animate = () => {
      // Snap position to integer pixels for pixelated feel
      p.x = Math.round(p.x + p.vx);
      p.y = Math.round(p.y + p.vy);
      p.life -= 0.03; p.alpha = p.life;
      if (p.life > 0) requestAnimationFrame(animate);
      else container.removeChild(p);
    };
    animate();
  }
}

// ============================================
// NODES
// Orb images are plain <img> elements floating
// above the canvas — avoids WebGL cross-origin
// block that kills the renderer on file://
// ============================================
const nodes       = [];
const connections = [];
const nodeY       = window.innerHeight * 0.38;

cognitiveNodes.forEach((nodeData, i) => {
  const container       = new PIXI.Container();
  container.worldX      = 400 + i * NODE_SPACING;
  container.worldY      = nodeData.yOffset || 0;
  container.floatOffset = Math.random() * Math.PI * 2;
  container.nodeData    = nodeData;
  container.depthScale  = nodeData.depthScale || 1;

  // Shadow under orb (PIXI Graphics — safe, no external images)
  const shadow  = new PIXI.Graphics();
  for (let s = 10; s > 0; s--) {
    shadow.beginFill(0x000000, 0.025);
    shadow.drawEllipse(0, 0, nodeData.radius * 2.2 + s * 8, nodeData.radius * 0.4 + s * 3);
    shadow.endFill();
  }
  shadow.y = nodeData.radius + 40;
  shadow.alpha = 0.6;
  container.addChild(shadow);
  container.shadow = shadow;

  // Pulse container
  container.pulseContainer = new PIXI.Container();
  container.addChild(container.pulseContainer);

  // Labels (PIXI.Text — safe, uses internally-created canvas)
  const primaryStyle = new PIXI.TextStyle({
    fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold',
    fill: '#F2BE5C', letterSpacing: 0.6,
    dropShadow: true, dropShadowColor: '#F2BE5C',
    dropShadowBlur: 8, dropShadowDistance: 0,
  });
  const primaryText = new PIXI.Text(nodeData.primary, primaryStyle);
  primaryText.anchor.set(0.5);
  primaryText.y = nodeData.radius + 26;
  container.addChild(primaryText);
  container.primaryText = primaryText;

  const secondaryStyle = new PIXI.TextStyle({
    fontFamily: 'Courier New', fontSize: 12,
    fill: '#6b7a94', letterSpacing: 0.3,
  });
  const secondaryText = new PIXI.Text(`[ ${nodeData.secondary} ]`, secondaryStyle);
  secondaryText.anchor.set(0.5);
  secondaryText.y = nodeData.radius + 44;
  container.addChild(secondaryText);
  container.secondaryText = secondaryText;

  // HTML <img> for the hand-drawn orb — lives above the canvas
  // so Chrome's file:// WebGL restriction never applies
  const imgEl = document.createElement('img');
  imgEl.src = `assets/orb/orb${i + 1}.png`;
  imgEl.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:256px',
    'height:256px',
    'transform-origin:50% 50%',
    'pointer-events:none',
    'z-index:11',
    'image-rendering:pixelated',
    'image-rendering:crisp-edges',
    'opacity:0',
    'transition:opacity 0.4s ease',
  ].join(';');
  imgEl.onload = () => { imgEl.style.opacity = '1'; };
  document.body.appendChild(imgEl);
  container.imgEl = imgEl;

  // Interaction (PIXI handles events through the canvas)
  container.interactive = true;
  container.buttonMode  = true;
  container.cursor      = 'pointer';
  container.hitArea     = new PIXI.Circle(0, 0, nodeData.radius);

  container.on('pointerover', () => {
    container.targetScale = 1.12;
    container.primaryText.style.alpha = 1;
    container.primaryText.style.dropShadowBlur = 14;
    container.secondaryText.alpha = 0.9;
    container.secondaryText.style.fill = '#F2BE5C';
    spawnParticlesFromEdge(container, nodeData);
  });

  container.on('pointerout', () => {
    container.targetScale = 1;
    container.primaryText.style.alpha = 0.7;
    container.primaryText.style.dropShadowBlur = 6;
    container.secondaryText.alpha = 0.5;
    container.secondaryText.style.fill = '#6b7a94';
  });

  container.on('pointerdown', () => {
    createPulseFromCenter(container, nodeData.color, nodeData.radius);
    const flash = new PIXI.Graphics();
    flash.beginFill(nodeData.color, 0.9);
    flash.drawCircle(0, 0, nodeData.radius * 1.5);
    flash.endFill();
    container.addChild(flash);
    let flashAlpha = 0.9;
    const fadeFlash = () => {
      flashAlpha -= 0.15; flash.alpha = flashAlpha;
      if (flashAlpha > 0) requestAnimationFrame(fadeFlash);
      else { container.removeChild(flash); window.location.href = nodeData.section + '.html'; }
    };
    fadeFlash();
  });

  orbLayer.addChild(container);
  nodes.push(container);
});

// ============================================
// NEURAL CONNECTIONS
// ============================================
connectionLayer.alpha = 0.12;
for (let i = 0; i < nodes.length - 1; i++) {
  const line = new PIXI.Graphics();
  connectionLayer.addChild(line);
  connections.push({ line, fromIndex: i, toIndex: i + 1, flickerOffset: Math.random() * Math.PI * 2 });
}

// ============================================
// CAMERA INPUT
// ============================================
const minCameraX = -100;
const maxCameraX = WORLD_WIDTH - window.innerWidth + 100;

app.view.addEventListener('mousemove', (e) => {
  const pct = e.clientX / window.innerWidth;
  targetCameraX = minCameraX + pct * (maxCameraX - minCameraX);
  lastInputTime = Date.now();
});
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'a' || key === 'arrowleft') { targetCameraX = Math.max(targetCameraX - PAN_SPEED, minCameraX); lastInputTime = Date.now(); }
  if (key === 'd' || key === 'arrowright') { targetCameraX = Math.min(targetCameraX + PAN_SPEED, maxCameraX); lastInputTime = Date.now(); }
});

// ============================================
// MAIN ANIMATION LOOP
// ============================================
let time = 0;

app.ticker.add((delta) => {
  time += 0.012 * delta;

  if (Date.now() - lastInputTime > 2500) {
    const cx = (WORLD_WIDTH - window.innerWidth) / 2;
    targetCameraX += (cx - targetCameraX) * 0.0008 * delta;
  }

  idleTime += 0.005 * delta;
  const idleOffset = Math.sin(idleTime) * 12;

  cameraX += (targetCameraX - cameraX) * CAMERA_SMOOTH;
  cameraX  = Math.max(minCameraX, Math.min(cameraX, maxCameraX));

  bgLayer.x         = -cameraX * PARALLAX_BG;
  fogLayer.x        = -cameraX * PARALLAX_BG * 1.5 + idleOffset * 0.2;
  floor.x           = -cameraX * PARALLAX_FLOOR + idleOffset * 0.15;
  connectionLayer.x = -cameraX * PARALLAX_ORBS + idleOffset * 0.25;

  fogParticles.forEach((fog, fi) => {
    fog.x     = fog.worldX - cameraX * PARALLAX_BG * 2 + Math.sin(time * 0.1 + fi) * 30;
    fog.y     = fog.worldY + Math.sin(time * 0.05 + fi * 0.5) * 20;
    fog.alpha = 0.02 + Math.sin(time * 0.2 + fi) * 0.015;
  });

  const viewportCenter = cameraX + window.innerWidth / 2;

  nodes.forEach((node) => {
    const distFromCenter   = Math.abs(node.worldX - viewportCenter);
    const perspectiveScale = Math.max(0.72, 1 - (distFromCenter / (window.innerWidth * 0.55)) * 0.28);
    const baseScale        = node.depthScale * perspectiveScale;

    node.currentScale = node.currentScale || baseScale;
    node.targetScale  = node.targetScale  || baseScale;
    node.currentScale += (node.targetScale * baseScale - node.currentScale) * 0.08;
    node.scale.set(node.currentScale);

    const floatY = Math.sin(time + node.floatOffset) * 4;
    const floatX = Math.cos(time * 0.4 + node.floatOffset) * 1.2;

    node.x = node.worldX - cameraX * (1 - PARALLAX_ORBS) + floatX + idleOffset * 0.25;
    node.y = nodeY + node.worldY + floatY;

    if (node.shadow) {
      node.shadow.x = -floatX * 0.5;
      node.shadow.y = node.nodeData.radius + 40 + Math.abs(floatY) * 0.2;
      node.shadow.scale.set(1 - Math.abs(floatY) * 0.01);
    }

    // Sync the HTML <img> with the PIXI node position + scale
    if (node.imgEl) {
      const sc = node.currentScale;
      node.imgEl.style.transform = `translate(${node.x - 128}px,${node.y - 128}px) scale(${sc})`;
    }
  });

  connections.forEach(conn => {
    const from = nodes[conn.fromIndex];
    const to   = nodes[conn.toIndex];
    if (from && to) {
      conn.line.clear();
      const fb = Math.sin(time * 1.5 + conn.flickerOffset);
      const fl = fb > 0.6 ? 0.4 : fb > 0.3 ? 0.25 : 0.15;
      conn.line.lineStyle(1, 0xF2BE5C, fl);
      conn.line.moveTo(from.x, from.y);
      conn.line.lineTo(to.x, to.y);
    }
  });

  particles.forEach(p => {
    p.x = p.worldX - cameraX * 0.08;
    p.y = p.worldY + Math.sin(time * 0.3 + p.floatOffset) * 10;
    p.alpha = 0.03 + Math.sin(time * 0.15 + p.floatOffset) * 0.025;
    p.worldX += p.speed;
    if (p.worldX > WORLD_WIDTH + 200) p.worldX = -200;
  });
});

// ============================================
// RESIZE
// ============================================
window.addEventListener('resize', () => {
  floor.clear();
  const nfy = window.innerHeight * 0.78;
  for (let y = 0; y < window.innerHeight * 0.4; y += 2) {
    floor.beginFill(0x0a1020, 0.02 + (y / (window.innerHeight * 0.4)) * 0.12);
    floor.drawRect(-2000, nfy + y, WORLD_WIDTH + 4000, 2);
    floor.endFill();
  }
});

}); // end DOMContentLoaded
