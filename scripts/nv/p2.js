
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
