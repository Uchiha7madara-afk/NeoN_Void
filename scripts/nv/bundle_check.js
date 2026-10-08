/* ============================================================
   NEON VOID — Feel Slice v0.1  (single-file build)
   Bands below map 1:1 to the future src/ split.
   All tuning lives in CFG. All shapes are generated at runtime.
   ============================================================ */
(async () => {

function bootFail () {
  const el = document.getElementById('boot-error');
  if (el) el.style.display = 'flex';
}
if (typeof PIXI === 'undefined') { bootFail(); return; }

/* ===== 00 CONFIG ===== */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const rand  = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const damp  = (rate, dt) => 1 - Math.exp(-rate * dt);
function lerpAngle (a, b, t) {
  let d = (b - a) % TAU;
  if (d >  Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

const CFG = {
  world: { w: 1280, h: 720, bound: 24, spawnInset: 46 },

  colors: {
    bg:      0x0a0014,   // arena floor
    bar:     0x05010a,   // letterbox
    grid:    0x9d5cff,   // faint purple grid
    border:  0xa44dff,   // arena border
    player:  0x2cf6ff,   // cyan
    core:    0xdfffff,   // near-white cores
    trail:   0xff2ec4,   // pink engine
    drone:   0xff2b4e,   // red drones
    droneHi: 0xffd9de,
    text:    '#eaf6ff',
    textDim: '#8f7fb8',
  },

  bloom: { threshold: 0.22, bloomScale: 0.85, brightness: 1.12, blur: 7 },

  player: {
    accel: 2600, maxSpeed: 360, drag: 4.2,
    turnLerp: 18,
    radius: 9,            // hitbox — deliberately smaller than the sprite
    hp: 3, iframes: 1.5,
    fireRate: 8,          // shots / sec while holding LMB
    bulletSpeed: 780, bulletLife: 1.05, bulletRadius: 3.5, bulletSpread: 0.014,
    wallBounce: 0.45,
    trailRate: 70,        // particles / sec at full thrust
  },

  drone: {
    radius: 13, hp: 1,
    baseSpeed: 62, speedRamp: 0.075, speedCap: 2.5,
    accel: 300,
    weaveFreq: 2.1, weaveAmp: 0.55,
    sepDist: 34, sepForce: 150,
    spin: 1.3, pulseAmp: 0.09, pulseRate: 3.2,
    score: 100, maxActive: 34,
  },

  waves: {
    quota:        w => 4 + Math.floor(w * 1.7),
    spawnInterval:w => Math.max(0.42, 1.5 - w * 0.11),
    breather: 2.2, telegraph: 0.7,
    minPlayerDist: 190,
  },

  feel: {
    shakeMax: 16, traumaDecay: 1.7,
    traumaKill: 0.34, traumaHurt: 0.85, traumaWall: 0.10,
    hitstopKill: 0.05, hitstopHurt: 0.10,
    gridPulseKill: 0.55, gridPulseDecay: 2.4,
    hurtFlash: 0.24,
    dyingSlowmo: 0.22, dyingTime: 0.85,
  },

  pools: { bullets: 96, particles: 420, rings: 24, ghosts: 16, popups: 18, teles: 12 },

  audio: {
    master: 0.5,
    shoot: { type: 'square',   f0: 840, fMul: 0.72, dur: 0.07, vol: 0.075 },
    kill:  { noise: { dur: 0.26, vol: 0.34, lp0: 3200, lp1: 160 },
             tone: { type: 'triangle', f0: 210, f1: 42, dur: 0.30, vol: 0.22 } },
    hurt:  { tone: { type: 'sawtooth', f0: 150, f1: 46, dur: 0.22, vol: 0.38 },
             noise: { dur: 0.12, vol: 0.18, lp0: 700, lp1: 180 } },
  },
};
const W = CFG.world.w, H = CFG.world.h;
const COL = CFG.colors;

/* ===== 01 CORE — boot, renderer, layers ===== */
const app = new PIXI.Application();
await app.init({
  width: window.innerWidth, height: window.innerHeight,
  background: COL.bar, antialias: true,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  autoDensity: true, powerPreference: 'high-performance',
});
document.body.appendChild(app.canvas);

// Best-effort font load (don't block forever if offline)
try {
  await Promise.race([
    Promise.all([
      document.fonts.load('900 72px Orbitron'),
      document.fonts.load('700 20px Orbitron'),
      document.fonts.load('500 16px Orbitron'),
    ]),
    new Promise(r => setTimeout(r, 1800)),
  ]);
} catch (e) { /* fallback font is fine */ }

// AdvancedBloomFilter — the whole aesthetic. Graceful fallback if CDN filter pack fails.
const FXNS = (PIXI.filters && PIXI.filters.AdvancedBloomFilter) ? PIXI.filters : PIXI;
const AdvancedBloomFilter = FXNS.AdvancedBloomFilter;

// Layer tree:
// stage
// ├ worldRoot (letterbox transform + shake) └ glow [bloom] └ crisp (HUD, no bloom)
// ├ overlayRoot (letterbox transform, no shake)
// └ flashRect (fullscreen damage flash)
const worldRoot = new PIXI.Container();
const overlayRoot = new PIXI.Container();
const glow = new PIXI.Container();
const crisp = new PIXI.Container();
if (AdvancedBloomFilter) {
  glow.filters = [new AdvancedBloomFilter(CFG.bloom)];
} else {
  console.warn('[NeonVoid] pixi-filters not found — running on layered-stroke glow only.');
}
worldRoot.addChild(glow, crisp);
app.stage.addChild(worldRoot, overlayRoot);

// Arena floor (slightly lighter than the letterbox bars so the play space reads instantly)
const floor = new PIXI.Graphics()
  .rect(0, 0, W, H)
  .fill({ color: COL.bg, alpha: 1 });
glow.addChild(floor);

const fxL      = new PIXI.Container();  // particles, rings, ghosts
const droneL   = new PIXI.Container();
const bulletL  = new PIXI.Container();
const popupL   = new PIXI.Container();
glow.addChild(fxL, droneL, bulletL, popupL);

const flashRect = new PIXI.Graphics()
  .rect(0, 0, window.innerWidth, window.innerHeight)
  .fill({ color: 0xffffff, alpha: 1 });
flashRect.alpha = 0;
app.stage.addChild(flashRect);

// Global "feel" state
const S = {
  mode: 'boot',           // boot | title | playing | dying | over | paused
  time: 0,
  score: 0, best: 0, bestBeaten: false, kills: 0,
  wave: 0,
  timescale: 1, hitstop: 0,
  trauma: 0, shakeX: 0, shakeY: 0,
  gridPulse: 0, flashA: 0,
  dyingT: 0,
};
try { S.best = parseInt(localStorage.getItem('neonvoid_best') || '0', 10) || 0; } catch (e) {}

function resize () {
  const vw = window.innerWidth, vh = window.innerHeight;
  app.renderer.resize(vw, vh);
  const s = Math.min(vw / W, vh / H);
  scaleS = s; offX = (vw - W * s) / 2; offY = (vh - H * s) / 2;
  viewW = vw; viewH = vh;
  worldRoot.position.set(offX, offY);   worldRoot.scale.set(s);
  overlayRoot.position.set(offX, offY); overlayRoot.scale.set(s);
  flashRect.clear().rect(0, 0, vw, vh).fill({ color: 0xffffff, alpha: 1 });
  flashRect.alpha = S.flashA;
}
let scaleS = 1, offX = 0, offY = 0, viewW = 0, viewH = 0;
window.addEventListener('resize', resize);

/* ===== 02 FX — grid, border, shake, hit-stop, flashes ===== */

// Background grid — drawn ONCE, pulsing via container alpha (zero per-frame cost)
const gridG = new PIXI.Graphics();
for (let x = 64; x < W; x += 64) {
  const major = (x / 64) % 4 === 0;
  gridG.moveTo(x, 0).lineTo(x, H).stroke({ width: 1, color: COL.grid, alpha: major ? 0.15 : 0.08 });
}
for (let y = 64; y < H; y += 64) {
  const major = (y / 64) % 4 === 0;
  gridG.moveTo(0, y).lineTo(W, y).stroke({ width: 1, color: COL.grid, alpha: major ? 0.15 : 0.08 });
}
const gridC = new PIXI.Container();
gridC.addChild(gridG);
glow.addChildAt(gridC, 1); // above floor, below everything else

// Arena border — glowing purple rectangle + Tron corner brackets
const borderG = new PIXI.Graphics();
borderG.rect(4, 4, W - 8, H - 8).stroke({ width: 6, color: COL.border, alpha: 0.14 });
borderG.rect(4, 4, W - 8, H - 8).stroke({ width: 2, color: COL.border, alpha: 0.75 });
const CL = 34; // corner bracket length
[[6, 6, 1, 1], [W - 6, 6, -1, 1], [6, H - 6, 1, -1], [W - 6, H - 6, -1, -1]].forEach(([cx, cy, dx, dy]) => {
  borderG.moveTo(cx, cy + dy * CL).lineTo(cx, cy).lineTo(cx + dx * CL, cy)
    .stroke({ width: 3.5, color: 0xd8b4ff, alpha: 0.9 });
});
const borderC = new PIXI.Container();
borderC.addChild(borderG);
glow.addChild(borderC);

function fxUpdate (dt, rawDt) {
  // grid breathes + flashes brighter on kills
  gridC.alpha = clamp(0.72 + 0.28 * Math.sin(S.time * 0.8) + S.gridPulse, 0, 1.6);
  S.gridPulse = Math.max(0, S.gridPulse - CFG.feel.gridPulseDecay * rawDt);
  borderC.alpha = 0.78 + 0.22 * Math.sin(S.time * 2.1);

  // trauma → shake (decays in real time so shake survives hit-stop)
  S.trauma = Math.max(0, S.trauma - CFG.feel.traumaDecay * rawDt);
  const mag = S.trauma * S.trauma * CFG.feel.shakeMax;
  S.shakeX = (Math.random() * 2 - 1) * mag;
  S.shakeY = (Math.random() * 2 - 1) * mag * 0.85;
  worldRoot.position.set(offX + S.shakeX, offY + S.shakeY);
  worldRoot.rotation = ((Math.random() * 2 - 1) * mag) * 0.0012;

  // fullscreen damage flash
  S.flashA = Math.max(0, S.flashA - 3.5 * rawDt);
  flashRect.alpha = S.flashA;
}
function addTrauma (v) { S.trauma = clamp(S.trauma + v, 0, 1); }
function hitstop (t)   { S.hitstop = Math.max(S.hitstop, t); }

// Mouse reticle — drawn vector crosshair, additive, gentle pulse
const reticle = new PIXI.Graphics();
reticle.circle(0, 0, 10).stroke({ width: 1.5, color: COL.player, alpha: 0.85 });
reticle.circle(0, 0, 1.8).fill({ color: COL.core, alpha: 1 });
for (let i = 0; i < 4; i++) {
  const a = i * Math.PI / 2;
  reticle.moveTo(Math.cos(a) * 13, Math.sin(a) * 13)
    .lineTo(Math.cos(a) * 19, Math.sin(a) * 19)
    .stroke({ width: 1.5, color: COL.player, alpha: 0.7 });
}
reticle.blendMode = 'add';
glow.addChild(reticle);

/* ===== 03 POOLS — baked textures + particles/rings/ghosts/popups ===== */

// "Zero asset files" ≠ zero GPU textures: we draw vectors once and bake them.
function bake (draw, res = 2) {
  const g = new PIXI.Graphics();
  draw(g);
  const tx = app.renderer.generateTexture({ target: g, resolution: res, antialias: true });
  g.destroy();
  return tx;
}
function neonPoly (g, pts, fillColor, glowColor, coreColor, hw, mw, cw, fa) {
  g.poly(pts).fill({ color: fillColor, alpha: 1 });
  g.poly(pts).stroke({ width: hw, color: glowColor, alpha: 0.20, join: 'round' });
  g.poly(pts).stroke({ width: mw, color: glowColor, alpha: 0.85, join: 'round' });
  g.poly(pts).stroke({ width: cw, color: coreColor, alpha: fa, join: 'round' });
}
const SHIP_PTS = [19, 0, -13, -12, -6, 0, -13, 12];         // cyan arrow
const DRONE_PTS = [15, 0, 0, 11, -15, 0, 0, -11];           // red diamond

const TEX = {};
function bakeTextures () {
  TEX.ship = bake(g => neonPoly(g, SHIP_PTS, 0x07222c, COL.player, COL.core, 9, 3.5, 1.6, 0.95));
  TEX.shipW = bake(g => neonPoly(g, SHIP_PTS, 0xffffff, 0xffffff, 0xffffff, 7, 3, 1.5, 1));
  TEX.drone = bake(g => neonPoly(g, DRONE_PTS, 0x2a040c, COL.drone, COL.droneHi, 8, 3, 1.4, 0.9));
  TEX.droneW = bake(g => neonPoly(g, DRONE_PTS, 0xffffff, 0xffffff, 0xffffff, 6, 3, 1.4, 1));
  TEX.bullet = bake(g => {
    g.roundRect(-7, -1.8, 14, 3.6, 1.8).fill({ color: 0x063040, alpha: 1 });
    g.roundRect(-7, -1.8, 14, 3.6, 1.8).stroke({ width: 3.5, color: COL.player, alpha: 0.28 });
    g.roundRect(-7, -1.8, 14, 3.6, 1.8).stroke({ width: 1.6, color: COL.player, alpha: 0.9 });
    g.roundRect(-5, -0.9, 10, 1.8, 0.9).fill({ color: COL.core, alpha: 1 });
  });
  TEX.dot = bake(g => {   // soft round particle (tint per use)
    g.circle(0, 0, 8).fill({ color: 0xffffff, alpha: 0.22 });
    g.circle(0, 0, 5.5).fill({ color: 0xffffff, alpha: 0.5 });
    g.circle(0, 0, 3).fill({ color: 0xffffff, alpha: 1 });
  });
  TEX.spark = bake(g => { // diamond shard
    g.poly([0, -7, 2.6, 0, 0, 7, -2.6, 0]).fill({ color: 0xffffff, alpha: 1 });
  });
  TEX.ring = bake(g => {  // shockwave ring (tint per use)
    g.circle(0, 0, 24).stroke({ width: 5, color: 0xffffff, alpha: 0.35 });
    g.circle(0, 0, 24).stroke({ width: 2, color: 0xffffff, alpha: 1 });
  });
}
bakeTextures(); // must run before pool factories below reference TEX.*

// Generic fixed-size pool. Objects get .active/.visible toggles.
function makePool (n, factory, layer) {
  const items = [];
  for (let i = 0; i < n; i++) {
    const o = factory();
    o.active = false; o.visible = false;
    layer.addChild(o);
    items.push(o);
  }
  return {
    items,
    get () {
      for (const o of items) if (!o.active) { o.active = true; o.visible = true; return o; }
      return null;
    },
    release (o) { o.active = false; o.visible = false; },
    releaseAll () { for (const o of items) { o.active = false; o.visible = false; } },
    countActive () { let c = 0; for (const o of items) if (o.active) c++; return c; },
  };
}
function spriteOf (tex) { const s = new PIXI.Sprite(tex); s.anchor.set(0.5); s.blendMode = 'add'; return s; }

// --- particles: sparks (diamonds) + embers (soft dots) + trails ---
const partPool = makePool(CFG.pools.particles, () => spriteOf(TEX.dot), fxL);
function emit (o) {
  const p = partPool.get();
  if (!p) return;
  p.texture = o.tex || TEX.dot;
  p.tint = o.tint ?? 0xffffff;
  p.x = o.x; p.y = o.y;
  p.vx = o.vx || 0; p.vy = o.vy || 0;
  p.life = p.maxLife = o.life || 0.5;
  p.size0 = o.size || 1; p.grow = o.grow || 0;
  p.drag = o.drag ?? 2.5;
  p.alpha0 = o.alpha ?? 1;
  p.alpha = p.alpha0;
  p.rotation = o.rot || 0;
  p.scale.set(o.size || 1);
}
function burstKill (x, y) {
  // sparks — hot mix of red / white / amber
  for (let i = 0; i < 14; i++) {
    const a = rand(TAU), sp = rand(110, 430);
    emit({
      tex: TEX.spark, tint: Math.random() < 0.45 ? COL.droneHi : (Math.random() < 0.5 ? COL.drone : 0xffb46e),
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(0.28, 0.62), size: rand(0.5, 1.05), drag: 3.2, rot: rand(TAU),
    });
  }
  // slow embers
  for (let i = 0; i < 4; i++) {
    const a = rand(TAU), sp = rand(20, 90);
    emit({
      tex: TEX.dot, tint: COL.drone, x, y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(0.45, 0.8), size: rand(0.9, 1.5), grow: 1.4, drag: 1.6, alpha: 0.55,
    });
  }
}
function puff (x, y, n, tint, spread = 90) {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), sp = rand(30, spread);
    emit({ tex: TEX.dot, tint, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.2, 0.4), size: rand(0.5, 0.9), drag: 4 });
  }
}
function updateParticles (dt) {
  for (const p of partPool.items) {
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) { partPool.release(p); continue; }
    const k = Math.exp(-p.drag * dt);
    p.vx *= k; p.vy *= k;
    p.x += p.vx * dt; p.y += p.vy * dt;
    const t = p.life / p.maxLife;
    p.alpha = p.alpha0 * Math.min(1, t * 1.6);
    const sc = p.size0 * (p.grow ? 1 + (1 - t) * p.grow : (0.4 + 0.6 * t));
    p.scale.set(sc);
  }
}

// --- shockwave rings ---
const ringPool = makePool(CFG.pools.rings, () => spriteOf(TEX.ring), fxL);
function ring (x, y, tint, maxScale = 2.1, dur = 0.28) {
  const r = ringPool.get();
  if (!r) return;
  r.texture = TEX.ring; r.tint = tint;
  r.x = x; r.y = y; r.t = 0; r.dur = dur; r.maxScale = maxScale;
  r.scale.set(0.3); r.alpha = 0.9;
}
function updateRings (dt) {
  for (const r of ringPool.items) {
    if (!r.active) continue;
    r.t += dt;
    const k = r.t / r.dur;
    if (k >= 1) { ringPool.release(r); continue; }
    r.scale.set(lerp(0.3, r.maxScale, 1 - Math.pow(1 - k, 2)));
    r.alpha = 0.9 * (1 - k);
  }
}

// --- white ghost flashes (enemy silhouette pop) ---
const ghostPool = makePool(CFG.pools.ghosts, () => spriteOf(TEX.droneW), fxL);
function ghost (x, y, tex, scale = 1) {
  const g = ghostPool.get();
  if (!g) return;
  g.texture = tex; g.x = x; g.y = y;
  g.t = 0; g.dur = 0.16; g.scale0 = scale;
  g.scale.set(scale); g.alpha = 1; g.rotation = 0;
}
function updateGhosts (dt) {
  for (const g of ghostPool.items) {
    if (!g.active) continue;
    g.t += dt;
    const k = g.t / g.dur;
    if (k >= 1) { ghostPool.release(g); continue; }
    g.scale.set(g.scale0 * (1 + k * 0.7));
    g.alpha = 1 - k;
  }
}

// --- floating score popups ---
const popupPool = makePool(CFG.pools.popups, () => {
  const t = new PIXI.Text({
    text: '', style: {
      fontFamily: 'Orbitron, Arial', fontSize: 17, fontWeight: '700',
      fill: COL.text, letterSpacing: 1,
    },
  });
  t.anchor.set(0.5);
  return t;
}, popupL);
function popup (x, y, str, color = COL.text, size = 17) {
  const p = popupPool.get();
  if (!p) return;
  p.text = str;
  p.style.fill = color; p.style.fontSize = size;
  p.x = x + rand(-6, 6); p.y = y - 10;
  p.t = 0; p.dur = 0.75; p.vx = rand(-14, 14);
  p.scale.set(1.35); p.alpha = 1;
}
function updatePopups (dt) {
  for (const p of popupPool.items) {
    if (!p.active) continue;
    p.t += dt;
    const k = p.t / p.dur;
    if (k >= 1) { popupPool.release(p); continue; }
    p.y -= 52 * dt * (1 - k * 0.5);
    p.x += p.vx * dt;
    p.scale.set(lerp(1, 1.35, Math.max(0, 1 - k * 4)) );
    p.alpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
  }
}

/* ===== 04 PLAYER ===== */
const PC = CFG.player;
const player = {
  x: W / 2, y: H / 2, vx: 0, vy: 0,
  angle: -Math.PI / 2,       // facing (lerped toward mouse)
  hp: PC.hp, iframes: 0, fireCd: 0,
  alive: true, thrust: 0, trailAcc: 0,
  squashX: 0, squashY: 0,    // wall-bounce squash timers
  flashT: 0,
};
const playerSpr = new PIXI.Sprite(TEX.ship);
playerSpr.anchor.set(0.5);
glow.addChild(playerSpr);

function playerReset () {
  player.x = W / 2; player.y = H / 2;
  player.vx = player.vy = 0;
  player.angle = -Math.PI / 2;
  player.hp = PC.hp; player.iframes = 0; player.fireCd = 0;
  player.alive = true; player.flashT = 0;
  playerSpr.visible = true;
}

function playerUpdate (dt) {
  if (!player.alive) return;
  const P = player;

  // thrust in world space (WASD), inertia + drag
  let ax = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0);
  let ay = (K.KeyS || K.ArrowDown ? 1 : 0) - (K.KeyW || K.ArrowUp ? 1 : 0);
  const mag = Math.hypot(ax, ay);
  P.thrust = mag > 0 ? 1 : 0;
  if (mag > 0) { ax /= mag; ay /= mag; }
  P.vx += ax * PC.accel * dt;
  P.vy += ay * PC.accel * dt;
  const k = Math.exp(-PC.drag * dt);
  P.vx *= k; P.vy *= k;
  const sp = Math.hypot(P.vx, P.vy);
  if (sp > PC.maxSpeed) { P.vx *= PC.maxSpeed / sp; P.vy *= PC.maxSpeed / sp; }
  P.x += P.vx * dt; P.y += P.vy * dt;

  // soft walls — bounce + squash so the box feels physical
  const b = CFG.world.bound + PC.radius;
  let bounced = 0;
  if (P.x < b)     { P.x = b;     if (P.vx < 0) { P.vx *= -PC.wallBounce; bounced = 1; P.squashX = 0.16; } }
  if (P.x > W - b) { P.x = W - b; if (P.vx > 0) { P.vx *= -PC.wallBounce; bounced = 1; P.squashX = 0.16; } }
  if (P.y < b)     { P.y = b;     if (P.vy < 0) { P.vy *= -PC.wallBounce; bounced = 1; P.squashY = 0.16; } }
  if (P.y > H - b) { P.y = H - b; if (P.vy > 0) { P.vy *= -PC.wallBounce; bounced = 1; P.squashY = 0.16; } }
  if (bounced) { addTrauma(CFG.feel.traumaWall); puff(P.x, P.y, 4, 0x9d5cff, 70); }

  // face the cursor (smoothed so aim stays readable)
  const ta = Math.atan2(M.y - P.y, M.x - P.x);
  P.angle = lerpAngle(P.angle, ta, damp(PC.turnLerp, dt));

  // pink engine trail — rate scales with thrust and speed
  P.trailAcc += P.thrust * (0.35 + 0.65 * sp / PC.maxSpeed) * PC.trailRate * dt;
  while (P.trailAcc >= 1) {
    P.trailAcc -= 1;
    const back = P.angle + Math.PI;
    emit({
      tex: TEX.dot, tint: COL.trail,
      x: P.x + Math.cos(back) * 14 + rand(-3, 3),
      y: P.y + Math.sin(back) * 14 + rand(-3, 3),
      vx: Math.cos(back) * rand(30, 90) + P.vx * 0.25,
      vy: Math.sin(back) * rand(30, 90) + P.vy * 0.25,
      life: rand(0.22, 0.42), size: rand(0.45, 0.85), drag: 3.5,
    });
  }

  // fire
  P.fireCd -= dt;
  if (M.down && P.fireCd <= 0) {
    P.fireCd = 1 / PC.fireRate;
    fireBullet();
  }

  // i-frame blink
  P.iframes = Math.max(0, P.iframes - dt);
  P.flashT = Math.max(0, P.flashT - dt);

  // sprite transform (thrust stretch + squash)
  P.squashX = Math.max(0, P.squashX - dt * 1.4);
  P.squashY = Math.max(0, P.squashY - dt * 1.4);
  playerSpr.texture = P.flashT > 0 ? TEX.shipW : TEX.ship;
  playerSpr.position.set(P.x, P.y);
  playerSpr.rotation = P.angle;
  playerSpr.scale.set((1 + P.thrust * 0.10) * (1 - P.squashX * 1.6), (1 - P.thrust * 0.06) * (1 - P.squashY * 1.6));
  playerSpr.alpha = P.iframes > 0 ? (Math.sin(S.time * 42) > 0 ? 1 : 0.25) : 1;
}

function playerHit (dx, dy) {
  const P = player;
  P.hp -= 1;
  P.iframes = PC.iframes;
  S.flashA = CFG.feel.hurtFlash;
  addTrauma(CFG.feel.traumaHurt);
  hitstop(CFG.feel.hitstopHurt);
  // knockback away from the drone
  const d = Math.hypot(dx, dy) || 1;
  P.vx += (dx / d) * 220; P.vy += (dy / d) * 220;
  puff(P.x, P.y, 10, COL.player, 160);
  A.hurt();
  hudHP();
  if (P.hp <= 0) playerDie();
}

function playerDie () {
  const P = player;
  P.alive = false;
  playerSpr.visible = false;
  M.down = false;
  // big cyan/pink detonation
  for (let i = 0; i < 26; i++) {
    const a = rand(TAU), sp = rand(120, 520);
    emit({ tex: TEX.spark, tint: Math.random() < 0.5 ? COL.player : COL.trail, x: P.x, y: P.y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.4, 0.9), size: rand(0.6, 1.2), drag: 2.4, rot: rand(TAU) });
  }
  for (let i = 0; i < 6; i++) {
    const a = rand(TAU), sp = rand(20, 110);
    emit({ tex: TEX.dot, tint: COL.player, x: P.x, y: P.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(0.6, 1.1), size: rand(1.2, 2), grow: 1.6, drag: 1.4, alpha: 0.6 });
  }
  ring(P.x, P.y, COL.player, 3.2, 0.45);
  ring(P.x, P.y, COL.trail, 2.2, 0.6);
  addTrauma(1);
  hitstop(0.09);
  S.flashA = 0.32;
  A.kill();
  S.mode = 'dying';
  S.dyingT = CFG.feel.dyingTime;
  S.timescale = CFG.feel.dyingSlowmo;
}

/* ===== 05 BULLETS ===== */
const bulletPool = makePool(CFG.pools.bullets, () => spriteOf(TEX.bullet), bulletL);

function fireBullet () {
  const P = player;
  const b = bulletPool.get();
  if (!b) return;
  const a = P.angle + rand(-PC.bulletSpread, PC.bulletSpread);
  b.x = P.x + Math.cos(P.angle) * 18;
  b.y = P.y + Math.sin(P.angle) * 18;
  b.vx = Math.cos(a) * PC.bulletSpeed;
  b.vy = Math.sin(a) * PC.bulletSpeed;
  b.life = PC.bulletLife;
  b.rotation = a;
  b.scale.set(rand(0.9, 1.1));
  // muzzle flash
  emit({ tex: TEX.dot, tint: COL.core, x: b.x, y: b.y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 0.07, size: 0.9, drag: 2 });
  A.shoot();
}

function updateBullets (dt) {
  for (const b of bulletPool.items) {
    if (!b.active) continue;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
      bulletPool.release(b); continue;
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
  }
}

/* ===== 06 ENEMIES — red drones ===== */
const DC = CFG.drone;
const dronePool = makePool(40, () => spriteOf(TEX.drone), droneL);
const telePool = makePool(CFG.pools.teles, () => spriteOf(TEX.ring), fxL); // spawn telegraphs

function droneSpeedFor (wave) {
  return DC.baseSpeed * Math.min(DC.speedCap, 1 + (wave - 1) * DC.speedRamp);
}

function spawnPoint () {
  const I = CFG.world.spawnInset, depth = 90;
  for (let tries = 0; tries < 14; tries++) {
    let x, y;
    const edge = (Math.random() * 4) | 0;
    if (edge === 0)      { x = rand(I, W - I); y = I + rand(depth); }
    else if (edge === 1) { x = rand(I, W - I); y = H - I - rand(depth); }
    else if (edge === 2) { x = I + rand(depth);        y = rand(I, H - I); }
    else                 { x = W - I - rand(depth);    y = rand(I, H - I); }
    if (Math.hypot(x - player.x, y - player.y) >= CFG.waves.minPlayerDist) return { x, y };
  }
  return { x: I + rand(40), y: I + rand(40) };
}

function telegraphSpawn () {
  const t = telePool.get();
  if (!t) return false;
  const p = spawnPoint();
  t.texture = TEX.ring; t.tint = COL.drone;
  t.x = p.x; t.y = p.y;
  t.t = CFG.waves.telegraph; t.dur = CFG.waves.telegraph;
  t.x0 = p.x; t.y0 = p.y;
  t.alpha = 0.9; t.scale.set(1.1);
  return true;
}

function updateTeles (dt) {
  for (const t of telePool.items) {
    if (!t.active) continue;
    t.t -= dt;
    const k = clamp(t.t / t.dur, 0, 1);
    t.scale.set(lerp(0.28, 1.1, k));
    t.alpha = 0.35 + 0.65 * (1 - k) + 0.25 * Math.sin(S.time * 24);
    if (t.t <= 0) {
      telePool.release(t);
      spawnDrone(t.x0, t.y0);
    }
  }
}

function spawnDrone (x, y) {
  const d = dronePool.get();
  if (!d) return;
  d.x = x; d.y = y;
  d.vx = 0; d.vy = 0;
  d.hp = DC.hp;
  d.phase = rand(TAU);
  d.rotA = rand(TAU);
  d.flashT = 0;
  d.scale.set(0.1);
  d.spawnK = 0;   // pop-in animation
  puff(x, y, 6, COL.drone, 120);
  ring(x, y, COL.drone, 1.1, 0.3);
}

function droneMaxSpeed (d) { return droneSpeedFor(Math.max(1, S.wave)); }

function updateDrones (dt) {
  const chasing = player.alive && (S.mode === 'playing');
  const actives = [];
  for (const d of dronePool.items) if (d.active) actives.push(d);

  for (const d of actives) {
    d.rotA += DC.spin * dt;
    d.flashT = Math.max(0, d.flashT - dt);
    d.spawnK = Math.min(1, d.spawnK + dt * 4.5);

    if (chasing) {
      // steer toward player with a sinusoidal weave so groups don't look robotic
      const dx = player.x - d.x, dy = player.y - d.y;
      const dist = Math.hypot(dx, dy) || 1;
      const wob = Math.sin(S.time * DC.weaveFreq + d.phase) * DC.weaveAmp;
      const ang = Math.atan2(dy, dx) + wob;
      const ms = droneMaxSpeed(d);
      const dvx = Math.cos(ang) * ms - d.vx;
      const dvy = Math.sin(ang) * ms - d.vy;
      const dl = Math.hypot(dvx, dvy) || 1;
      const st = Math.min(DC.accel * dt, dl);
      d.vx += (dvx / dl) * st; d.vy += (dvy / dl) * st;

      // separation — keeps the swarm readable instead of one blob
      for (const o of actives) {
        if (o === d) continue;
        const sx = d.x - o.x, sy = d.y - o.y;
        const sd = Math.hypot(sx, sy);
        if (sd > 0.01 && sd < DC.sepDist) {
          d.vx += (sx / sd) * DC.sepForce * dt;
          d.vy += (sy / sd) * DC.sepForce * dt;
        }
      }
    } else {
      d.vx *= Math.exp(-0.8 * dt); d.vy *= Math.exp(-0.8 * dt);
    }

    d.x += d.vx * dt; d.y += d.vy * dt;

    // soft walls
    const m = CFG.world.bound + 8;
    if (d.x < m)     { d.x = m;     if (d.vx < 0) d.vx *= -0.5; }
    if (d.x > W - m) { d.x = W - m; if (d.vx > 0) d.vx *= -0.5; }
    if (d.y < m)     { d.y = m;     if (d.vy < 0) d.vy *= -0.5; }
    if (d.y > H - m) { d.y = H - m; if (d.vy > 0) d.vy *= -0.5; }

    // visuals
    d.texture = d.flashT > 0 ? TEX.droneW : TEX.drone;
    d.rotation = d.rotA;
    const pulse = 1 + Math.sin(S.time * DC.pulseRate + d.phase) * DC.pulseAmp;
    const popIn = 1 - Math.pow(1 - d.spawnK, 3); // ease-out back-ish
    d.scale.set(popIn * pulse * (d.spawnK < 1 ? 1.15 : 1));
  }

  // contact damage
  if (chasing && player.iframes <= 0) {
    for (const d of actives) {
      const rr = PC.radius + DC.radius;
      if (Math.abs(d.x - player.x) < rr && Math.abs(d.y - player.y) < rr) {
        const dist = Math.hypot(d.x - player.x, d.y - player.y);
        if (dist < rr) {
          killDrone(d, false);          // the kamikaze drone pops too — no score
          playerHit(player.x - d.x, player.y - d.y);
          break;
        }
      }
    }
  }
}

/* ===== 07 COLLISIONS — bullets vs drones ===== */
function collideBullets () {
  for (const b of bulletPool.items) {
    if (!b.active) continue;
    for (const d of dronePool.items) {
      if (!d.active) continue;
      const rr = PC.bulletRadius + DC.radius;
      if (Math.abs(b.x - d.x) < rr && Math.abs(b.y - d.y) < rr) {
        if (Math.hypot(b.x - d.x, b.y - d.y) < rr) {
          bulletPool.release(b);
          hitDrone(d, b.vx, b.vy);
          break;
        }
      }
    }
  }
}

function hitDrone (d, bvx, bvy) {
  d.hp -= 1;
  if (d.hp > 0) {
    d.flashT = 0.07;
    const bl = Math.hypot(bvx, bvy) || 1;
    d.vx += (bvx / bl) * 190; d.vy += (bvy / bl) * 190;
    puff(d.x, d.y, 3, COL.droneHi, 110);
    return;
  }
  killDrone(d, true);
}

function killDrone (d, giveScore) {
  const x = d.x, y = d.y;
  dronePool.release(d);
  burstKill(x, y);
  ring(x, y, COL.drone, 1.9, 0.3);
  ghost(x, y, TEX.droneW, 1);
  addTrauma(CFG.feel.traumaKill);
  hitstop(CFG.feel.hitstopKill);
  S.gridPulse += CFG.feel.gridPulseKill;
  A.kill();
  if (giveScore) {
    S.score += DC.score;
    S.kills += 1;
    popup(x, y, '+' + DC.score, COL.core);
    hudScore();
    checkNewBest();
  }
}

/* ===== 08 WAVES — budget spawner with breathers ===== */
const Wv = { n: 0, toSpawn: 0, spawnCd: 0, phase: 'idle', breatherT: 0 };
// phase: idle (title) | spawning | breather

function startWave (n) {
  Wv.n = n; S.wave = n;
  Wv.toSpawn = CFG.waves.quota(n);
  Wv.spawnCd = 0.6;
  Wv.phase = 'spawning';
  banner('WAVE ' + n, COL.text, 40, 1.5);
  hudWave();
}

function wavesUpdate (dt) {
  if (S.mode !== 'playing') return;
  if (Wv.phase === 'spawning') {
    if (Wv.toSpawn > 0) {
      Wv.spawnCd -= dt;
      const cap = Math.min(DC.maxActive, 8 + Wv.n * 2);
      if (Wv.spawnCd <= 0 && dronePool.countActive() + telePool.countActive() < cap) {
        if (telegraphSpawn()) {
          Wv.toSpawn -= 1;
          Wv.spawnCd = CFG.waves.spawnInterval(Wv.n) * rand(0.75, 1.25);
        }
      }
    } else if (dronePool.countActive() === 0 && telePool.countActive() === 0) {
      Wv.phase = 'breather';
      Wv.breatherT = CFG.waves.breather;
      popup(W / 2, H / 2 - 60, 'WAVE CLEAR', COL.player, 22);
    }
  } else if (Wv.phase === 'breather') {
    Wv.breatherT -= dt;
    if (Wv.breatherT <= 0) startWave(Wv.n + 1);
  }
}

/* ===== 09 SCORING + HUD (crisp layer, outside bloom) ===== */
function pad (n, l) { return String(Math.max(0, n | 0)).padStart(l, '0'); }
function mkText (str, size, weight, color, ls = 0, align = 'center') {
  return new PIXI.Text({
    text: str,
    style: {
      fontFamily: 'Orbitron, Arial', fontSize: size, fontWeight: String(weight),
      fill: color, letterSpacing: ls, align,
    },
  });
}

const scoreT = mkText('SCORE 000000', 20, 700, COL.text, 2, 'left');
scoreT.anchor.set(0, 0); scoreT.position.set(22, 16);
const bestT = mkText('BEST 000000', 12, 500, COL.textDim, 2, 'left');
bestT.anchor.set(0, 0); bestT.position.set(22, 44);
const waveT = mkText('WAVE 1', 15, 700, '#b98cff', 4);
waveT.anchor.set(0.5, 0); waveT.position.set(W / 2, 18);
const hpPips = [];
for (let i = 0; i < PC.hp; i++) {
  const p = new PIXI.Sprite(TEX.ship);
  p.anchor.set(0.5); p.scale.set(0.62);
  p.position.set(W - 30 - i * 34, 30);
  p.rotation = Math.PI / 2;
  crisp.addChild(p); hpPips.push(p);
}
crisp.addChild(scoreT, bestT, waveT);

function hudScore () {
  scoreT.text = 'SCORE ' + pad(S.score, 6);
  bestT.text = 'BEST ' + pad(S.bestBeaten ? S.score : S.best, 6);
}
function hudWave () { waveT.text = 'WAVE ' + Math.max(1, S.wave); }
function hudHP () { for (let i = 0; i < hpPips.length; i++) hpPips[i].alpha = i < player.hp ? 1 : 0.13; }

function checkNewBest () {
  if (!S.bestBeaten && S.best > 0 && S.score > S.best) {
    S.bestBeaten = true;
    popup(W / 2, 90, 'NEW BEST!', COL.player, 24);
    bestT.text = 'BEST ' + pad(S.score, 6);
    addTrauma(0.2);
  }
}

// Wave banner (single pooled text, animated in the loop)
const bannerT = mkText('', 40, 900, COL.text, 8);
bannerT.anchor.set(0.5); bannerT.position.set(W / 2, H * 0.4);
bannerT.visible = false;
crisp.addChild(bannerT);
const bannerSt = { t: 0, dur: 0 };
function banner (txt, color, size, dur) {
  bannerT.text = txt; bannerT.style.fill = color; bannerT.style.fontSize = size;
  bannerSt.t = 0; bannerSt.dur = dur;
  bannerT.visible = true; bannerT.alpha = 0; bannerT.scale.set(1.35);
}
function updateBanner (dt) {
  if (!bannerT.visible) return;
  bannerSt.t += dt;
  const k = bannerSt.t / bannerSt.dur;
  if (k >= 1) { bannerT.visible = false; return; }
  const inK = clamp(bannerSt.t / 0.18, 0, 1);
  const outK = clamp((bannerSt.dur - bannerSt.t) / 0.3, 0, 1);
  bannerT.alpha = Math.min(inK, outK);
  bannerT.scale.set(lerp(1.35, 1, inK));
}

/* ===== 10 OVERLAYS — title / game over / pause ===== */
const titleC = new PIXI.Container();
const overC = new PIXI.Container();
const pauseC = new PIXI.Container();
overlayRoot.addChild(titleC, overC, pauseC);
let promptT, overPromptT;

{
  const dim = new PIXI.Graphics().rect(0, 0, W, H).fill({ color: 0x05010a, alpha: 0.35 });
  titleC.addChild(dim);
  const tMag = mkText('NEON VOID', 76, 900, '#ff2ec4', 6);
  tMag.anchor.set(0.5); tMag.position.set(W / 2 + 4, H * 0.34 + 4); tMag.alpha = 0.85; tMag.blendMode = 'add';
  const tCyan = mkText('NEON VOID', 76, 900, '#2cf6ff', 6);
  tCyan.anchor.set(0.5); tCyan.position.set(W / 2, H * 0.34);
  const sub = mkText('TOP-DOWN NEON ARENA', 15, 500, COL.textDim, 7);
  sub.anchor.set(0.5); sub.position.set(W / 2, H * 0.34 + 60);
  promptT = mkText('CLICK TO START', 20, 700, COL.text, 3);
  promptT.anchor.set(0.5); promptT.position.set(W / 2, H * 0.55);
  const c1 = mkText('WASD — MOVE      MOUSE — AIM      HOLD LMB — FIRE', 13, 500, COL.textDim, 1);
  c1.anchor.set(0.5); c1.position.set(W / 2, H * 0.55 + 44);
  const c2 = mkText('P — PAUSE      M — MUTE      R — RETRY (ON GAME OVER)', 12, 500, COL.textDim, 1);
  c2.anchor.set(0.5); c2.position.set(W / 2, H * 0.55 + 68);
  titleC.addChild(tMag, tCyan, sub, promptT, c1, c2);
}
const overScore = mkText('', 26, 700, COL.text, 3);
const overBest = mkText('', 16, 500, COL.textDim, 2);
const overWave = mkText('', 14, 500, COL.textDim, 2);
{
  const dim = new PIXI.Graphics().rect(0, 0, W, H).fill({ color: 0x05010a, alpha: 0.62 });
  overC.addChild(dim);
  const goMag = mkText('GAME OVER', 58, 900, '#ff2b4e', 5);
  goMag.anchor.set(0.5); goMag.position.set(W / 2 + 3, H * 0.32 + 3); goMag.alpha = 0.8; goMag.blendMode = 'add';
  const goCyan = mkText('GAME OVER', 58, 900, '#2cf6ff', 5);
  goCyan.anchor.set(0.5); goCyan.position.set(W / 2, H * 0.32);
  overScore.anchor.set(0.5); overScore.position.set(W / 2, H * 0.48);
  overBest.anchor.set(0.5); overBest.position.set(W / 2, H * 0.48 + 38);
  overWave.anchor.set(0.5); overWave.position.set(W / 2, H * 0.48 + 62);
  overPromptT = mkText('PRESS R OR CLICK TO RETRY', 18, 700, COL.text, 3);
  overPromptT.anchor.set(0.5); overPromptT.position.set(W / 2, H * 0.62);
  overC.addChild(goMag, goCyan, overScore, overBest, overWave, overPromptT);
}
{
  const dim = new PIXI.Graphics().rect(0, 0, W, H).fill({ color: 0x05010a, alpha: 0.45 });
  pauseC.addChild(dim);
  const pt = mkText('PAUSED', 42, 900, '#2cf6ff', 8);
  pt.anchor.set(0.5); pt.position.set(W / 2, H * 0.42);
  const pp = mkText('CLICK OR P TO RESUME', 15, 500, COL.textDim, 3);
  pp.anchor.set(0.5); pp.position.set(W / 2, H * 0.42 + 48);
  pauseC.addChild(pt, pp);
}
function hideOverlays () { titleC.visible = overC.visible = pauseC.visible = false; }

function showTitle () {
  hideOverlays();
  titleC.visible = true;
  S.mode = 'title';
}
function toOver () {
  S.mode = 'over'; S.timescale = 1;
  const isBest = S.score > S.best && S.score > 0;
  if (isBest) {
    S.best = S.score;
    try { localStorage.setItem('neonvoid_best', String(S.best)); } catch (e) {}
  }
  overScore.text = 'SCORE ' + pad(S.score, 6);
  overBest.text = (S.bestBeaten ? '★ NEW BEST  ' : '') + 'BEST ' + pad(S.best, 6);
  overWave.text = 'REACHED WAVE ' + Math.max(1, S.wave);
  overC.visible = true;
}
function setPause (v) {
  if (v && S.mode === 'playing') { S.mode = 'paused'; pauseC.visible = true; }
  else if (!v && S.mode === 'paused') { S.mode = 'playing'; pauseC.visible = false; }
}

/* ===== 11 AUDIO — Web Audio synth, zero files ===== */
const A = (() => {
  let ctx = null, master = null, noiseBuf = null, muted = false;
  function init () {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = CFG.audio.master;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5 | 0, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function resume () { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function tone ({ type, f0, f1, dur, vol }) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function noise ({ dur, vol, lp0, lp1 }) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(Math.max(40, lp0), t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, lp1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.03);
  }
  return {
    init, resume,
    shoot () { const c = CFG.audio.shoot; tone({ type: c.type, f0: c.f0 * rand(0.94, 1.06), f1: c.f0 * c.fMul, dur: c.dur, vol: c.vol }); },
    kill ()  { const c = CFG.audio.kill; noise(c.noise); tone(c.tone); },
    hurt ()  { const c = CFG.audio.hurt; tone(c.tone); noise(c.noise); },
    toggleMute () { muted = !muted; if (master) master.gain.value = muted ? 0 : CFG.audio.master; return muted; },
  };
})();

/* ===== 12 INPUT ===== */
const K = {};
const M = { x: W / 2, y: H / 2 - 120, down: false };

function toWorld (e) {
  const r = app.canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left - offX) / scaleS,
    y: (e.clientY - r.top - offY) / scaleS,
  };
}
window.addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  K[e.code] = true;
  A.init(); A.resume();
  if (e.code === 'KeyM') {
    const m = A.toggleMute();
    popup(M.x, M.y - 20, m ? 'MUTED' : 'SOUND ON', COL.textDim, 13);
  } else if (S.mode === 'title' && (e.code === 'Space' || e.code === 'Enter')) startRun();
  else if (S.mode === 'over' && (e.code === 'KeyR' || e.code === 'Space' || e.code === 'Enter')) startRun();
  else if (e.code === 'KeyP' || e.code === 'Escape') {
    if (S.mode === 'playing') setPause(true);
    else if (S.mode === 'paused') setPause(false);
  }
});
window.addEventListener('keyup', e => { K[e.code] = false; });

app.canvas.addEventListener('pointermove', e => {
  const w = toWorld(e);
  M.x = w.x; M.y = w.y;
});
app.canvas.addEventListener('pointerdown', e => {
  A.init(); A.resume();
  const w = toWorld(e);
  M.x = w.x; M.y = w.y;
  if (S.mode === 'title' || S.mode === 'over') startRun();
  else if (S.mode === 'paused') setPause(false);
  else if (S.mode === 'playing') M.down = true;
});
window.addEventListener('pointerup', () => { M.down = false; });
window.addEventListener('pointercancel', () => { M.down = false; });
window.addEventListener('blur', () => { M.down = false; if (S.mode === 'playing') setPause(true); });
app.canvas.addEventListener('contextmenu', e => e.preventDefault());

/* ===== 13 RUN CONTROL + MAIN LOOP ===== */
function startRun () {
  hideOverlays();
  S.score = 0; S.kills = 0; S.bestBeaten = false; S.wave = 0;
  S.timescale = 1; S.hitstop = 0; S.trauma = 0; S.flashA = 0;
  S.gridPulse = 0; S.dyingT = 0;
  bulletPool.releaseAll(); partPool.releaseAll(); ringPool.releaseAll();
  ghostPool.releaseAll(); popupPool.releaseAll(); telePool.releaseAll();
  dronePool.releaseAll();
  playerReset();
  hudScore(); hudHP();
  Wv.phase = 'idle';
  S.mode = 'playing';
  startWave(1);
}

app.ticker.add(tk => {
  const rawDt = Math.min(tk.deltaMS, 34) / 1000;
  let dt;
  if (S.hitstop > 0) { S.hitstop -= rawDt; dt = 0; }
  else dt = rawDt * S.timescale;
  S.time += dt;

  fxUpdate(dt, rawDt);
  reticle.position.set(M.x, M.y);
  reticle.alpha = 0.7 + 0.3 * Math.sin(S.time * 6);
  reticle.rotation = S.time * 0.6;

  if (S.mode === 'playing') {
    playerUpdate(dt);
    updateBullets(dt);
    updateTeles(dt);
    updateDrones(dt);
    collideBullets();
    wavesUpdate(dt);
  } else if (S.mode === 'dying') {
    updateBullets(dt); updateTeles(dt); updateDrones(dt); collideBullets();
    S.dyingT -= rawDt;
    if (S.dyingT <= 0) toOver();
  } else if (S.mode === 'over') {
    updateBullets(dt); updateDrones(dt);
  }

  updateParticles(dt); updateRings(dt); updateGhosts(dt); updatePopups(dt);
  updateBanner(dt);

  if (titleC.visible) promptT.alpha = 0.55 + 0.45 * Math.sin(S.time * 4.2);
  if (overC.visible) overPromptT.alpha = 0.55 + 0.45 * Math.sin(S.time * 4.2);
});

// Dev hooks (?debug=1)
if (location.search.includes('debug')) {
  window.NV = { app, S, CFG, player, dronePool, bulletPool, spawnDrone, startRun, killAll: () => dronePool.releaseAll() };
}

resize();
hudScore(); hudHP(); hudWave();
showTitle();

})().catch(err => {
  console.error('[NeonVoid] boot failure:', err);
  const el = document.getElementById('boot-error');
  if (el) { el.style.display = 'flex'; el.innerHTML += '<br><small>' + (err && err.message ? err.message : err) + '</small>'; }
});
