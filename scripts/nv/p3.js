
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
