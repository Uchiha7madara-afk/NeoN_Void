
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
  hudScore();
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
