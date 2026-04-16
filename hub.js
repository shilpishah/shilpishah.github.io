// Neural Hub - Navigable Mind System
// Cognitive nodes in a connected neural pathway
// TODO: Replace node visuals with hand-drawn assets
// TODO: Replace with hand-drawn neural environment background

document.addEventListener('DOMContentLoaded', () => {

// ============================================
// TITLE SCRAMBLE ANIMATION
// ============================================
const titleEl = document.getElementById('main-title');
const subtitleEl = document.getElementById('subtitle');
const targetTitle = "SHILPI SHAH";
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";

function scrambleText(element, target, duration = 1500) {
  const steps = 20;
  const stepTime = duration / steps;
  let step = 0;
  
  const interval = setInterval(() => {
    step++;
    const progress = step / steps;
    const revealed = Math.floor(progress * target.length);
    
    let result = "";
    for (let i = 0; i < target.length; i++) {
      if (target[i] === " ") {
        result += " ";
      } else if (i < revealed) {
        result += target[i];
      } else {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    
    element.textContent = result;
    
    if (step >= steps) {
      clearInterval(interval);
      element.textContent = target;
    }
  }, stepTime);
}

// Start scramble animation after brief delay
setTimeout(() => {
  scrambleText(titleEl, targetTitle, 2200);
  subtitleEl.style.opacity = "0";
  subtitleEl.style.transition = "opacity 0.8s ease";
  setTimeout(() => {
    subtitleEl.style.opacity = "1";
  }, 1200);
}, 300);

// ============================================
// COGNITIVE NODES CONFIG
// ============================================
const cognitiveNodes = [
  { id: "self", primary: "SELF", secondary: "about me", color: 0xF2BE5C, radius: 52, section: "about", yOffset: -15, depthScale: 1.0 },
  { id: "archive", primary: "ARCHIVE", secondary: "resume / CV", color: 0x4ecdc4, radius: 50, section: "cv", yOffset: 12, depthScale: 0.95 },
  { id: "work", primary: "WORK", secondary: "projects", color: 0xa855f7, radius: 54, section: "projects", yOffset: -8, depthScale: 1.02 },
  { id: "memory", primary: "MEMORY", secondary: "blog", color: 0xf59e0b, radius: 48, section: "blog", yOffset: 18, depthScale: 0.92 },
  { id: "signal", primary: "SIGNAL", secondary: "contact", color: 0xf472b6, radius: 50, section: "contact", yOffset: -5, depthScale: 0.98 },
  { id: "exploration", primary: "EXPLORATION", secondary: "experiments", color: 0x22d3ee, radius: 46, section: "experiments", yOffset: 10, depthScale: 0.88 }
];

const canvas = document.getElementById("hubCanvas");
const app = new PIXI.Application({
  view: canvas,
  resizeTo: window,
  backgroundColor: 0x04060e,
  antialias: true,
  resolution: window.devicePixelRatio || 1
});

// ============================================
// CAMERA SYSTEM
// ============================================
const NODE_SPACING = 340;
const WORLD_WIDTH = (cognitiveNodes.length - 1) * NODE_SPACING + 800;
let cameraX = 0;
let targetCameraX = (WORLD_WIDTH - window.innerWidth) / 2;
const CAMERA_SMOOTH = 0.05;
const PAN_SPEED = 35;
let idleTime = 0;
let lastInputTime = 0;

const PARALLAX_BG = 0.02;
const PARALLAX_FLOOR = 0.08;
const PARALLAX_ORBS = 0.15;

// ============================================
// LAYERS
// ============================================
const bgLayer = new PIXI.Container();
const fogLayer = new PIXI.Container();
const roomLayer = new PIXI.Container();
const connectionLayer = new PIXI.Container();
const orbLayer = new PIXI.Container();
const pulseLayer = new PIXI.Container();

app.stage.addChild(bgLayer);
app.stage.addChild(fogLayer);
app.stage.addChild(roomLayer);
app.stage.addChildAt(connectionLayer, 3);
app.stage.addChild(orbLayer);
app.stage.addChild(pulseLayer);

// ============================================
// BACKGROUND - Atmospheric neural space
// ============================================
const bg = new PIXI.Graphics();
bg.beginFill(0x04060e);
bg.drawRect(-2000, -1000, WORLD_WIDTH + 4000, 4000);
bg.endFill();
bgLayer.addChild(bg);

// Vignette overlay
const vignette = new PIXI.Graphics();
for (let x = -2000; x < WORLD_WIDTH + 2000; x += 200) {
  const alpha = 0.12 + Math.random() * 0.08;
  vignette.beginFill(0x000000, alpha);
  vignette.drawRect(x, -500, 200, 3000);
  vignette.endFill();
}
bgLayer.addChild(vignette);

// Fog layers
const fogParticles = [];
for (let i = 0; i < 15; i++) {
  const fog = new PIXI.Graphics();
  const w = 400 + Math.random() * 600;
  const h = 200 + Math.random() * 300;
  fog.beginFill(0x1a2744, 0.03);
  fog.drawEllipse(0, 0, w, h);
  fog.endFill();
  fog.worldX = Math.random() * WORLD_WIDTH;
  fog.worldY = Math.random() * window.innerHeight;
  fog.speed = 0.1 + Math.random() * 0.2;
  fogLayer.addChild(fog);
  fogParticles.push(fog);
}

// Floor gradient
const floor = new PIXI.Graphics();
const floorY = window.innerHeight * 0.78;
for (let y = 0; y < window.innerHeight * 0.4; y += 2) {
  const progress = y / (window.innerHeight * 0.4);
  const alpha = 0.02 + progress * 0.12;
  floor.beginFill(0x0a1020, alpha);
  floor.drawRect(-2000, floorY + y, WORLD_WIDTH + 4000, 2);
  floor.endFill();
}
roomLayer.addChild(floor);

// Ambient particles (neural signals)
const particles = [];
for (let i = 0; i < 60; i++) {
  const p = new PIXI.Graphics();
  const size = 0.5 + Math.random() * 2;
  const alpha = 0.03 + Math.random() * 0.08;
  p.beginFill(0xF2BE5C, alpha);
  p.drawCircle(0, 0, size);
  p.endFill();
  p.worldX = Math.random() * WORLD_WIDTH;
  p.worldY = Math.random() * window.innerHeight;
  p.floatOffset = Math.random() * Math.PI * 2;
  p.speed = 0.1 + Math.random() * 0.3;
  roomLayer.addChild(p);
  particles.push(p);
}

// ============================================
// NODE CREATION - Pseudo-3D Spheres
// ============================================
const nodes = [];
const connections = [];
const nodeY = window.innerHeight * 0.38;

cognitiveNodes.forEach((nodeData, i) => {
  const container = new PIXI.Container();
  
  // World position with Y offset for layout variation
  container.worldX = 400 + i * NODE_SPACING;
  container.worldY = nodeData.yOffset || 0;
  container.floatOffset = Math.random() * Math.PI * 2;
  container.nodeData = nodeData;
  container.depthScale = nodeData.depthScale || 1;
  
  // Shadow - soft blurred ellipse directly under node
  const shadow = new PIXI.Graphics();
  const shadowWidth = nodeData.radius * 2.2;
  const shadowHeight = nodeData.radius * 0.4;
  for (let s = 10; s > 0; s--) {
    shadow.beginFill(0x000000, 0.025);
    shadow.drawEllipse(0, 0, shadowWidth + s * 8, shadowHeight + s * 3);
    shadow.endFill();
  }
  shadow.y = nodeData.radius + 40;
  shadow.alpha = 0.6;
  container.addChild(shadow);
  container.shadow = shadow;
  
  // Glow layer - centered on node, layered (inner + outer)
  const glowContainer = new PIXI.Container();
  
  // Outer glow
  const outerGlow = new PIXI.Graphics();
  for (let g = 15; g > 5; g--) {
    const alpha = 0.015 / g;
    outerGlow.beginFill(nodeData.color, alpha);
    outerGlow.drawCircle(0, 0, nodeData.radius + g * 10);
    outerGlow.endFill();
  }
  glowContainer.addChild(outerGlow);
  
  // Inner glow (brighter)
  const innerGlow = new PIXI.Graphics();
  for (let g = 5; g > 0; g--) {
    const alpha = 0.08 / g;
    innerGlow.beginFill(nodeData.color, alpha);
    innerGlow.drawCircle(0, 0, nodeData.radius + g * 5);
    innerGlow.endFill();
  }
  glowContainer.addChild(innerGlow);
  
  container.addChild(glowContainer);
  container.glow = glowContainer;
  
  // Pseudo-3D Sphere Core
  const sphere = new PIXI.Container();
  
  // Base sphere with radial gradient effect (simulated with concentric circles)
  const baseRadius = nodeData.radius;
  const sphereBody = new PIXI.Graphics();
  
  // Darker outer ring for depth
  sphereBody.beginFill(0x000000, 0.3);
  sphereBody.drawCircle(0, 0, baseRadius);
  sphereBody.endFill();
  
  // Main colored body
  sphereBody.beginFill(nodeData.color, 0.7);
  sphereBody.drawCircle(0, 0, baseRadius * 0.95);
  sphereBody.endFill();
  
  // Inner gradient rings for 3D depth
  for (let r = baseRadius * 0.9; r > baseRadius * 0.3; r -= 2) {
    const depthAlpha = 0.1 * (1 - r / baseRadius);
    sphereBody.beginFill(0xffffff, depthAlpha);
    sphereBody.drawCircle(0, 0, r);
    sphereBody.endFill();
  }
  
  // Soft highlight that shifts (slowly rotating)
  const highlight = new PIXI.Graphics();
  highlight.beginFill(0xffffff, 0.35);
  highlight.drawEllipse(-baseRadius * 0.3, -baseRadius * 0.3, baseRadius * 0.35, baseRadius * 0.25);
  highlight.endFill();
  sphere.addChild(sphereBody);
  sphere.addChild(highlight);
  container.addChild(sphere);
  container.sphere = sphere;
  container.highlight = highlight;
  
  // Pulse container - for click pulse effect from center
  container.pulseContainer = new PIXI.Container();
  container.addChild(container.pulseContainer);
  
  // Labels - Courier New font (minimalist, like landing page)
  const primaryStyle = new PIXI.TextStyle({
    fontFamily: "Courier New",
    fontSize: 10,
    fontWeight: "bold",
    fill: '#F2BE5C',
    letterSpacing: 0.6,
    dropShadow: true,
    dropShadowColor: '#F2BE5C',
    dropShadowBlur: 8,
    dropShadowDistance: 0,
    alpha: 0.9
  });
  const primaryText = new PIXI.Text(nodeData.primary, primaryStyle);
  primaryText.anchor.set(0.5);
  primaryText.y = nodeData.radius + 26;
  container.addChild(primaryText);
  container.primaryText = primaryText;
  
  // Secondary label
  const secondaryStyle = new PIXI.TextStyle({
    fontFamily: "Courier New",
    fontSize: 8,
    fill: '#6b7a94',
    letterSpacing: 0.3,
    alpha: 0.65
  });
  const secondaryText = new PIXI.Text(`[ ${nodeData.secondary} ]`, secondaryStyle);
  secondaryText.anchor.set(0.5);
  secondaryText.y = nodeData.radius + 40;
  container.addChild(secondaryText);
  container.secondaryText = secondaryText;
  
  // Interaction
  container.interactive = true;
  container.buttonMode = true;
  container.cursor = 'pointer';
  container.hitArea = new PIXI.Circle(0, 0, nodeData.radius * 1.8);
  
  container.on('pointerover', () => {
    container.targetScale = 1.15;
    container.primaryText.style.alpha = 1;
    container.primaryText.style.dropShadowBlur = 14;
    container.secondaryText.alpha = 0.9;
    container.secondaryText.style.fill = '#F2BE5C';
    container.glow.alpha = 1.5;
    // Spawn particles FROM node edge
    spawnParticlesFromEdge(container, nodeData);
  });
  
  container.on('pointerout', () => {
    container.targetScale = 1;
    container.primaryText.style.alpha = 0.7;
    container.primaryText.style.dropShadowBlur = 6;
    container.secondaryText.alpha = 0.5;
    container.secondaryText.style.fill = '#6b7a94';
    container.glow.alpha = 1;
  });
  
  container.on('pointerdown', () => {
    // Pulse effect from center
    createPulseFromCenter(container, nodeData.color, nodeData.radius);
    
    // Flash and navigate
    const flash = new PIXI.Graphics();
    flash.beginFill(nodeData.color, 0.9);
    flash.drawCircle(0, 0, nodeData.radius * 1.5);
    flash.endFill();
    container.addChild(flash);
    
    let flashAlpha = 0.9;
    const fadeFlash = () => {
      flashAlpha -= 0.15;
      flash.alpha = flashAlpha;
      if (flashAlpha > 0) {
        requestAnimationFrame(fadeFlash);
      } else {
        container.removeChild(flash);
        window.location.href = nodeData.section + '.html';
      }
    };
    fadeFlash();
  });
  
  orbLayer.addChild(container);
  nodes.push(container);
});

// ============================================
// PULSE EFFECT - Expands from node center
// ============================================
function createPulseFromCenter(container, color, radius) {
  const pulse = new PIXI.Graphics();
  pulse.beginFill(color, 0.4);
  pulse.drawCircle(0, 0, radius);
  pulse.endFill();
  pulse.x = 0;
  pulse.y = 0;
  container.pulseContainer.addChild(pulse);
  
  let scale = 1;
  let alpha = 0.4;
  
  const animate = () => {
    scale += 0.08;
    alpha -= 0.015;
    pulse.scale.set(scale);
    pulse.alpha = alpha;
    
    if (alpha > 0) {
      requestAnimationFrame(animate);
    } else {
      container.pulseContainer.removeChild(pulse);
    }
  };
  animate();
}

// ============================================
// PARTICLES FROM EDGE
// ============================================
function spawnParticlesFromEdge(container, nodeData) {
  const edgeRadius = nodeData.radius;
  const color = nodeData.color;
  
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
    const p = new PIXI.Graphics();
    const size = 1 + Math.random() * 1.5;
    p.beginFill(color, 0.7);
    p.drawCircle(0, 0, size);
    p.endFill();
    
    // Spawn at edge of node
    const spawnX = Math.cos(angle) * edgeRadius;
    const spawnY = Math.sin(angle) * edgeRadius;
    p.x = spawnX;
    p.y = spawnY;
    
    const speed = 1.5 + Math.random() * 2;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.life = 1;
    
    container.addChild(p);
    
    const animate = () => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.025;
      p.alpha = p.life;
      if (p.life > 0) {
        requestAnimationFrame(animate);
      } else {
        container.removeChild(p);
      }
    };
    animate();
  }
}

// ============================================
// NEURAL CONNECTIONS
// ============================================
connectionLayer.alpha = 0.12;

for (let i = 0; i < nodes.length - 1; i++) {
  const line = new PIXI.Graphics();
  line.lineStyle(1, 0xF2BE5C, 0.25);
  connectionLayer.addChild(line);
  connections.push({
    line: line,
    fromIndex: i,
    toIndex: i + 1,
    flickerOffset: Math.random() * Math.PI * 2
  });
}

// ============================================
// CAMERA BOUNDS & INPUT
// ============================================
const minCameraX = -100;
const maxCameraX = WORLD_WIDTH - window.innerWidth + 100;

app.view.addEventListener('mousemove', (e) => {
  const mousePercent = e.clientX / window.innerWidth;
  targetCameraX = minCameraX + mousePercent * (maxCameraX - minCameraX);
  lastInputTime = Date.now();
});

document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'a' || key === 'arrowleft') {
    targetCameraX = Math.max(targetCameraX - PAN_SPEED, minCameraX);
    lastInputTime = Date.now();
  } else if (key === 'd' || key === 'arrowright') {
    targetCameraX = Math.min(targetCameraX + PAN_SPEED, maxCameraX);
    lastInputTime = Date.now();
  }
});

// ============================================
// MAIN ANIMATION LOOP
// ============================================
let time = 0;

app.ticker.add((delta) => {
  time += 0.012 * delta;
  
  // Idle drift toward center after inactivity
  const timeSinceInput = Date.now() - lastInputTime;
  if (timeSinceInput > 2500) {
    const centerX = (WORLD_WIDTH - window.innerWidth) / 2;
    targetCameraX += (centerX - targetCameraX) * 0.0008 * delta;
  }
  
  idleTime += 0.005 * delta;
  const idleOffset = Math.sin(idleTime) * 12;
  
  // Smooth camera
  cameraX += (targetCameraX - cameraX) * CAMERA_SMOOTH;
  cameraX = Math.max(minCameraX, Math.min(cameraX, maxCameraX));
  
  // Parallax layers
  bgLayer.x = -cameraX * PARALLAX_BG;
  fogLayer.x = -cameraX * PARALLAX_BG * 1.5 + idleOffset * 0.2;
  floor.x = -cameraX * PARALLAX_FLOOR + idleOffset * 0.15;
  connectionLayer.x = -cameraX * PARALLAX_ORBS + idleOffset * 0.25;
  
  // Fog animation
  fogParticles.forEach((fog, i) => {
    fog.x = fog.worldX - cameraX * PARALLAX_BG * 2 + Math.sin(time * 0.1 + i) * 30;
    fog.y = fog.worldY + Math.sin(time * 0.05 + i * 0.5) * 20;
    fog.alpha = 0.02 + Math.sin(time * 0.2 + i) * 0.015;
  });
  
  // Viewport center for perspective scaling
  const viewportCenter = cameraX + window.innerWidth / 2;
  
  // Update nodes
  nodes.forEach((node, i) => {
    // Perspective scale based on distance from center
    const distFromCenter = Math.abs(node.worldX - viewportCenter);
    const maxDist = window.innerWidth * 0.55;
    const perspectiveScale = Math.max(0.72, 1 - (distFromCenter / maxDist) * 0.28);
    
    // Apply depth scale from config
    const baseScale = node.depthScale * perspectiveScale;
    
    // Smooth scale transition
    node.currentScale = (node.currentScale || baseScale);
    node.targetScale = (node.targetScale || baseScale);
    const target = node.targetScale * baseScale;
    node.currentScale += (target - node.currentScale) * 0.08;
    node.scale.set(node.currentScale);
    
    // Float animation
    const floatY = Math.sin(time + node.floatOffset) * 4;
    const floatX = Math.cos(time * 0.4 + node.floatOffset) * 1.2;
    
    // Position with parallax and float
    node.x = node.worldX - cameraX * (1 - PARALLAX_ORBS) + floatX + idleOffset * 0.25;
    node.y = nodeY + node.worldY + floatY;
    
    // Slowly rotating highlight for pseudo-3D effect
    if (node.highlight) {
      const rotSpeed = 0.003;
      node.highlight.x = Math.cos(time * rotSpeed + i) * node.nodeData.radius * 0.25;
      node.highlight.y = Math.sin(time * rotSpeed + i) * node.nodeData.radius * 0.15;
    }
    
    // Shadow follows
    if (node.shadow) {
      node.shadow.x = -floatX * 0.5;
      node.shadow.y = node.nodeData.radius + 40 + Math.abs(floatY) * 0.2;
      node.shadow.scale.set(1 - Math.abs(floatY) * 0.01);
    }
    
    // Glow centered on node
    if (node.glow) {
      node.glow.x = 0;
      node.glow.y = 0;
    }
  });
  
  // Update connection lines with flicker
  connections.forEach(conn => {
    const from = nodes[conn.fromIndex];
    const to = nodes[conn.toIndex];
    
    if (from && to) {
      conn.line.clear();
      // Flicker effect
      const flickerBase = Math.sin(time * 1.5 + conn.flickerOffset);
      const flicker = flickerBase > 0.6 ? 0.4 : (flickerBase > 0.3 ? 0.25 : 0.15);
      conn.line.lineStyle(1, 0xF2BE5C, flicker);
      conn.line.moveTo(from.x, from.y);
      conn.line.lineTo(to.x, to.y);
    }
  });
  
  // Ambient particles
  particles.forEach(p => {
    p.x = p.worldX - cameraX * 0.08;
    p.y = p.worldY + Math.sin(time * 0.3 + p.floatOffset) * 10;
    p.alpha = 0.03 + Math.sin(time * 0.15 + p.floatOffset) * 0.025;
    
    // Drift
    p.worldX += p.speed;
    if (p.worldX > WORLD_WIDTH + 200) p.worldX = -200;
  });
});

// ============================================
// RESIZE HANDLER
// ============================================
window.addEventListener('resize', () => {
  floor.clear();
  const newFloorY = window.innerHeight * 0.78;
  for (let y = 0; y < window.innerHeight * 0.4; y += 2) {
    const progress = y / (window.innerHeight * 0.4);
    const alpha = 0.02 + progress * 0.12;
    floor.beginFill(0x0a1020, alpha);
    floor.drawRect(-2000, newFloorY + y, WORLD_WIDTH + 4000, 2);
    floor.endFill();
  }
});

});
