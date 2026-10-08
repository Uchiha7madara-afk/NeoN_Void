
/* ============================================================
   NEON VOID v1.0 — full build (single file)
   Bands map 1:1 to the future src/ split.
   All tuning lives in CFG. All shapes generated at runtime.
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
function lerpColor (c1, c2, t) {
  const r = ((c1 >> 16 & 255) + ((c2 >> 16 & 255) - (c1 >> 16 & 255)) * t) | 0;
  const g = ((c1 >> 8 & 255) + ((c2 >> 8 & 255) - (c1 >> 8 & 255)) * t) | 0;
  const b = ((c1 & 255) + ((c2 & 255) - (c1 & 255)) * t) | 0;
  return (r << 16 | g << 8 | b) & 0xffffff;
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
    drone:   0xff2b4e, droneHi: 0xffd9de,      // red
    hunter:  0xb44bff, hunterHi: 0xefd9ff,     // purple
    spinner: 0xffe14d, spinnerHi: 0xfff6c9,    // yellow
    tank:    0x3cff6e, tankHi: 0xd6ffe2,       // green
    coin:    0xffd23c, heart: 0xff4d6d, gunpk: 0x9dff3c,
    text:    '#eaf6ff',
    textDim: '#8f7fb8',
  },

  bloom: { threshold: 0.22, bloomScale: 0.85, brightness: 1.12, blur: 7 },

  // gun tiers 1..5 — single → twin → spread → lance → nova
  gunTiers: [
    { name: 'PULSE',  rate: 8.0, count: 1, spread: 0,     parallel: false, speed: 780,  dmg: 1, pierce: 0, life: 1.05, wave: 0,    tex: 'bullet' },
    { name: 'TWIN',   rate: 8.6, count: 2, spread: 0.05,  parallel: true,  speed: 800,  dmg: 1, pierce: 0, life: 1.05, wave: 0,    tex: 'bullet' },
    { name: 'SPREAD', rate: 7.2, count: 3, spread: 0.15,  parallel: false, speed: 760,  dmg: 1, pierce: 0, life: 0.9,  wave: 0,    tex: 'bullet' },
    { name: 'LANCE',  rate: 6.2, count: 1, spread: 0.006, parallel: false, speed: 1150, dmg: 3, pierce: 2, life: 0.85, wave: 0,    tex: 'lance'  },
    { name: 'NOVA',   rate: 5.6, count: 5, spread: 0.32,  parallel: false, speed: 820,  dmg: 1, pierce: 0, life: 1.0,  wave: 0.55, tex: 'bullet' },
  ],

  player: {
    accel: 2600, maxSpeed: 360, drag: 4.2,
    turnLerp: 18,
    radius: 9,            // hitbox — deliberately smaller than the sprite
    hp: 3, iframes: 1.5,
    bulletSpread: 0.014,
    wallBounce: 0.45,
  },

  drone: {
    radius: 13, hp: 1, hpPerTier: 0,
    baseSpeed: 62, speedRamp: 0.075, speedCap: 2.5,
    accel: 300,
    weaveFreq: 2.1, weaveAmp: 0.55,
    sepDist: 34, sepForce: 150,
    spin: 1.3, pulseAmp: 0.09, pulseRate: 3.2,
    score: 100,
  },
  hunter: {
    radius: 13, hp: 3, hpPerTier: 1,
    baseSpeed: 120, accel: 360, ring: 270, ringSlack: 70,
    score: 250, fireMin: 1.7, fireMax: 2.4, charge: 0.38,
    bulletSpeed: 250, predict: 0.7,
  },
  spinner: {
    radius: 16, hp: 6, hpPerTier: 2,
    baseSpeed: 46, accel: 130, spin: 2.6,
    score: 400, sprayEvery: 0.085, sprayDur: 1.25, coolDur: 1.5,
    sprayRot: 0.44, bulletSpeed: 168,
  },
  tank: {
    radius: 23, hp: 22, hpPerTier: 6,
    baseSpeed: 34, accel: 95,
    score: 600, fireCd: 3.3, ringCount: 8, ringSpeed: 150,
    knock: 1.9,
  },

  waves: {
    budget:        w => 3 + w * 1.9 + Math.pow(w, 1.18),
    spawnInterval: w => Math.max(0.38, 1.25 - w * 0.07),
    breather: 2.4, telegraph: 0.7, minPlayerDist: 190,
    unlock: { hunter: 3, spinner: 5, tank: 7 },
    cost:   { drone: 1, hunter: 3, spinner: 4, tank: 7 },
    weights:{ drone: 1.0, hunter: 0.6, spinner: 0.4, tank: 0.25 },
    tierEvery: 5, speedCap: 1.9, maxActive: 26,
    clearBonus: w => w * 50,
  },

  drops: {
    drone:   { coin: 0.14, gun: 0.02, heart: 0.03 },
    hunter:  { coin: 0.50, gun: 0.07, heart: 0.08 },
    spinner: { coin: 0.85, gun: 0.12, heart: 0.12 },
    tank:    { coins: () => 2 + (Math.random() < 0.5 ? 1 : 0), gun: 0.5, heart: 0.5 },
  },

  pickup: { magnetR: 110, collect: 26, life: 9, pull: 900, pullCap: 520, maxField: 12, coinValue: 5 },

  combo: { window: 2.6, step: 0.1, cap: 5 },

  diff: {
    easy:   { label: 'EASY',   hpBonus: 1, speed: 0.85, bullet: 0.80, budget: 0.80, iframes: 1.8, mult: 0.8  },
    normal: { label: 'NORMAL', hpBonus: 0, speed: 1.00, bullet: 1.00, budget: 1.00, iframes: 1.5, mult: 1.0  },
    hard:   { label: 'HARD',   hpBonus: 0, speed: 1.14, bullet: 1.12, budget: 1.30, iframes: 1.1, mult: 1.35 },
  },

  ships: {
    vector: {
      name: 'VECTOR', cost: 0, flavor: 'BALANCED INTERCEPTOR',
      accel: 2600, maxSpeed: 360, drag: 4.2, hp: 3, radius: 9, scale: 1.0,
      color: 0x2cf6ff, trail: 0xff2ec4, pts: [19, 0, -13, -12, -6, 0, -13, 12],
      stats: 'SPD 360 · HP 3 · HIT 9',
    },
    wasp: {
      name: 'WASP', cost: 300, flavor: 'FAST · FRAGILE FEEL',
      accel: 3300, maxSpeed: 445, drag: 4.6, hp: 3, radius: 8, scale: 0.9,
      color: 0x9dff3c, trail: 0x2cf6ff, pts: [21, 0, -15, -9, -5, 0, -15, 9],
      stats: 'SPD 445 · HP 3 · HIT 8',
    },
    juggernaut: {
      name: 'JUGGERNAUT', cost: 600, flavor: 'HEAVY · EXTRA PLATING',
      accel: 2200, maxSpeed: 300, drag: 4.0, hp: 4, radius: 11, scale: 1.15,
      color: 0xffa23c, trail: 0xffe14d, pts: [19, 0, -15, -14, -8, 0, -15, 14],
      stats: 'SPD 300 · HP 4 · HIT 11',
    },
  },

  upgrades: {
    twin:       { name: 'TWIN CANNON', cost: 250, desc: 'Deploy at gun tier 2 — TWIN' },
    overcharge: { name: 'OVERCHARGE',   cost: 400, desc: '+18% fire rate, all guns' },
    magnet:     { name: 'MAGNETIZER',   cost: 300, desc: '+70% pickup magnet radius' },
  },

  feel: {
    shakeMax: 16, traumaDecay: 1.7,
    traumaKill: 0.34, traumaHurt: 0.85, traumaWall: 0.10,
    hitstopKill: 0.05, hitstopHurt: 0.10,
    gridPulseKill: 0.55, gridPulseDecay: 2.4,
    hurtFlash: 0.24,
    dyingSlowmo: 0.22, dyingTime: 0.85,
    rgbHurt: 0.22, rgbMag: 9,
  },

  // ===== JUICE (Day 1 pass — tune feel by editing numbers only) =====
  juice: {
    ship: {
      // a) engine trail — ghost afterimages of the ship
      trailLength: 12,      // ring buffer: past positions rendered as ghosts
      trailFade: 0.30,      // seconds ghosts take to fade in / melt out (bigger = softer, longer-feeling trail)
      trailAlpha: 0.6,      // freshest ghost alpha (fades to 0 along the tail)
      trailMinSpeed: 30,    // px/s below which the trail vanishes
      trailFullAt: 0.5,     // fraction of maxSpeed at which the trail is fully bright
      // b) banking — lean into lateral velocity (visual only, never affects aim)
      bankAngle: 18,        // degrees of lean at full lateral speed
      bankEase: 10,         // ease in/out rate (higher = snappier)
      // c) thrust pulse — bright flicker at the rear when moving
      pulseRate: 12,        // Hz — randomized per frame so it never reads as a metronome
      pulseMinSpeed: 25,    // px/s below which the engine stays dark
      // d) squash & stretch — along the movement direction, eased
      squashAmount: { stretch: 1.08, squash: 0.94 },
      squashEase: 12,       // ease in/out rate for deformation (higher = snappier)
      stretchFullAt: 0.55,  // fraction of maxSpeed at which deformation reaches full amount
    },
  },

  pools: { bullets: 120, ebullets: 170, particles: 460, rings: 26, ghosts: 18,
           popups: 20, teles: 14, enemies: 44, pickups: 26 },

  audio: {
    master: 0.5,
    shoot: { type: 'square',   f0: 840, fMul: 0.72, dur: 0.07, vol: 0.075 },
    kill:  { noise: { dur: 0.26, vol: 0.34, lp0: 3200, lp1: 160 },
             tone: { type: 'triangle', f0: 210, f1: 42, dur: 0.30, vol: 0.22 } },
    hurt:  { tone: { type: 'sawtooth', f0: 150, f1: 46, dur: 0.22, vol: 0.38 },
             noise: { dur: 0.12, vol: 0.18, lp0: 700, lp1: 180 } },
    coin:  { tones: [ { type: 'sine', f0: 1046, f1: 1046, dur: 0.07, vol: 0.14, at: 0 },
                      { type: 'sine', f0: 1568, f1: 1568, dur: 0.10, vol: 0.14, at: 0.07 } ] },
    gun:   { tone: { type: 'square', f0: 260, f1: 920, dur: 0.22, vol: 0.2 },
             noise: { dur: 0.1, vol: 0.1, lp0: 2400, lp1: 900 } },
    heal:  { tones: [ { type: 'sine', f0: 660, f1: 660, dur: 0.09, vol: 0.15, at: 0 },
                      { type: 'sine', f0: 990, f1: 990, dur: 0.12, vol: 0.15, at: 0.08 } ] },
    ui:    { tone: { type: 'square', f0: 1700, f1: 1150, dur: 0.05, vol: 0.05 } },
    boom:  { noise: { dur: 0.5, vol: 0.5, lp0: 1400, lp1: 90 },
             tone: { type: 'sine', f0: 95, f1: 28, dur: 0.45, vol: 0.4 } },
    tier:  { tones: [ { type: 'square', f0: 220, f1: 220, dur: 0.12, vol: 0.16, at: 0 },
                      { type: 'square', f0: 330, f1: 330, dur: 0.14, vol: 0.16, at: 0.14 } ] },
  },
};
const W = CFG.world.w, H = CFG.world.h;
const COL = CFG.colors;

/* ===== 10b META — persistent profile (localStorage) ===== */
const META_DEFAULTS = {
  coins: 0, best: 0,
  ship: 'vector', owned: ['vector'],
  upg: {},                 // { twin:true, overcharge:true, magnet:true }
  diff: 'normal', autoFire: false, muted: false,
};
function loadMeta () {
  const m = Object.assign({}, META_DEFAULTS, { owned: ['vector'], upg: {} });
  try {
    const raw = localStorage.getItem('neonvoid_save');
    if (raw) {
      const j = JSON.parse(raw);
      Object.assign(m, j);
      if (!Array.isArray(m.owned) || !m.owned.includes('vector')) {
        m.owned = (m.owned && m.owned.includes('vector')) ? m.owned : ['vector'].concat(Array.isArray(m.owned) ? m.owned : []);
      }
      if (!m.upg || typeof m.upg !== 'object') m.upg = {};
      if (!CFG.diff[m.diff]) m.diff = 'normal';
      if (!CFG.ships[m.ship]) m.ship = 'vector';
    } else {
      // migrate the v0.1 best score if present
      const old = parseInt(localStorage.getItem('neonvoid_best') || '0', 10) || 0;
      if (old > 0) m.best = old;
    }
  } catch (e) { /* corrupted save — play with defaults */ }
  return m;
}
const META = loadMeta();
function saveMeta () {
  try { localStorage.setItem('neonvoid_save', JSON.stringify(META)); } catch (e) {}
}
const DIFF = () => CFG.diff[META.diff];

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

// Filters — bloom is the whole aesthetic; RGB split is the hurt kick.
const FXNS = (PIXI.filters && PIXI.filters.AdvancedBloomFilter) ? PIXI.filters : PIXI;
const AdvancedBloomFilter = FXNS.AdvancedBloomFilter;
const RGBSplitFilter = FXNS.RGBSplitFilter;

// Layer tree:
// stage
// ├ worldRoot (letterbox transform + shake)
// │   └ glow [bloom (+rgbSplit on hit)] └ crisp (HUD, no bloom)
// ├ overlayRoot (letterbox transform, no shake)
// └ flashRect (fullscreen damage flash)
const worldRoot = new PIXI.Container();
const overlayRoot = new PIXI.Container();
const glow = new PIXI.Container();
const crisp = new PIXI.Container();
const glowFilters = [];
if (AdvancedBloomFilter) glowFilters.push(new AdvancedBloomFilter(CFG.bloom));
let rgbF = null;
if (RGBSplitFilter) {
  // v6 wants an options object; positional args are deprecated
  rgbF = new RGBSplitFilter({ red: [0, 0], green: [0, 0], blue: [0, 0] });
  glowFilters.push(rgbF);
}
if (glowFilters.length) glow.filters = glowFilters;
else console.warn('[NeonVoid] pixi-filters not found — running on layered-stroke glow only.');
worldRoot.addChild(glow, crisp);
app.stage.addChild(worldRoot, overlayRoot);

// Arena floor (slightly lighter than the letterbox bars so the play space reads instantly)
const floor = new PIXI.Graphics()
  .rect(0, 0, W, H)
  .fill({ color: COL.bg, alpha: 1 });
glow.addChild(floor);

const fxL      = new PIXI.Container();  // particles, rings, ghosts, telegraphs
const enemyL   = new PIXI.Container();
const pickupL  = new PIXI.Container();
const bulletL  = new PIXI.Container();
const popupL   = new PIXI.Container();
glow.addChild(fxL, enemyL, pickupL, bulletL, popupL);

const flashRect = new PIXI.Graphics()
  .rect(0, 0, window.innerWidth, window.innerHeight)
  .fill({ color: 0xffffff, alpha: 1 });
flashRect.alpha = 0;
app.stage.addChild(flashRect);

// Global "feel" state
const S = {
  mode: 'boot',           // boot | title | playing | dying | over | paused
  time: 0,
  score: 0, best: META.best, bestBeaten: false, kills: 0,
  wave: 0, tier: 1, runCoins: 0,
  combo: 0, comboT: 0,
  gun: 1,
  timescale: 1, hitstop: 0,
  trauma: 0, shakeX: 0, shakeY: 0,
  gridPulse: 0, flashA: 0, rgbT: 0,
  dyingT: 0,
};

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
  const ui = document.getElementById('ui');
  if (ui) {
    ui.style.left = offX + 'px';
    ui.style.top = offY + 'px';
    ui.style.width = W + 'px';
    ui.style.height = H + 'px';
    ui.style.transform = 'scale(' + s + ')';
  }
}
let scaleS = 1, offX = 0, offY = 0, viewW = 0, viewH = 0;
window.addEventListener('resize', resize);

/* ===== 02 FX — grid, border, shake, hit-stop, RGB hurt, reticle ===== */

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

  // RGB split — hurt chromatic aberration, decays fast
  if (rgbF) {
    S.rgbT = Math.max(0, S.rgbT - rawDt);
    const k = (S.rgbT / CFG.feel.rgbHurt) * CFG.feel.rgbMag;
    rgbF.red = [k, 0];
    rgbF.green = [0, k * 0.6];
    rgbF.blue = [-k * 0.5, 0];
  }
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
const SPINNER_PTS = [];
for (let i = 0; i < 16; i++) {
  const r = i % 2 ? 7.5 : 17;
  const a = i / 16 * TAU;
  SPINNER_PTS.push(Math.cos(a) * r, Math.sin(a) * r);
}
const TANK_PTS = [];
for (let i = 0; i < 8; i++) {
  const a = i / 8 * TAU + TAU / 16;
  TANK_PTS.push(Math.cos(a) * 25, Math.sin(a) * 25);
}
const HUNTER_PTS = [17, 0, 2, 7, -12, 13, -6, 0, -12, -13, 2, -7]; // dart, faces +x

const TEX = {};
function bakeShipTex (ship) {
  const c = ship.color;
  TEX['ship_' + ship.name] = bake(g => neonPoly(g, ship.pts, 0x07222c, c, COL.core, 9, 3.5, 1.6, 0.95));
  TEX['shipW_' + ship.name] = bake(g => neonPoly(g, ship.pts, 0xffffff, 0xffffff, 0xffffff, 7, 3, 1.5, 1));
}
function bakeTextures () {
  for (const key in CFG.ships) bakeShipTex(CFG.ships[key]);
  TEX.ship = TEX.ship_VECTOR; TEX.shipW = TEX.shipW_VECTOR;

  TEX.drone = bake(g => neonPoly(g, [15, 0, 0, 11, -15, 0, 0, -11], 0x2a040c, COL.drone, COL.droneHi, 8, 3, 1.4, 0.9));
  TEX.droneW = bake(g => neonPoly(g, [15, 0, 0, 11, -15, 0, 0, -11], 0xffffff, 0xffffff, 0xffffff, 6, 3, 1.4, 1));

  TEX.hunter = bake(g => neonPoly(g, HUNTER_PTS, 0x1c0430, COL.hunter, COL.hunterHi, 8, 3, 1.4, 0.9));
  TEX.hunterW = bake(g => neonPoly(g, HUNTER_PTS, 0xffffff, 0xffffff, 0xffffff, 6, 3, 1.4, 1));

  TEX.spinner = bake(g => neonPoly(g, SPINNER_PTS, 0x2c2404, COL.spinner, COL.spinnerHi, 8, 3, 1.3, 0.9));
  TEX.spinnerW = bake(g => neonPoly(g, SPINNER_PTS, 0xffffff, 0xffffff, 0xffffff, 6, 3, 1.3, 1));

  TEX.tank = bake(g => {
    neonPoly(g, TANK_PTS, 0x04240e, COL.tank, COL.tankHi, 9, 3.5, 1.5, 0.9);
    const inner = TANK_PTS.map(v => v * 0.55);
    g.poly(inner).stroke({ width: 2, color: COL.tank, alpha: 0.8, join: 'round' });
    g.circle(0, 0, 5).fill({ color: COL.tankHi, alpha: 0.95 });
  });
  TEX.tankW = bake(g => neonPoly(g, TANK_PTS, 0xffffff, 0xffffff, 0xffffff, 7, 3, 1.5, 1));

  TEX.bullet = bake(g => {
    g.roundRect(-7, -1.8, 14, 3.6, 1.8).fill({ color: 0x063040, alpha: 1 });
    g.roundRect(-7, -1.8, 14, 3.6, 1.8).stroke({ width: 3.5, color: COL.player, alpha: 0.28 });
    g.roundRect(-7, -1.8, 14, 3.6, 1.8).stroke({ width: 1.6, color: COL.player, alpha: 0.9 });
    g.roundRect(-5, -0.9, 10, 1.8, 0.9).fill({ color: COL.core, alpha: 1 });
  });
  TEX.lance = bake(g => {
    g.roundRect(-14, -1.6, 28, 3.2, 1.6).fill({ color: 0x063040, alpha: 1 });
    g.roundRect(-14, -1.6, 28, 3.2, 1.6).stroke({ width: 3.5, color: COL.player, alpha: 0.3 });
    g.roundRect(-14, -1.6, 28, 3.2, 1.6).stroke({ width: 1.6, color: COL.player, alpha: 0.95 });
    g.roundRect(-10, -0.8, 20, 1.6, 0.8).fill({ color: COL.core, alpha: 1 });
  });
  TEX.ebullet = bake(g => {   // white — tinted per enemy at spawn
    g.circle(0, 0, 8).fill({ color: 0xffffff, alpha: 0.22 });
    g.circle(0, 0, 5).stroke({ width: 2, color: 0xffffff, alpha: 0.9 });
    g.circle(0, 0, 2.6).fill({ color: 0xffffff, alpha: 1 });
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
  TEX.coin = bake(g => {
    const hp2 = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU;
      hp2.push(Math.cos(a) * 9, Math.sin(a) * 9);
    }
    g.poly(hp2).fill({ color: 0x3a2a00, alpha: 1 });
    g.poly(hp2).stroke({ width: 5, color: COL.coin, alpha: 0.2, join: 'round' });
    g.poly(hp2).stroke({ width: 2, color: COL.coin, alpha: 0.95, join: 'round' });
    g.poly(hp2.map(v => v * 0.5)).stroke({ width: 1.5, color: 0xfff2c0, alpha: 0.9, join: 'round' });
  });
  TEX.heart = bake(g => {
    g.circle(-4.5, -4, 6.2).fill({ color: COL.heart, alpha: 0.95 });
    g.circle(4.5, -4, 6.2).fill({ color: COL.heart, alpha: 0.95 });
    g.poly([-10.2, -1.5, 10.2, -1.5, 0, 11.5]).fill({ color: COL.heart, alpha: 0.95 });
    g.circle(-3.2, -5.2, 2).fill({ color: 0xffe3ea, alpha: 0.95 });
  });
  TEX.gunpk = bake(g => {
    const pts = [0, -11, 9, -1, 4, -1, 4, 10, -4, 10, -4, -1, -9, -1];
    g.poly(pts).fill({ color: 0x123000, alpha: 1 });
    g.poly(pts).stroke({ width: 5, color: COL.gunpk, alpha: 0.2, join: 'round' });
    g.poly(pts).stroke({ width: 2, color: COL.gunpk, alpha: 0.95, join: 'round' });
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
function burstKill (x, y, tint, hi) {
  // sparks — hot mix of enemy color / white / amber
  for (let i = 0; i < 14; i++) {
    const a = rand(TAU), sp = rand(110, 430);
    emit({
      tex: TEX.spark, tint: Math.random() < 0.45 ? hi : (Math.random() < 0.5 ? tint : 0xffb46e),
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(0.28, 0.62), size: rand(0.5, 1.05), drag: 3.2, rot: rand(TAU),
    });
  }
  // slow embers
  for (let i = 0; i < 4; i++) {
    const a = rand(TAU), sp = rand(20, 90);
    emit({
      tex: TEX.dot, tint, x, y,
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
    p.scale.set(lerp(1, 1.35, Math.max(0, 1 - k * 4)));
    p.alpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
  }
}

/* ===== 04 PLAYER — stats come from the equipped ship ===== */
const PC = CFG.player;
const player = {
  x: W / 2, y: H / 2, vx: 0, vy: 0,
  angle: -Math.PI / 2,       // facing (lerped toward mouse)
  hp: 3, hpMax: 3, iframes: 0, fireCd: 0,
  gun: 1,
  alive: true, thrust: 0,
  squashX: 0, squashY: 0,    // wall-bounce squash timers
  flashT: 0,
  ship: CFG.ships.vector,
};
const playerSpr = new PIXI.Sprite(TEX.ship);
playerSpr.anchor.set(0.5);

// ---- JUICE ITEM 1 — ship render rig (render layer only) ----
const J = CFG.juice.ship;
// shipWrap rotates to the MOVEMENT direction; playerSpr counter-rotates inside
// it so the ship still faces the cursor. Stretch/squash on shipWrap's local
// axes = stretch along / across the velocity vector.
const shipWrap = new PIXI.Container();
shipWrap.addChild(playerSpr);          // reparent: ship now lives inside the rig
glow.addChild(shipWrap);
// 1a engine trail — ring buffer of past poses rendered as tinted afterimages
const trailL = new PIXI.Container();
fxL.addChildAt(trailL, 0);             // ghosts render under particles/enemies/bullets
const trailGhosts = [];
for (let i = 0; i < J.trailLength; i++) {
  const g = spriteOf(TEX.shipW);       // white silhouette — tinted per frame
  g.visible = false;
  trailL.addChild(g);
  trailGhosts.push(g);
}
const trailBuf = {
  x: new Float32Array(J.trailLength),
  y: new Float32Array(J.trailLength),
  r: new Float32Array(J.trailLength),
  head: 0,
};
// 1c thrust pulse — soft glow dot at the tail, flickers when moving
const flameSpr = new PIXI.Sprite(TEX.dot);
flameSpr.anchor.set(0.5);
flameSpr.blendMode = 'add';
flameSpr.visible = false;
playerSpr.addChild(flameSpr);
let bankCur = 0, wrapAng = 0, stretchCur = 1, squashCur = 1, flickPhase = 0;

function shipTexName (ship) { return 'ship_' + ship.name; }

function playerReset () {
  const ship = CFG.ships[META.ship] || CFG.ships.vector;
  const D = DIFF();
  player.ship = ship;
  player.x = W / 2; player.y = H / 2;
  player.vx = player.vy = 0;
  player.angle = -Math.PI / 2;
  player.hpMax = ship.hp + D.hpBonus;
  player.hp = player.hpMax;
  player.iframes = 0; player.fireCd = 0;
  player.gun = META.upg.twin ? 2 : 1;
  player.alive = true; player.flashT = 0;
  playerSpr.texture = TEX[shipTexName(ship)];
  playerSpr.visible = true;
  shipWrap.visible = true;
  // JUICE rig reset
  for (let i = 0; i < trailGhosts.length; i++) {
    trailGhosts[i].texture = TEX['shipW_' + ship.name];
    trailGhosts[i].scale.set(ship.scale);
    trailGhosts[i].alpha = 0;
    trailGhosts[i].visible = false;
  }
  trailBuf.head = 0;
  for (let i = 0; i < trailBuf.x.length; i++) {
    trailBuf.x[i] = player.x; trailBuf.y[i] = player.y; trailBuf.r[i] = player.angle;
  }
  bankCur = 0; wrapAng = player.angle;
  stretchCur = 1; squashCur = 1;
  shipWrap.position.set(player.x, player.y);
  shipWrap.rotation = wrapAng;
  playerSpr.rotation = 0;
  playerSpr.scale.set(ship.scale);
  flameSpr.position.set(Math.min(ship.pts[2], ship.pts[6]) - 2, 0);
  flameSpr.visible = false;
  flickPhase = rand(TAU);
  S.gun = player.gun;
}

function playerUpdate (dt) {
  if (!player.alive) return;
  const P = player;

  // thrust in world space (WASD), inertia + drag — ship stats override defaults
  let ax = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0);
  let ay = (K.KeyS || K.ArrowDown ? 1 : 0) - (K.KeyW || K.ArrowUp ? 1 : 0);
  const mag = Math.hypot(ax, ay);
  P.thrust = mag > 0 ? 1 : 0;
  if (mag > 0) { ax /= mag; ay /= mag; }
  P.vx += ax * P.ship.accel * dt;
  P.vy += ay * P.ship.accel * dt;
  const k = Math.exp(-P.ship.drag * dt);
  P.vx *= k; P.vy *= k;
  const sp = Math.hypot(P.vx, P.vy);
  if (sp > P.ship.maxSpeed) { P.vx *= P.ship.maxSpeed / sp; P.vy *= P.ship.maxSpeed / sp; }
  P.x += P.vx * dt; P.y += P.vy * dt;

  // soft walls — bounce + squash so the box feels physical
  const b = CFG.world.bound + P.ship.radius;
  let bounced = 0;
  if (P.x < b)     { P.x = b;     if (P.vx < 0) { P.vx *= -PC.wallBounce; bounced = 1; P.squashX = 0.16; } }
  if (P.x > W - b) { P.x = W - b; if (P.vx > 0) { P.vx *= -PC.wallBounce; bounced = 1; P.squashX = 0.16; } }
  if (P.y < b)     { P.y = b;     if (P.vy < 0) { P.vy *= -PC.wallBounce; bounced = 1; P.squashY = 0.16; } }
  if (P.y > H - b) { P.y = H - b; if (P.vy > 0) { P.vy *= -PC.wallBounce; bounced = 1; P.squashY = 0.16; } }
  if (bounced) { addTrauma(CFG.feel.traumaWall); puff(P.x, P.y, 4, 0x9d5cff, 70); }

  // face the cursor (smoothed so aim stays readable)
  const ta = Math.atan2(M.y - P.y, M.x - P.x);
  P.angle = lerpAngle(P.angle, ta, damp(PC.turnLerp, dt));

  // (old particle engine trail replaced by the afterimage rig — JUICE ITEM 1a)

  // fire — hold LMB, or always when AUTO-FIRE accessibility toggle is on
  P.fireCd -= dt;
  const gt = CFG.gunTiers[P.gun - 1];
  const rate = gt.rate * (META.upg.overcharge ? 1.18 : 1);
  if ((META.autoFire || M.down) && P.fireCd <= 0) {
    P.fireCd = 1 / rate;
    fireBullet(gt);
  }

  // i-frame blink
  P.iframes = Math.max(0, P.iframes - dt);
  P.flashT = Math.max(0, P.flashT - dt);

  // sprite transform — JUICE ITEM 1 rig
  P.squashX = Math.max(0, P.squashX - dt * 1.4);
  P.squashY = Math.max(0, P.squashY - dt * 1.4);
  playerSpr.texture = P.flashT > 0 ? TEX['shipW_' + P.ship.name] : TEX[shipTexName(P.ship)];
  playerSpr.alpha = P.iframes > 0 ? (Math.sin(S.time * 42) > 0 ? 1 : 0.25) : 1;

  // 1b banking — eased lean into lateral velocity (visual only)
  const lat = Math.cos(P.angle) * P.vy - Math.sin(P.angle) * P.vx; // lateral velocity
  const bankT = clamp(lat / P.ship.maxSpeed, -1, 1) * J.bankAngle * Math.PI / 180;
  bankCur += (bankT - bankCur) * damp(J.bankEase, dt);

  // 1a record the current pose for the afterimage trail
  trailBuf.x[trailBuf.head] = P.x;
  trailBuf.y[trailBuf.head] = P.y;
  trailBuf.r[trailBuf.head] = P.angle + bankCur;
  trailBuf.head = (trailBuf.head + 1) % trailBuf.x.length;

  // 1d squash & stretch — along the movement direction, eased back to 1.0
  if (sp > 20) wrapAng = lerpAngle(wrapAng, Math.atan2(P.vy, P.vx), damp(J.squashEase, dt));
  const sk = clamp(sp / (P.ship.maxSpeed * J.stretchFullAt), 0, 1);
  const se = damp(J.squashEase, dt);
  stretchCur += (1 + (J.squashAmount.stretch - 1) * sk - stretchCur) * se;
  squashCur += (1 + (J.squashAmount.squash - 1) * sk - squashCur) * se;

  shipWrap.position.set(P.x, P.y);
  shipWrap.rotation = wrapAng;
  shipWrap.scale.set(stretchCur * (1 - P.squashX * 1.6), squashCur * (1 - P.squashY * 1.6));
  playerSpr.rotation = P.angle + bankCur - wrapAng;   // ship still faces the cursor
  playerSpr.scale.set(P.ship.scale);

  // 1c thrust pulse — bright flicker at the tail, ~12 Hz with random jitter
  if (sp > J.pulseMinSpeed) {
    flickPhase += dt * J.pulseRate * TAU * (0.85 + Math.random() * 0.3);
    const f = 0.5 + 0.5 * Math.sin(flickPhase);
    flameSpr.visible = true;
    flameSpr.tint = P.ship.color;
    flameSpr.alpha = clamp(0.30 + 0.45 * f + rand(-0.08, 0.08), 0, 1);
    flameSpr.scale.set(0.55 + 0.5 * f);
  } else {
    flameSpr.visible = false;
  }
}

// JUICE 1a — render the afterimage trail from the pose ring buffer.
// dt-scaled: hit-stop freezes the trail, death slow-mo melts it slowly.
function updateShipTrail (dt) {
  const active = player.alive &&
    (S.mode === 'playing' || S.mode === 'dying' || S.mode === 'paused');
  const sp = Math.hypot(player.vx, player.vy);
  const speedK = active
    ? clamp(sp / (player.ship.maxSpeed * J.trailFullAt), 0, 1)
    : 0;
  const n = trailBuf.x.length;
  const melt = damp(1 / Math.max(0.05, J.trailFade), dt);
  for (let i = 0; i < n; i++) {
    const g = trailGhosts[i];
    const t = i / (n - 1);                       // 0 freshest -> 1 oldest
    const aT = active ? J.trailAlpha * (1 - t) * speedK : 0;
    g.alpha += (aT - g.alpha) * melt;
    if (g.alpha < 0.02) { g.visible = false; continue; }
    g.visible = true;
    const idx = (trailBuf.head - 1 - i + n * 2) % n;
    g.position.set(trailBuf.x[idx], trailBuf.y[idx]);
    g.rotation = trailBuf.r[idx];
    g.tint = lerpColor(player.ship.color, player.ship.trail, t);  // cyan -> pink
  }
}

function playerHit (dx, dy, knockMul = 1) {
  const P = player;
  P.hp -= 1;
  P.iframes = DIFF().iframes;
  S.flashA = CFG.feel.hurtFlash;
  S.rgbT = CFG.feel.rgbHurt;
  addTrauma(CFG.feel.traumaHurt);
  hitstop(CFG.feel.hitstopHurt);
  // knockback away from the source
  const d = Math.hypot(dx, dy) || 1;
  P.vx += (dx / d) * 220 * knockMul; P.vy += (dy / d) * 220 * knockMul;
  puff(P.x, P.y, 10, P.ship.color, 160);
  A.hurt();
  if (S.combo > 0) { S.combo = 0; S.comboT = 0; popup(P.x, P.y - 26, 'COMBO LOST', '#8f7fb8', 12); }
  hudHP();
  if (P.hp <= 0) playerDie();
}

function playerDie () {
  const P = player;
  P.alive = false;
  playerSpr.visible = false;
  M.down = false;
  // big ship-colored detonation
  for (let i = 0; i < 26; i++) {
    const a = rand(TAU), sp = rand(120, 520);
    emit({ tex: TEX.spark, tint: Math.random() < 0.5 ? P.ship.color : P.ship.trail, x: P.x, y: P.y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.4, 0.9), size: rand(0.6, 1.2), drag: 2.4, rot: rand(TAU) });
  }
  for (let i = 0; i < 6; i++) {
    const a = rand(TAU), sp = rand(20, 110);
    emit({ tex: TEX.dot, tint: P.ship.color, x: P.x, y: P.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: rand(0.6, 1.1), size: rand(1.2, 2), grow: 1.6, drag: 1.4, alpha: 0.6 });
  }
  ring(P.x, P.y, P.ship.color, 3.2, 0.45);
  ring(P.x, P.y, P.ship.trail, 2.2, 0.6);
  addTrauma(1);
  hitstop(0.09);
  S.flashA = 0.32;
  A.boom();
  S.mode = 'dying';
  S.dyingT = CFG.feel.dyingTime;
  S.timescale = CFG.feel.dyingSlowmo;
}

/* ===== 05 BULLETS — player gun tiers 1..5 ===== */
const bulletPool = makePool(CFG.pools.bullets, () => spriteOf(TEX.bullet), bulletL);

function fireBullet (gt) {
  const P = player;
  const n = gt.count;
  for (let i = 0; i < n; i++) {
    const b = bulletPool.get();
    if (!b) break;
    let a = P.angle + rand(-PC.bulletSpread, PC.bulletSpread);
    let ox = 0, oy = 0;
    if (n > 1) {
      if (gt.parallel) {
        // TWIN — two parallel lanes
        const px = -Math.sin(P.angle), py = Math.cos(P.angle);
        const lane = (i - (n - 1) / 2) * 9;
        ox = px * lane; oy = py * lane;
        a = P.angle + rand(-PC.bulletSpread, PC.bulletSpread);
      } else {
        // fan spread
        const t = n === 1 ? 0 : (i / (n - 1)) - 0.5;
        a = P.angle + t * gt.spread * 2 + rand(-PC.bulletSpread, PC.bulletSpread);
      }
    }
    b.texture = TEX[gt.tex];
    b.x = P.x + Math.cos(P.angle) * 18 + ox;
    b.y = P.y + Math.sin(P.angle) * 18 + oy;
    b.vx = Math.cos(a) * gt.speed;
    b.vy = Math.sin(a) * gt.speed;
    b.life = gt.life;
    b.dmg = gt.dmg;
    b.pierce = gt.pierce;
    b.last = null;
    b.wob = gt.wave || 0;
    b.wt = 0;
    b.px = -Math.sin(a); b.py = Math.cos(a);
    b.rotation = a;
    b.scale.set(rand(0.9, 1.1));
    // muzzle flash
    emit({ tex: TEX.dot, tint: COL.core, x: b.x, y: b.y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 0.07, size: 0.9, drag: 2 });
  }
  A.shoot(P.gun);
}

function updateBullets (dt) {
  for (const b of bulletPool.items) {
    if (!b.active) continue;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
      bulletPool.release(b); continue;
    }
    b.wt += dt;
    const wv = b.wob ? Math.cos(b.wt * 16) * b.wob * 420 : 0;
    b.x += (b.vx + b.px * wv) * dt;
    b.y += (b.vy + b.py * wv) * dt;
  }
}

/* ===== 06 ENEMIES — drone / hunter / spinner / tank ===== */
const EKIND = {
  drone:   { cfg: CFG.drone,   tex: 'drone',   color: COL.drone,   hi: COL.droneHi   },
  hunter:  { cfg: CFG.hunter,  tex: 'hunter',  color: COL.hunter,  hi: COL.hunterHi  },
  spinner: { cfg: CFG.spinner, tex: 'spinner', color: COL.spinner, hi: COL.spinnerHi },
  tank:    { cfg: CFG.tank,    tex: 'tank',    color: COL.tank,    hi: COL.tankHi    },
};
const enemyPool = makePool(CFG.pools.enemies, () => spriteOf(TEX.drone), enemyL);
const telePool = makePool(CFG.pools.teles, () => spriteOf(TEX.ring), fxL); // spawn telegraphs

function tierOf (wave) { return 1 + Math.floor((wave - 1) / CFG.waves.tierEvery); }
function enemyHp (kind, tier) {
  const c = EKIND[kind].cfg;
  return c.hp + (tier - 1) * (c.hpPerTier || 0);
}
function sharedSpeedMult () {
  return Math.min(CFG.waves.speedCap, 1 + (S.wave - 1) * 0.055 + (S.tier - 1) * 0.05) * DIFF().speed;
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

function telegraphSpawn (kind) {
  const t = telePool.get();
  if (!t) return false;
  const p = spawnPoint();
  t.texture = TEX.ring; t.tint = EKIND[kind].color;
  t.x = p.x; t.y = p.y;
  t.t = CFG.waves.telegraph; t.dur = CFG.waves.telegraph;
  t.x0 = p.x; t.y0 = p.y; t.kind = kind;
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
      spawnEnemy(t.kind, t.x0, t.y0);
    }
  }
}

function spawnEnemy (kind, x, y) {
  const d = enemyPool.get();
  if (!d) return;
  const K = EKIND[kind], c = K.cfg;
  d.kind = kind; d.cfg = c; d.k = K;
  d.x = x; d.y = y;
  d.vx = 0; d.vy = 0;
  d.hp = enemyHp(kind, S.tier);
  d.radius = c.radius;
  d.phase = rand(TAU);
  d.rotA = rand(TAU);
  d.flashT = 0;
  d.spawnK = 0;
  d.scale.set(0.1);
  d.orb = Math.random() < 0.5 ? 1 : -1;      // hunter strafe dir
  d.fireT = rand(c.fireMin || 1, c.fireMax || 2); // hunter
  d.cool = rand(0.8, 1.6);                   // spinner / tank cycle
  d.sprayT = 0; d.emitCd = 0; d.sprA = rand(TAU);
  d.ax = rand(W * 0.25, W * 0.75); d.ay = rand(H * 0.25, H * 0.75); // spinner anchor
  d.texN = K.tex;
  d.texture = TEX[K.tex];
  puff(x, y, 6, K.color, 120);
  ring(x, y, K.color, 1.1, 0.3);
}

// --- enemy bullets ---
const ebPool = makePool(CFG.pools.ebullets, () => spriteOf(TEX.ebullet), bulletL);
function fireEnemyBullet (x, y, ang, speed, tint) {
  const b = ebPool.get();
  if (!b) return;
  b.x = x; b.y = y;
  const sp = speed * DIFF().bullet;
  b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
  b.life = 7;
  b.tint = tint;
  b.scale.set(1);
  b.rotation = 0;
}

function updateEBullets (dt) {
  for (const b of ebPool.items) {
    if (!b.active) continue;
    b.life -= dt;
    if (b.life <= 0 || b.x < 8 || b.x > W - 8 || b.y < 8 || b.y > H - 8) {
      ebPool.release(b); continue;
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    // player collision
    if (player.alive && S.mode === 'playing' && player.iframes <= 0) {
      const rr = 4.5 + player.ship.radius;
      if (Math.abs(b.x - player.x) < rr && Math.abs(b.y - player.y) < rr &&
          Math.hypot(b.x - player.x, b.y - player.y) < rr) {
        ebPool.release(b);
        playerHit(player.x - b.x, player.y - b.y);
        continue;
      }
    }
  }
}

// --- per-kind AI ---
function updateEnemies (dt) {
  const chasing = player.alive && S.mode === 'playing';
  const actives = [];
  for (const d of enemyPool.items) if (d.active) actives.push(d);

  for (const d of actives) {
    d.flashT = Math.max(0, d.flashT - dt);
    d.spawnK = Math.min(1, d.spawnK + dt * 4.5);
    const c = d.cfg;

    if (d.kind === 'drone') {
      d.rotA += c.spin * dt;
      if (chasing) {
        const dx = player.x - d.x, dy = player.y - d.y;
        const wob = Math.sin(S.time * c.weaveFreq + d.phase) * c.weaveAmp;
        const ang = Math.atan2(dy, dx) + wob;
        const ms = c.baseSpeed * Math.min(c.speedCap, 1 + (S.wave - 1) * c.speedRamp) * DIFF().speed;
        const dvx = Math.cos(ang) * ms - d.vx, dvy = Math.sin(ang) * ms - d.vy;
        const dl = Math.hypot(dvx, dvy) || 1;
        const st = Math.min(c.accel * dt, dl);
        d.vx += (dvx / dl) * st; d.vy += (dvy / dl) * st;
        // separation — keeps the swarm readable instead of one blob
        for (const o of actives) {
          if (o === d || o.kind !== 'drone') continue;
          const sx = d.x - o.x, sy = d.y - o.y;
          const sd = Math.hypot(sx, sy);
          if (sd > 0.01 && sd < c.sepDist) {
            d.vx += (sx / sd) * c.sepForce * dt;
            d.vy += (sy / sd) * c.sepForce * dt;
          }
        }
      } else { d.vx *= Math.exp(-0.8 * dt); d.vy *= Math.exp(-0.8 * dt); }
      d.texture = d.flashT > 0 ? TEX.droneW : TEX.drone;
      d.rotation = d.rotA;
      const pulse = 1 + Math.sin(S.time * c.pulseRate + d.phase) * c.pulseAmp;
      const popIn = 1 - Math.pow(1 - d.spawnK, 3);
      d.scale.set(popIn * pulse * (d.spawnK < 1 ? 1.15 : 1));
    }

    else if (d.kind === 'hunter') {
      if (chasing) {
        const dx = player.x - d.x, dy = player.y - d.y;
        const dist = Math.hypot(dx, dy) || 1;
        const ms = c.baseSpeed * sharedSpeedMult();
        let tx, ty;
        if (dist > c.ring + c.ringSlack)      { tx = dx / dist; ty = dy / dist; }
        else if (dist < c.ring - c.ringSlack) { tx = -dx / dist; ty = -dy / dist; }
        else { tx = (-dy / dist) * d.orb; ty = (dx / dist) * d.orb; }
        const dvx = tx * ms - d.vx, dvy = ty * ms - d.vy;
        const dl = Math.hypot(dvx, dvy) || 1;
        const st = Math.min(c.accel * dt, dl);
        d.vx += (dvx / dl) * st; d.vy += (dvy / dl) * st;

        // fire cycle: charge telegraph → predictive shot
        d.fireT -= dt;
        if (d.fireT <= 0 && d.spawnK >= 1) {
          const predict = Math.min(0.95, c.predict + S.wave * 0.02);
          const tof = dist / (c.bulletSpeed * DIFF().bullet);
          const aim = Math.atan2(dy + player.vy * tof * predict, dx + player.vx * tof * predict);
          if (S.tier >= 2 && Math.random() < 0.4) {
            fireEnemyBullet(d.x, d.y, aim - 0.18, c.bulletSpeed, d.k.color);
            fireEnemyBullet(d.x, d.y, aim,          c.bulletSpeed, d.k.color);
            fireEnemyBullet(d.x, d.y, aim + 0.18, c.bulletSpeed, d.k.color);
          } else {
            fireEnemyBullet(d.x, d.y, aim, c.bulletSpeed, d.k.color);
          }
          puff(d.x, d.y, 3, d.k.hi, 60);
          A.ui();
          d.fireT = rand(c.fireMin, c.fireMax) / Math.min(1.4, 1 + (S.tier - 1) * 0.12);
        }
        d.rotation = Math.atan2(dy, dx);
      } else { d.vx *= Math.exp(-0.8 * dt); d.vy *= Math.exp(-0.8 * dt); }
      d.texture = d.flashT > 0 || (chasing && d.fireT < c.charge && d.fireT < 0.14)
        ? TEX.hunterW : TEX.hunter;
      const chargePulse = chasing && d.fireT < c.charge ? 1 + 0.16 * Math.sin(S.time * 26) : 1;
      const popIn = 1 - Math.pow(1 - d.spawnK, 3);
      d.scale.set(popIn * chargePulse);
    }

    else if (d.kind === 'spinner') {
      d.rotA += c.spin * dt;
      d.sprA += c.sprayRot * dt;
      if (chasing) {
        // drift toward a wandering interior anchor
        const ddx = d.ax - d.x, ddy = d.ay - d.y;
        const dd = Math.hypot(ddx, ddy);
        if (dd < 30 || d.cool > c.coolDur + 5) {
          d.ax = rand(W * 0.22, W * 0.78); d.ay = rand(H * 0.22, H * 0.78);
        }
        const ms = c.baseSpeed * sharedSpeedMult();
        const dl2 = dd || 1;
        const dvx = (ddx / dl2) * ms - d.vx, dvy = (ddy / dl2) * ms - d.vy;
        const dl = Math.hypot(dvx, dvy) || 1;
        const st = Math.min(c.accel * dt, dl);
        d.vx += (dvx / dl) * st; d.vy += (dvy / dl) * st;

        // spiral spray cycle
        if (d.sprayT > 0) {
          d.sprayT -= dt;
          d.emitCd -= dt;
          if (d.emitCd <= 0 && d.spawnK >= 1) {
            d.emitCd = c.sprayEvery;
            fireEnemyBullet(d.x, d.y, d.sprA,          c.bulletSpeed, d.k.color);
            fireEnemyBullet(d.x, d.y, d.sprA + Math.PI, c.bulletSpeed, d.k.color);
          }
          if (d.sprayT <= 0) d.cool = c.coolDur;   // spray finished → cool down
        } else {
          d.cool -= dt;
          if (d.cool <= 0) { d.sprayT = c.sprayDur; d.emitCd = 0; }
        }
      } else { d.vx *= Math.exp(-0.8 * dt); d.vy *= Math.exp(-0.8 * dt); }
      d.texture = d.flashT > 0 ? TEX.spinnerW : TEX.spinner;
      d.rotation = d.rotA;
      const popIn = 1 - Math.pow(1 - d.spawnK, 3);
      d.scale.set(popIn);
    }

    else if (d.kind === 'tank') {
      d.rotA += 0.4 * dt;
      if (chasing) {
        const dx = player.x - d.x, dy = player.y - d.y;
        const dist = Math.hypot(dx, dy) || 1;
        const ms = c.baseSpeed * sharedSpeedMult();
        const dvx = (dx / dist) * ms - d.vx, dvy = (dy / dist) * ms - d.vy;
        const dl = Math.hypot(dvx, dvy) || 1;
        const st = Math.min(c.accel * dt, dl);
        d.vx += (dvx / dl) * st; d.vy += (dvy / dl) * st;

        // periodic radial ring
        d.cool -= dt;
        if (d.cool <= 0 && d.spawnK >= 1) {
          d.cool = c.fireCd;
          const n = Math.min(14, c.ringCount + (S.tier - 1) * 2);
          const off = rand(TAU);
          for (let i = 0; i < n; i++) {
            fireEnemyBullet(d.x, d.y, off + i / n * TAU, c.ringSpeed, d.k.color);
          }
          ring(d.x, d.y, d.k.color, 1.5, 0.3);
          A.ui();
        }
        d.rotation = Math.atan2(dy, dx);
      } else { d.vx *= Math.exp(-0.8 * dt); d.vy *= Math.exp(-0.8 * dt); }
      d.texture = d.flashT > 0 ? TEX.tankW : TEX.tank;
      const popIn = 1 - Math.pow(1 - d.spawnK, 3);
      d.scale.set(popIn);
    }

    d.x += d.vx * dt; d.y += d.vy * dt;

    // soft walls
    const m = CFG.world.bound + 8;
    if (d.x < m)     { d.x = m;     if (d.vx < 0) d.vx *= -0.5; }
    if (d.x > W - m) { d.x = W - m; if (d.vx > 0) d.vx *= -0.5; }
    if (d.y < m)     { d.y = m;     if (d.vy < 0) d.vy *= -0.5; }
    if (d.y > H - m) { d.y = H - m; if (d.vy > 0) d.vy *= -0.5; }
  }

  // contact damage
  if (chasing && player.iframes <= 0) {
    for (const d of actives) {
      const rr = player.ship.radius + d.radius;
      if (Math.abs(d.x - player.x) < rr && Math.abs(d.y - player.y) < rr) {
        if (Math.hypot(d.x - player.x, d.y - player.y) < rr) {
          if (d.kind === 'drone') {
            killEnemy(d, false);      // kamikaze drone pops — no score
          } else {
            // heavy bodies shove you and stay alive
            const dx = player.x - d.x, dy = player.y - d.y;
            const dd = Math.hypot(dx, dy) || 1;
            player.vx += (dx / dd) * 260; player.vy += (dy / dd) * 260;
            d.vx -= (dx / dd) * 80; d.vy -= (dy / dd) * 80;
          }
          playerHit(player.x - d.x, player.y - d.y, d.kind === 'tank' ? d.cfg.knock : 1);
          break;
        }
      }
    }
  }
}

/* ===== 07 COLLISIONS — player bullets vs enemies ===== */
function collideBullets () {
  for (const b of bulletPool.items) {
    if (!b.active) continue;
    for (const d of enemyPool.items) {
      if (!d.active || d === b.last) continue;
      const rr = 3.5 + d.radius;
      if (Math.abs(b.x - d.x) < rr && Math.abs(b.y - d.y) < rr) {
        if (Math.hypot(b.x - d.x, b.y - d.y) < rr) {
          b.last = d;
          hitEnemy(d, b.vx, b.vy, b.dmg);
          if (b.pierce > 0) { b.pierce -= 1; b.dmg = Math.max(1, b.dmg - 1); }
          else { bulletPool.release(b); break; }
        }
      }
    }
  }
}

function hitEnemy (d, bvx, bvy, dmg) {
  d.hp -= dmg;
  if (d.hp > 0) {
    d.flashT = 0.07;
    const bl = Math.hypot(bvx, bvy) || 1;
    const kb = d.kind === 'tank' ? 60 : 190;
    d.vx += (bvx / bl) * kb; d.vy += (bvy / bl) * kb;
    puff(d.x, d.y, 3, d.k.hi, 110);
    return;
  }
  killEnemy(d, true);
}

function killEnemy (d, giveScore) {
  const x = d.x, y = d.y;
  const K = d.k, c = d.cfg;
  enemyPool.release(d);
  burstKill(x, y, K.color, K.hi);
  ring(x, y, K.color, d.kind === 'tank' ? 2.8 : 1.9, 0.3);
  ghost(x, y, TEX[K.tex + 'W'], d.kind === 'tank' ? 1.25 : 1);
  addTrauma(CFG.feel.traumaKill * (d.kind === 'tank' ? 1.6 : 1));
  hitstop(d.kind === 'tank' ? 0.09 : CFG.feel.hitstopKill);
  S.gridPulse += CFG.feel.gridPulseKill;
  if (d.kind === 'tank') A.boom(); else A.kill();
  if (d.kind === 'tank') {
    // death burst — do not stand still
    const n = 10, off = rand(TAU);
    for (let i = 0; i < n; i++) fireEnemyBullet(x, y, off + i / n * TAU, 160, K.color);
  }
  if (giveScore) {
    const mult = comboMult();
    const pts = Math.round(c.score * mult * DIFF().mult / 10) * 10;
    S.score += pts;
    S.kills += 1;
    S.combo += 1;
    S.comboT = CFG.combo.window;
    const pcol = mult >= 3.5 ? '#ff2ec4' : mult >= 2 ? '#ffd23c' : COL.core;
    popup(x, y, '+' + pts, pcol);
    if (mult >= 2) popup(x, y - 20, '×' + mult.toFixed(1), pcol, 12);
    hudScore();
    checkNewBest();
    rollDrops(x, y, d.kind);
  }
}

/* ===== 07b PICKUPS — heart / gun / coin with magnet pull ===== */
const pickupPool = makePool(CFG.pools.pickups, () => spriteOf(TEX.coin), pickupL);
const PICKUP_TEX = { heart: TEX.heart, gun: TEX.gunpk, coin: TEX.coin };

function dropPickup (x, y, kind) {
  const p = pickupPool.get();
  if (!p) return;
  p.kind = kind;
  p.texture = PICKUP_TEX[kind];
  p.x = x; p.y = y;
  const a = rand(TAU);
  p.vx = Math.cos(a) * rand(50, 110);
  p.vy = Math.sin(a) * rand(50, 110);
  p.life = CFG.pickup.life;
  p.t = rand(TAU);
  p.scale.set(1);
  p.alpha = 1;
}

function rollDrops (x, y, kind) {
  const t = CFG.drops[kind];
  if (pickupPool.countActive() >= CFG.pickup.maxField && kind !== 'tank') return;
  const nCoins = t.coins ? t.coins() : (Math.random() < t.coin ? 1 : 0);
  for (let i = 0; i < nCoins; i++) dropPickup(x + rand(-14, 14), y + rand(-14, 14), 'coin');
  if (Math.random() < t.heart && player.hp < player.hpMax) dropPickup(x, y, 'heart');
  else if (Math.random() < t.gun && player.gun < 5) dropPickup(x, y, 'gun');
}

function comboMult () {
  return Math.min(CFG.combo.cap, 1 + S.combo * CFG.combo.step);
}

function updatePickups (dt) {
  const magnetR = CFG.pickup.magnetR * (META.upg.magnet ? 1.7 : 1);
  for (const p of pickupPool.items) {
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) { pickupPool.release(p); continue; }
    p.t += dt;
    // magnet pull
    if (player.alive) {
      const dx = player.x - p.x, dy = player.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < magnetR) {
        p.vx += (dx / d) * CFG.pickup.pull * dt;
        p.vy += (dy / d) * CFG.pickup.pull * dt;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > CFG.pickup.pullCap) { p.vx *= CFG.pickup.pullCap / sp; p.vy *= CFG.pickup.pullCap / sp; }
      } else {
        p.vx *= Math.exp(-1.4 * dt); p.vy *= Math.exp(-1.4 * dt);
      }
      if (d < CFG.pickup.collect) { collectPickup(p); continue; }
    } else {
      p.vx *= Math.exp(-1.4 * dt); p.vy *= Math.exp(-1.4 * dt);
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    // visuals: blink out, coins spin, hearts/guns bob
    p.alpha = p.life < 2.5 ? (Math.sin(S.time * 22) > 0 ? 1 : 0.25) : 1;
    if (p.kind === 'coin') {
      p.rotation = 0;
      p.scale.set(0.35 + 0.65 * Math.abs(Math.cos(p.t * 4.2)));
    } else {
      p.scale.set(1 + Math.sin(p.t * 3.4) * 0.08);
      p.rotation = Math.sin(p.t * 2.2) * 0.12;
    }
  }
}

function collectPickup (p) {
  const x = p.x, y = p.y;
  pickupPool.release(p);
  if (p.kind === 'coin') {
    S.runCoins += CFG.pickup.coinValue;
    popup(x, y, '+' + CFG.pickup.coinValue + ' CR', '#ffd23c', 14);
    puff(x, y, 5, COL.coin, 90);
    A.coin();
    hudScore();
  } else if (p.kind === 'heart') {
    player.hp = Math.min(player.hpMax, player.hp + 1);
    popup(x, y, '+1 HP', '#ff8fa3', 15);
    ring(x, y, COL.heart, 1.4, 0.35);
    puff(x, y, 6, COL.heart, 100);
    A.heal();
    hudHP();
  } else if (p.kind === 'gun') {
    if (player.gun < 5) {
      player.gun += 1;
      S.gun = player.gun;
      const gt = CFG.gunTiers[player.gun - 1];
      popup(x, y, gt.name + ' ONLINE', '#9dff3c', 16);
      ring(x, y, COL.gunpk, 1.7, 0.4);
      puff(x, y, 8, COL.gunpk, 120);
      A.gun();
      hudGun();
    } else {
      const pts = 250;
      S.score += pts;
      popup(x, y, 'MAX +' + pts, '#9dff3c', 15);
      A.coin();
      hudScore();
    }
  }
}

/* ===== 08 WAVES — budget director with breathers + tiers ===== */
const Wv = { n: 0, queue: [], spawnCd: 0, phase: 'idle', breatherT: 0 };
// phase: idle (title) | spawning | breather

function buildQueue (budget, wave) {
  const avail = ['drone'];
  if (wave >= CFG.waves.unlock.hunter)  avail.push('hunter');
  if (wave >= CFG.waves.unlock.spinner) avail.push('spinner');
  if (wave >= CFG.waves.unlock.tank)    avail.push('tank');
  const q = [];
  let b = budget, guard = 0;
  while (b > 0 && guard++ < 500) {
    // weighted pick among affordable types
    let total = 0;
    const aff = [];
    for (const k of avail) {
      if (CFG.waves.cost[k] <= b) { aff.push(k); total += CFG.waves.weights[k]; }
    }
    if (!aff.length) { q.push('drone'); b -= 1; continue; }
    let r = Math.random() * total;
    let pick = aff[0];
    for (const k of aff) { r -= CFG.waves.weights[k]; if (r <= 0) { pick = k; break; } }
    q.push(pick);
    b -= CFG.waves.cost[pick];
  }
  // shuffle lightly so bigs don't always come in the same order
  for (let i = q.length - 1; i > 0; i--) {
    if (Math.random() < 0.25) {
      const j = (Math.random() * (i + 1)) | 0;
      [q[i], q[j]] = [q[j], q[i]];
    }
  }
  return q;
}

function startWave (n) {
  Wv.n = n; S.wave = n;
  S.tier = tierOf(n);
  const budget = Math.floor(CFG.waves.budget(n) * DIFF().budget);
  Wv.queue = buildQueue(budget, n);
  Wv.spawnCd = 0.7;
  Wv.phase = 'spawning';
  const tierWave = n > 1 && (n - 1) % CFG.waves.tierEvery === 0;
  if (tierWave) {
    banner('WAVE ' + n + ' — TIER ' + S.tier + ' // THEY ADAPT', '#ffa23c', 30, 1.8);
    A.tier();
    addTrauma(0.18);
  } else {
    banner('WAVE ' + n, COL.text, 40, 1.5);
  }
  hudWave();
}

function countHostiles () {
  return enemyPool.countActive() + telePool.countActive();
}

function wavesUpdate (dt) {
  if (S.mode !== 'playing') return;
  if (Wv.phase === 'spawning') {
    if (Wv.queue.length > 0) {
      Wv.spawnCd -= dt;
      if (Wv.spawnCd <= 0 && countHostiles() < CFG.waves.maxActive) {
        if (telegraphSpawn(Wv.queue.shift())) {
          Wv.spawnCd = CFG.waves.spawnInterval(Wv.n) * rand(0.75, 1.25);
        }
      }
    } else if (countHostiles() === 0) {
      Wv.phase = 'breather';
      Wv.breatherT = CFG.waves.breather;
      const bonus = CFG.waves.clearBonus(Wv.n);
      S.score += bonus;
      popup(W / 2, H / 2 - 60, 'WAVE CLEAR  +' + bonus, COL.player, 22);
      hudScore();
      checkNewBest();
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
const gunT = mkText('GUN 1 — PULSE', 12, 700, '#9dff3c', 2, 'left');
gunT.anchor.set(0, 0); gunT.position.set(22, 64);
const waveT = mkText('WAVE 1', 15, 700, '#b98cff', 4);
waveT.anchor.set(0.5, 0); waveT.position.set(W / 2, 18);
const comboT = mkText('', 15, 900, '#ffd23c', 2);
comboT.anchor.set(0.5, 0); comboT.position.set(W / 2, 42); comboT.visible = false;
const comboBar = new PIXI.Graphics();
comboBar.position.set(W / 2, 66); comboBar.visible = false;
const coinT = mkText('CR +0', 13, 700, '#ffd23c', 2, 'right');
coinT.anchor.set(1, 0); coinT.position.set(W - 22, 52);
let hpPips = [];
function buildHpPips () {
  for (const p of hpPips) { p.destroy(); }
  hpPips = [];
  for (let i = 0; i < player.hpMax; i++) {
    const p = new PIXI.Sprite(TEX[shipTexName(player.ship)]);
    p.anchor.set(0.5); p.scale.set(0.62);
    p.position.set(W - 30 - i * 34, 30);
    p.rotation = Math.PI / 2;
    crisp.addChild(p); hpPips.push(p);
  }
}
crisp.addChild(scoreT, bestT, gunT, waveT, comboT, comboBar, coinT);

function hudScore () {
  scoreT.text = 'SCORE ' + pad(S.score, 6);
  bestT.text = 'BEST ' + pad(S.bestBeaten ? S.score : S.best, 6);
  coinT.text = 'CR +' + S.runCoins;
}
function hudWave () { waveT.text = 'WAVE ' + Math.max(1, S.wave); }
function hudGun () { gunT.text = 'GUN ' + player.gun + ' — ' + CFG.gunTiers[player.gun - 1].name; }
function hudHP () { for (let i = 0; i < hpPips.length; i++) hpPips[i].alpha = i < player.hp ? 1 : 0.13; }

function hudCombo (dt) {
  if (S.combo > 0) {
    S.comboT -= dt;
    if (S.comboT <= 0) { S.combo = 0; }
  }
  const on = S.combo >= 2;
  comboT.visible = on; comboBar.visible = on;
  if (on) {
    const m = comboMult();
    comboT.text = 'COMBO ×' + m.toFixed(1);
    comboT.style.fill = m >= 3.5 ? '#ff2ec4' : '#ffd23c';
    const k = clamp(S.comboT / CFG.combo.window, 0, 1);
    comboBar.clear()
      .rect(-52, -1.5, 104, 3).fill({ color: 0xffffff, alpha: 0.10 })
      .rect(-52, -1.5, 104 * k, 3).fill({ color: m >= 3.5 ? 0xff2ec4 : 0xffd23c, alpha: 0.9 });
  }
}

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

/* ===== 10 OVERLAYS — game over / pause (Pixi) + title (DOM) ===== */
const overC = new PIXI.Container();
const pauseC = new PIXI.Container();
overlayRoot.addChild(overC, pauseC);
let overPromptT;

const overScore = mkText('', 26, 700, COL.text, 3);
const overBest = mkText('', 16, 500, COL.textDim, 2);
const overWave = mkText('', 14, 500, COL.textDim, 2);
const overCoins = mkText('', 14, 700, '#ffd23c', 2);
{
  const dim = new PIXI.Graphics().rect(0, 0, W, H).fill({ color: 0x05010a, alpha: 0.62 });
  overC.addChild(dim);
  const goMag = mkText('GAME OVER', 58, 900, '#ff2b4e', 5);
  goMag.anchor.set(0.5); goMag.position.set(W / 2 + 3, H * 0.28 + 3); goMag.alpha = 0.8; goMag.blendMode = 'add';
  const goCyan = mkText('GAME OVER', 58, 900, '#2cf6ff', 5);
  goCyan.anchor.set(0.5); goCyan.position.set(W / 2, H * 0.28);
  overScore.anchor.set(0.5); overScore.position.set(W / 2, H * 0.44);
  overBest.anchor.set(0.5); overBest.position.set(W / 2, H * 0.44 + 36);
  overWave.anchor.set(0.5); overWave.position.set(W / 2, H * 0.44 + 60);
  overCoins.anchor.set(0.5); overCoins.position.set(W / 2, H * 0.44 + 86);
  overPromptT = mkText('PRESS R OR CLICK TO RETRY — ESC FOR HANGAR', 15, 700, COL.text, 2);
  overPromptT.anchor.set(0.5); overPromptT.position.set(W / 2, H * 0.60);
  overC.addChild(goMag, goCyan, overScore, overBest, overWave, overCoins, overPromptT);
}
{
  const dim = new PIXI.Graphics().rect(0, 0, W, H).fill({ color: 0x05010a, alpha: 0.45 });
  pauseC.addChild(dim);
  const pt = mkText('PAUSED', 42, 900, '#2cf6ff', 8);
  pt.anchor.set(0.5); pt.position.set(W / 2, H * 0.42);
  const pp = mkText('CLICK OR P TO RESUME — Q TO QUIT TO HANGAR', 15, 500, COL.textDim, 3);
  pp.anchor.set(0.5); pp.position.set(W / 2, H * 0.42 + 48);
  pauseC.addChild(pt, pp);
}
function hideOverlays () { overC.visible = false; pauseC.visible = false; }

function showTitle () {
  hideOverlays();
  enemyPool.releaseAll(); ebPool.releaseAll(); bulletPool.releaseAll();
  pickupPool.releaseAll(); telePool.releaseAll();
  shipWrap.visible = false;
  playerSpr.visible = false;
  reticle.visible = false;
  S.mode = 'title';
  S.timescale = 1;
  const ui = document.getElementById('ui');
  if (ui) ui.style.display = 'block';
  renderTitle();
}
function toOver () {
  S.mode = 'over'; S.timescale = 1;
  const isBest = S.score > S.best && S.score > 0;
  if (isBest) {
    S.best = S.score;
    META.best = S.best;
  }
  META.coins += S.runCoins;
  saveMeta();
  overScore.text = 'SCORE ' + pad(S.score, 6);
  overBest.text = (S.bestBeaten ? '★ NEW BEST  ' : '') + 'BEST ' + pad(S.best, 6);
  overWave.text = 'REACHED WAVE ' + Math.max(1, S.wave);
  overCoins.text = 'BANKED + ' + S.runCoins + ' CR  ·  TOTAL ' + META.coins + ' CR';
  hudScore();
  overC.visible = true;
}
function setPause (v) {
  if (v && S.mode === 'playing') { S.mode = 'paused'; pauseC.visible = true; }
  else if (!v && S.mode === 'paused') { S.mode = 'playing'; pauseC.visible = false; }
}

/* --- title screen DOM: hangar + shop --- */
let shopMsgTimer = null;
function shopDeny (msg) {
  const el = document.getElementById('shopMsg');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = 1;
  if (shopMsgTimer) clearTimeout(shopMsgTimer);
  shopMsgTimer = setTimeout(() => { el.style.opacity = 0; }, 1400);
}
function renderTitle () {
  const st = document.getElementById('statline');
  st.innerHTML = 'BEST ' + pad(META.best, 6) + ' &nbsp;·&nbsp; <b>' + META.coins + ' CR</b>';
  const dp = document.getElementById('diffPills');
  dp.innerHTML = Object.keys(CFG.diff).map(k =>
    '<div class="pill' + (META.diff === k ? ' on' : '') + '" onclick="NVUI.setDiff(\'' + k + '\')">' +
    CFG.diff[k].label + '</div>').join('');
  const sc = document.getElementById('shipCards');
  sc.innerHTML = Object.keys(CFG.ships).map(id => {
    const s = CFG.ships[id];
    const owned = META.owned.includes(id);
    const eq = META.ship === id;
    let btn;
    if (eq) btn = '<button class="eqd" disabled>EQUIPPED</button>';
    else if (owned) btn = '<button class="own" onclick="NVUI.pickShip(\'' + id + '\')">EQUIP</button>';
    else btn = '<button onclick="NVUI.pickShip(\'' + id + '\')">BUY ' + s.cost + ' CR</button>';
    return '<div class="card' + (eq ? ' eq' : '') + '"><h4>' + s.name + '</h4>' +
      '<div class="st">' + s.flavor + '<br>' + s.stats + '</div>' + btn + '</div>';
  }).join('');
  const ur = document.getElementById('upgRow');
  ur.innerHTML = Object.keys(CFG.upgrades).map(id => {
    const u = CFG.upgrades[id];
    const owned = !!META.upg[id];
    return '<div class="upg' + (owned ? ' owned' : '') + '"><h5>' + u.name + '</h5>' +
      '<div class="st">' + u.desc + '</div>' +
      (owned ? '<button class="owned" disabled>INSTALLED</button>'
             : '<button onclick="NVUI.buyUpg(\'' + id + '\')">BUY ' + u.cost + ' CR</button>') +
      '</div>';
  }).join('');
  const af = document.getElementById('afToggle');
  if (af) af.checked = META.autoFire;
}
window.NVUI = {
  setDiff (k) { if (!CFG.diff[k]) return; META.diff = k; saveMeta(); renderTitle(); A.init(); A.ui(); },
  pickShip (id) {
    const s = CFG.ships[id];
    if (!s) return;
    A.init();
    if (META.owned.includes(id)) {
      META.ship = id;
      saveMeta(); renderTitle(); A.ui();
    } else if (META.coins >= s.cost) {
      META.coins -= s.cost;
      META.owned.push(id);
      META.ship = id;
      saveMeta(); renderTitle(); A.gun();
      addTrauma(0.12);
    } else {
      shopDeny('NOT ENOUGH CR — NEED ' + (s.cost - META.coins) + ' MORE');
      A.ui();
    }
  },
  buyUpg (id) {
    const u = CFG.upgrades[id];
    if (!u || META.upg[id]) return;
    A.init();
    if (META.coins >= u.cost) {
      META.coins -= u.cost;
      META.upg[id] = true;
      saveMeta(); renderTitle(); A.gun();
      addTrauma(0.12);
    } else {
      shopDeny('NOT ENOUGH CR — NEED ' + (u.cost - META.coins) + ' MORE');
      A.ui();
    }
  },
  setAF (v) { META.autoFire = !!v; saveMeta(); },
  start () { startRun(); },
};

/* ===== 11 AUDIO — Web Audio synth, zero files ===== */
const A = (() => {
  let ctx = null, master = null, noiseBuf = null;
  let muted = !!META.muted;
  function init () {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : CFG.audio.master;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5 | 0, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function resume () { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function tone ({ type, f0, f1, dur, vol, at }) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + (at || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function noise ({ dur, vol, lp0, lp1, at }) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + (at || 0);
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
    shoot (gun) {
      const c = CFG.audio.shoot;
      tone({ type: c.type, f0: c.f0 * (1 + gun * 0.07) * rand(0.94, 1.06), f1: c.f0 * c.fMul, dur: c.dur, vol: c.vol });
    },
    kill ()  { const c = CFG.audio.kill; noise(c.noise); tone(c.tone); },
    hurt ()  { const c = CFG.audio.hurt; tone(c.tone); noise(c.noise); },
    coin ()  { for (const t of CFG.audio.coin.tones) tone(t); },
    gun ()   { const c = CFG.audio.gun; tone(c.tone); noise(c.noise); },
    heal ()  { for (const t of CFG.audio.heal.tones) tone(t); },
    ui ()    { tone(CFG.audio.ui.tone); },
    boom ()  { const c = CFG.audio.boom; noise(c.noise); tone(c.tone); },
    tier ()  { for (const t of CFG.audio.tier.tones) tone(t); },
    toggleMute () {
      muted = !muted;
      META.muted = muted; saveMeta();
      if (master) master.gain.value = muted ? 0 : CFG.audio.master;
      return muted;
    },
    setMuted (m) { muted = !!m; if (master) master.gain.value = muted ? 0 : CFG.audio.master; },
    get muted () { return muted; },
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
  } else if (e.code === 'KeyF') {
    META.autoFire = !META.autoFire; saveMeta();
    popup(M.x, M.y - 20, 'AUTO-FIRE ' + (META.autoFire ? 'ON' : 'OFF'), COL.textDim, 13);
    A.ui();
  } else if ((S.mode === 'title') && (e.code === 'Space' || e.code === 'Enter')) startRun();
  else if ((S.mode === 'over') && (e.code === 'KeyR' || e.code === 'Space' || e.code === 'Enter')) startRun();
  else if (S.mode === 'over' && e.code === 'Escape') showTitle();
  else if (S.mode === 'paused' && e.code === 'KeyQ') showTitle();
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
// audio unlock from the DOM menu too
window.addEventListener('pointerdown', () => { A.init(); A.resume(); }, { capture: true });

// static menu controls — start button + auto-fire toggle
const startBtnEl = document.getElementById('startBtn');
if (startBtnEl) startBtnEl.addEventListener('click', () => { A.init(); A.resume(); startRun(); });
const afToggleEl = document.getElementById('afToggle');
if (afToggleEl) afToggleEl.addEventListener('change', e => { if (window.NVUI) NVUI.setAF(e.target.checked); });

/* ===== 13 RUN CONTROL + MAIN LOOP ===== */
function startRun () {
  hideOverlays();
  const ui = document.getElementById('ui');
  if (ui) ui.style.display = 'none';
  S.score = 0; S.kills = 0; S.bestBeaten = false; S.wave = 0; S.tier = 1;
  S.runCoins = 0; S.combo = 0; S.comboT = 0;
  S.timescale = 1; S.hitstop = 0; S.trauma = 0; S.flashA = 0;
  S.gridPulse = 0; S.dyingT = 0; S.rgbT = 0;
  bulletPool.releaseAll(); ebPool.releaseAll();
  partPool.releaseAll(); ringPool.releaseAll();
  ghostPool.releaseAll(); popupPool.releaseAll(); telePool.releaseAll();
  enemyPool.releaseAll(); pickupPool.releaseAll();
  playerReset();
  buildHpPips();
  hudScore(); hudHP(); hudGun();
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
  reticle.visible = S.mode === 'playing' || S.mode === 'dying' || S.mode === 'paused';
  reticle.alpha = 0.7 + 0.3 * Math.sin(S.time * 6);
  reticle.rotation = S.time * 0.6;

  if (S.mode === 'playing') {
    playerUpdate(dt);
    updateBullets(dt);
    updateEBullets(dt);
    updateTeles(dt);
    updateEnemies(dt);
    collideBullets();
    updatePickups(dt);
    wavesUpdate(dt);
    hudCombo(dt);
  } else if (S.mode === 'dying') {
    updateBullets(dt); updateEBullets(dt); updateTeles(dt);
    updateEnemies(dt); collideBullets(); updatePickups(dt);
    S.dyingT -= rawDt;
    if (S.dyingT <= 0) toOver();
  } else if (S.mode === 'over') {
    updateBullets(dt); updateEBullets(dt); updateEnemies(dt); updatePickups(dt);
  }

  updateParticles(dt); updateRings(dt); updateGhosts(dt); updatePopups(dt);
  updateShipTrail(dt);
  updateBanner(dt);

  if (overC.visible) overPromptT.alpha = 0.55 + 0.45 * Math.sin(S.time * 4.2);
});

// Dev hooks (?debug=1)
if (location.search.includes('debug')) {
  window.NV = {
    app, S, CFG, META, player, DIFF,
    pools: { bullet: bulletPool, eb: ebPool, enemy: enemyPool, pickup: pickupPool,
             tele: telePool, part: partPool, ring: ringPool, ghost: ghostPool, popup: popupPool },
    spawnEnemy, startRun, showTitle, toOver,
    Wv, startWave, telegraphSpawn,
    killAll: () => { enemyPool.releaseAll(); telePool.releaseAll(); ebPool.releaseAll(); },
    giveGun: n => { player.gun = clamp(n || player.gun + 1, 1, 5); S.gun = player.gun; hudGun(); },
    addCR: n => { S.runCoins += (n || 50); hudScore(); },
    addCoins: n => { META.coins += (n || 100); saveMeta(); renderTitle(); },
    forceKill: () => { for (const d of enemyPool.items) if (d.active) killEnemy(d, true); },
    hitMe: () => playerHit(1, 0),
  };
}

resize();
hudScore(); hudHP();
showTitle();

})().catch(err => {
  console.error('[NeonVoid] boot failure:', err);
  const el = document.getElementById('boot-error');
  if (el) { el.style.display = 'flex'; el.innerHTML += '<br><small>' + (err && err.message ? err.message : err) + '</small>'; }
});

