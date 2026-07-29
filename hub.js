// Neural Hub - Navigable Mind System

document.addEventListener('DOMContentLoaded', () => {

// ============================================
// TITLE SCRAMBLE
// ============================================
const titleEl    = document.getElementById('main-title');
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
const CAMERA_SMOOTH  = 0.05;
const PAN_SPEED      = 35;
let idleTime = 0, lastInputTime = 0;

const PARALLAX_BG    = 0.02;
const PARALLAX_FLOOR = 0.08;
const PARALLAX_ORBS  = 0.15;
const PARALLAX_STARS_FAR  = 0.01;   // barely drift — deepest background
const PARALLAX_STARS_NEAR = 0.06;   // noticeably closer than far layer

// ============================================
// LAYERS  (order = painter's algorithm, back → front)
// ============================================
const bgLayer         = new PIXI.Container(); // nebula + far stars
const nearStarLayer   = new PIXI.Container(); // near stars
const fogLayer        = new PIXI.Container(); // fog wisps
const roomLayer       = new PIXI.Container(); // floor gradient
const connectionLayer = new PIXI.Container(); // node wires
const orbLayer        = new PIXI.Container(); // orb sprites

app.stage.addChild(bgLayer);
app.stage.addChild(nearStarLayer);
app.stage.addChild(fogLayer);
app.stage.addChild(roomLayer);
app.stage.addChildAt(connectionLayer, 4);
app.stage.addChild(orbLayer);

// ============================================
// SOLID BACKGROUND
// ============================================
const bg = new PIXI.Graphics();
bg.beginFill(0x04060e);
bg.drawRect(-2000, -1000, WORLD_WIDTH + 4000, 4000);
bg.endFill();
bgLayer.addChild(bg);

// ============================================
// NEBULA CLOUDS — pixel-dithered
// Each cloud is a grid of 5×5 px squares.
// Multi-frequency sin-wave noise controls density:
// dense at the centre, wispy/irregular at the edges.
// Clouds are positioned to overlap each other so
// colours mix in the shared region.
// bgLayer parallax is 0.01 so clouds are essentially
// fixed in screen space (deep-background feel).
// ============================================
// Pixels above CORE_DENSITY_THRESHOLD are baked into a static Graphics
// per cloud (cheap, never touched again). Among the wispier pixels below
// it, only DUST_FRACTION become individually interactive — these drift
// to a rest position and scatter away from the cursor on hover.
const NEB_PX = 5; // pixel grid size
const CORE_DENSITY_THRESHOLD = 0.65; // only the very brightest peak stays static
const DUST_FRACTION          = 0.6;  // most eligible pixels become reactive
const nebulaDustPixels       = [];
const nebulaDefs = [
  { color: 0x4a6fa8, cx: window.innerWidth * 0.10, cy: window.innerHeight * 0.38, rx: 255, ry: 145 },
  { color: 0x5a3a7a, cx: window.innerWidth * 0.30, cy: window.innerHeight * 0.55, rx: 275, ry: 155 },
  { color: 0x1a6a7a, cx: window.innerWidth * 0.52, cy: window.innerHeight * 0.26, rx: 260, ry: 148 },
  { color: 0x3d5c9a, cx: window.innerWidth * 0.70, cy: window.innerHeight * 0.60, rx: 248, ry: 140 },
  { color: 0x5a3a7a, cx: window.innerWidth * 0.90, cy: window.innerHeight * 0.42, rx: 258, ry: 146 },
];
nebulaDefs.forEach(def => {
  const g = new PIXI.Graphics();
  for (let px = def.cx - def.rx; px < def.cx + def.rx; px += NEB_PX) {
    for (let py = def.cy - def.ry; py < def.cy + def.ry; py += NEB_PX) {
      const nx   = (px - def.cx) / def.rx;
      const ny   = (py - def.cy) / def.ry;
      const dist = Math.sqrt(nx * nx + ny * ny);
      if (dist >= 1.0) continue;
      // Layered sin-wave noise — different frequencies break up the shape
      const noise =
        Math.sin(px * 0.055 + 0.9) * 0.35 +
        Math.cos(py * 0.075 + 2.1) * 0.30 +
        Math.sin((px + py) * 0.038 + 1.4) * 0.20 +
        Math.cos((px - py) * 0.048 + 0.6) * 0.15;
      const density = (1 - dist * dist) * (0.5 + noise * 0.5);
      if (density <= 0.05) continue;
      if (Math.random() > density) continue;  // stochastic — wispy edges
      const alpha = Math.min(0.38, density * 0.36);
      const gx = Math.round(px / NEB_PX) * NEB_PX;
      const gy = Math.round(py / NEB_PX) * NEB_PX;

      const isEdge = density < CORE_DENSITY_THRESHOLD;
      if (isEdge && Math.random() < DUST_FRACTION) {
        const dust = new PIXI.Graphics();
        dust.beginFill(def.color, alpha);
        dust.drawRect(0, 0, NEB_PX - 1, NEB_PX - 1);
        dust.endFill();
        dust.x = dust.restX = gx;
        dust.y = dust.restY = gy;
        dust.baseAlpha = alpha;
        dust.alpha = alpha;
        bgLayer.addChild(dust);
        nebulaDustPixels.push(dust);
      } else {
        g.beginFill(def.color, alpha);
        g.drawRect(gx, gy, NEB_PX - 1, NEB_PX - 1);
        g.endFill();
      }
    }
  }
  bgLayer.addChild(g);
});

// ============================================
// STAR FIELD — two depth layers
// Pixel-crunchy: all stars are square drawRect,
// positions snapped to integers.
// Colors: mostly white, sprinkle of pale blue
// and faint warm-gold so they feel alive without
// competing with the golden labels.
// ============================================
function starColor() {
  const r = Math.random();
  if (r < 0.75) return 0xffffff;        // pure white
  if (r < 0.90) return 0xd0e0ff;        // pale blue
  return 0xfff4d6;                       // faint warm gold
}

// FAR STARS — in bgLayer, parallax 0.01
const farStars = [];
for (let i = 0; i < 200; i++) {
  const size      = Math.random() < 0.72 ? 1 : 2;    // mostly 1-px
  const baseAlpha = 0.15 + Math.random() * 0.45;
  const s = new PIXI.Graphics();
  s.beginFill(starColor());
  s.drawRect(0, 0, size, size);
  s.endFill();
  s.x           = Math.round(Math.random() * (WORLD_WIDTH + 600) - 300);
  s.y           = Math.round(Math.random() * window.innerHeight);
  s.baseAlpha   = baseAlpha;
  s.blinkAmp    = Math.random() * 0.25;               // gentle, barely visible blink
  s.blinkSpeed  = 0.2 + Math.random() * 0.6;
  s.blinkOffset = Math.random() * Math.PI * 2;
  s.alpha       = baseAlpha;
  bgLayer.addChild(s);
  farStars.push(s);
}

// NEAR STARS — in nearStarLayer, parallax 0.06
const nearStars = [];
for (let i = 0; i < 80; i++) {
  const size      = Math.random() < 0.5 ? 2 : 3;     // slightly chunkier
  const baseAlpha = 0.35 + Math.random() * 0.50;
  const s = new PIXI.Graphics();
  s.beginFill(starColor());
  s.drawRect(0, 0, size, size);
  s.endFill();
  s.x           = Math.round(Math.random() * (WORLD_WIDTH + 600) - 300);
  s.y           = Math.round(Math.random() * window.innerHeight);
  s.baseAlpha   = baseAlpha;
  s.blinkAmp    = 0.12 + Math.random() * 0.35;        // blink more noticeably
  s.blinkSpeed  = 0.5 + Math.random() * 1.8;
  s.blinkOffset = Math.random() * Math.PI * 2;
  s.alpha       = baseAlpha;
  nearStarLayer.addChild(s);
  nearStars.push(s);
}

// ============================================
// VIGNETTE  (subtle vertical darkening at edges)
// ============================================
const vignette = new PIXI.Graphics();
for (let x = -2000; x < WORLD_WIDTH + 2000; x += 200) {
  vignette.beginFill(0x000000, 0.08 + Math.random() * 0.05);
  vignette.drawRect(x, -500, 200, 3000);
  vignette.endFill();
}
bgLayer.addChild(vignette);

// ============================================
// FOG WISPS
// ============================================
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

// ============================================
// FLOOR GRADIENT
// ============================================
const floor  = new PIXI.Graphics();
const floorY = window.innerHeight * 0.78;
for (let y = 0; y < window.innerHeight * 0.4; y += 2) {
  floor.beginFill(0x0a1020, 0.02 + (y / (window.innerHeight * 0.4)) * 0.12);
  floor.drawRect(-2000, floorY + y, WORLD_WIDTH + 4000, 2);
  floor.endFill();
}
roomLayer.addChild(floor);

// ============================================
// AMBIENT PARTICLES  (neural signal dust)
// ============================================
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
    const angle   = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
    const pxSize  = Math.floor(2 + Math.random() * 3);
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

  // Shadow — kept tight so it doesn't bleed into adjacent orbs
  const shadow  = new PIXI.Graphics();
  for (let s = 5; s > 0; s--) {
    shadow.beginFill(0x000000, 0.03);
    shadow.drawEllipse(0, 0, nodeData.radius * 0.6 + s * 5, nodeData.radius * 0.14 + s * 1.5);
    shadow.endFill();
  }
  shadow.y = nodeData.radius + 30;
  shadow.alpha = 0.55;
  container.addChild(shadow);
  container.shadow = shadow;

  // Pulse container
  container.pulseContainer = new PIXI.Container();
  container.addChild(container.pulseContainer);

  // Labels
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

  const nodeColorHex = '#' + nodeData.color.toString(16).padStart(6, '0');
  const secondaryStyle = new PIXI.TextStyle({
    fontFamily: 'Courier New', fontSize: 12,
    fill: '#b8c4dc', letterSpacing: 0.3,
    dropShadow: true, dropShadowColor: nodeColorHex,
    dropShadowBlur: 4, dropShadowDistance: 0,
  });
  const secondaryText = new PIXI.Text(`[ ${nodeData.secondary} ]`, secondaryStyle);
  secondaryText.anchor.set(0.5);
  secondaryText.y = nodeData.radius + 44;
  container.addChild(secondaryText);
  container.secondaryText = secondaryText;

  // HTML <img> for the hand-drawn orb
  const imgEl = document.createElement('img');
  imgEl.src = `assets/orb/orb${i + 1}.png`;
  imgEl.style.cssText = [
    'position:fixed', 'top:0', 'left:0',
    'width:256px', 'height:256px',
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

  // Interaction
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
    container.secondaryText.alpha = 0.85;
    container.secondaryText.style.fill = '#b8c4dc';
  });
  container.on('pointerdown', () => {
    window.location.href = nodeData.section + '.html';
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

let mouseScreenX = -9999, mouseScreenY = -9999;
app.view.addEventListener('mousemove', (e) => {
  const pct = e.clientX / window.innerWidth;
  targetCameraX = minCameraX + pct * (maxCameraX - minCameraX);
  lastInputTime = Date.now();
  mouseScreenX = e.clientX;
  mouseScreenY = e.clientY;
});
app.view.addEventListener('mouseleave', () => {
  mouseScreenX = -9999;
  mouseScreenY = -9999;
});
function handleTouchPan(e) {
  if (e.touches.length === 0) return;
  const touch = e.touches[0];
  const pct = touch.clientX / window.innerWidth;
  targetCameraX = minCameraX + pct * (maxCameraX - minCameraX);
  lastInputTime = Date.now();
  mouseScreenX = touch.clientX;
  mouseScreenY = touch.clientY;
}
app.view.addEventListener('touchstart', handleTouchPan, { passive: true });
app.view.addEventListener('touchmove', handleTouchPan, { passive: true });
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'a' || key === 'arrowleft')  { targetCameraX = Math.max(targetCameraX - PAN_SPEED, minCameraX); lastInputTime = Date.now(); }
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

  // Parallax layers
  bgLayer.x         = -cameraX * PARALLAX_STARS_FAR;   // 0.01 — far stars + nebula
  nearStarLayer.x   = -cameraX * PARALLAX_STARS_NEAR;  // 0.06 — near stars
  fogLayer.x        = -cameraX * PARALLAX_BG * 1.5 + idleOffset * 0.2;
  floor.x           = -cameraX * PARALLAX_FLOOR + idleOffset * 0.15;
  connectionLayer.x = -cameraX * PARALLAX_ORBS + idleOffset * 0.25;

  // Star twinkling
  farStars.forEach(s => {
    s.alpha = Math.max(0.05, Math.min(1,
      s.baseAlpha + Math.sin(time * s.blinkSpeed + s.blinkOffset) * s.blinkAmp
    ));
  });
  nearStars.forEach(s => {
    s.alpha = Math.max(0.05, Math.min(1,
      s.baseAlpha + Math.sin(time * s.blinkSpeed + s.blinkOffset) * s.blinkAmp
    ));
  });

  // Nebula dust — scatter away from cursor, ease back to rest when idle
  const DUST_REPEL_RADIUS   = 150;
  const DUST_REPEL_STRENGTH = 34;
  nebulaDustPixels.forEach(dust => {
    const screenX = bgLayer.x + dust.restX;
    const screenY = dust.restY;
    const dx = screenX - mouseScreenX;
    const dy = screenY - mouseScreenY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < DUST_REPEL_RADIUS) {
      const force = 1 - dist / DUST_REPEL_RADIUS;
      const angle = Math.atan2(dy, dx);
      const targetX = dust.restX + Math.cos(angle) * force * DUST_REPEL_STRENGTH;
      const targetY = dust.restY + Math.sin(angle) * force * DUST_REPEL_STRENGTH;
      dust.x += (targetX - dust.x) * 0.18;
      dust.y += (targetY - dust.y) * 0.18;
      dust.alpha += (dust.baseAlpha * (1 - force * 0.6) - dust.alpha) * 0.15;
    } else {
      dust.x += (dust.restX - dust.x) * 0.05;
      dust.y += (dust.restY - dust.y) * 0.05;
      dust.alpha += (dust.baseAlpha - dust.alpha) * 0.05;
    }
  });

  // Fog
  fogParticles.forEach((fog, fi) => {
    fog.x     = fog.worldX - cameraX * PARALLAX_BG * 2 + Math.sin(time * 0.1 + fi) * 30;
    fog.y     = fog.worldY + Math.sin(time * 0.05 + fi * 0.5) * 20;
    fog.alpha = 0.02 + Math.sin(time * 0.2 + fi) * 0.015;
  });

  const viewportCenter = cameraX + window.innerWidth / 2;

  // Nodes
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

    if (node.imgEl) {
      const sc = node.currentScale;
      node.imgEl.style.transform = `translate(${node.x - 128}px,${node.y - 128}px) scale(${sc})`;
    }
  });

  // Connection flicker
  connections.forEach(conn => {
    const from = nodes[conn.fromIndex], to = nodes[conn.toIndex];
    if (from && to) {
      conn.line.clear();
      const fb = Math.sin(time * 1.5 + conn.flickerOffset);
      const fl = fb > 0.6 ? 0.4 : fb > 0.3 ? 0.25 : 0.15;
      conn.line.lineStyle(1, 0xF2BE5C, fl);
      conn.line.moveTo(from.x, from.y);
      conn.line.lineTo(to.x, to.y);
    }
  });

  // Ambient dust
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
