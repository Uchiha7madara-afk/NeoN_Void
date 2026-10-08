#!/usr/bin/env bash
# PHASE 2A.2 — SPINNER ENEMY E2E v2 (state-driven polling; headless frame time varies 300-450ms)
# Trick: windUpMs stretched to 30s to hold the charge open for probing, then
# restored to 500ms to test the real spray beat deterministically.
# NOTE: dt is clamped to 34ms/tick, so game-time ratios (spin rates, ring
# growth) are exact regardless of headless fps. Angle compares are mod 2pi
# (spray angles can exceed pi). The gap-shift test forces EXACTLY one spray.
set -e
AB="agent-browser"
URL="file:///home/z/my-project/download/neon-void/index.html?debug=1"
SC="NV.CFG.enemies.spinner"

poll () {  # $1 = JS expr returning bool, $2 = max tries, $3 = ms per try
  local i R
  for i in $(seq 1 "$2"); do
    R=$($AB eval "($1) ? 'Y' : 'N'" 2>/dev/null | tr -d '"')
    if [ "$R" = "Y" ]; then echo "  (condition met after $i poll(s))"; return 0; fi
    $AB wait "$3" >/dev/null
  done
  echo "  TIMEOUT: $1"; return 1
}

echo "== 1) boot + config sanity =="
$AB open "$URL" >/dev/null
$AB wait 2500
$AB eval "JSON.stringify({ hp: $SC.hp, speed: $SC.speed, driftTimeMs: $SC.driftTimeMs, windUpMs: $SC.windUpMs, sprayRecoveryMs: $SC.sprayRecoveryMs, bulletCount: $SC.bulletCount, bulletSpeed: $SC.bulletSpeed, spinRateIdle: $SC.spinRateIdle, spinRateWindup: $SC.spinRateWindup, chargeRingRadius: $SC.chargeRingRadius, chargeRingAlpha: $SC.chargeRingAlpha, colorPrimary: $SC.colorPrimary.toString(16), colorBullet: $SC.colorBullet.toString(16), radius: $SC.radius, oldFlatSpinnerGone: NV.CFG.spinner === undefined, colSpinnerSourced: NV.CFG.colors.spinner === $SC.colorPrimary, weight: NV.CFG.waves.weights.spinner, unlockSpinner: NV.CFG.waves.unlock.spinner, sbulletTex: !!NV.TEX.sbullet, spinnerTexSmallerThanDrone: NV.TEX.spinner.width < NV.TEX.drone.width, sbulletSmallerThanHbullet: NV.TEX.sbullet.width < NV.TEX.hbullet.width, spinnerRingsState: NV.S.spinnerRings })"

echo "== 2) spawn ratio: wave1 zero spinners, wave5 ~1 spinner per 6 drones =="
$AB eval "(function(){ let w1 = 0; for (let i = 0; i < 20; i++) w1 += NV.buildQueue(6, 1).filter(k => k === 'spinner').length; let w5s = 0, w5d = 0; for (let i = 0; i < 80; i++) { const q = NV.buildQueue(19, 5); w5s += q.filter(k => k === 'spinner').length; w5d += q.filter(k => k === 'drone').length; } const ratio = w5s / Math.max(1, w5d); return JSON.stringify({ wave1: { spinners: w1, zeroSpinners: w1 === 0 }, wave5: { spinners: w5s, drones: w5d, ratio: +ratio.toFixed(3), target: 0.167, inBand: ratio > 0.11 && ratio < 0.23 } }); })()"

echo "== 3) controlled field + stretched windup for probing =="
$AB eval "(function(){ NV.startRun(); NV.killAll(); NV.Wv.queue.length = 0; NV.Wv.phase = 'breather'; NV.Wv.breatherT = 9999; $SC.windUpMs = 30000; return JSON.stringify({ mode: NV.S.mode, windUpStretched: $SC.windUpMs === 30000, hp: NV.player.hp }); })()"
$AB wait 600

echo "== 4) spawn -> DRIFT: lazy speed 40, NOT chasing, sprite rotating =="
$AB eval "(function(){ NV.spawnEnemy('spinner', NV.player.x + 300, NV.player.y + 240); return 'spinner spawned off-corner'; })()"
poll "NV.spinnerState().length === 1 && NV.spinnerState()[0].st === 'drift'" 20 400
$AB eval "(function(){ const s = NV.spinnerState()[0]; const d = NV.spinners()[0]; window.__dist0 = Math.hypot(NV.player.x - d.x, NV.player.y - d.y); window.__t0 = NV.S.time; window.__rot0 = s.rotA; return JSON.stringify({ st: s.st, speedNow: +Math.hypot(d.vx, d.vy).toFixed(1), driftA: s.driftA, distToPlayer: Math.round(window.__dist0) }); })()"
$AB wait 1500
$AB eval "(function(){ const s = NV.spinnerState()[0]; const d = NV.spinners()[0]; const dist = Math.hypot(NV.player.x - d.x, NV.player.y - d.y); const gameDt = NV.S.time - window.__t0; const rotRate = (s.rotA - window.__rot0) / gameDt; return JSON.stringify({ stillDrift: s.st === 'drift', speedBand: Math.hypot(d.vx, d.vy) > 20 && Math.hypot(d.vx, d.vy) < 60, notApproaching: Math.abs(dist - window.__dist0) < 60, distNow: Math.round(dist), idleSpinRate: +rotRate.toFixed(2), idleRateBand: rotRate > 1.2 && rotRate < 3.8, idleRateTarget: +(NV.CFG.enemies.spinner.spinRateIdle * Math.PI * 2).toFixed(2) }); })()"

echo "== 5) DRIFT -> WINDUP: planted + halo + ring tracks the exact formula =="
poll "NV.spinnerState()[0].st === 'windup'" 45 400
$AB eval "(function(){ const s = NV.spinnerState()[0]; const d = NV.spinners()[0]; const prog = 1 - d.wT / (NV.CFG.enemies.spinner.windUpMs / 1000); const expectedR = NV.CFG.enemies.spinner.chargeRingRadius * (0.35 + 0.65 * prog); window.__tW = NV.S.time; window.__rotW = s.rotA; return JSON.stringify({ st: s.st, planted: Math.hypot(d.vx, d.vy) < 30, haloVisible: s.haloVisible, spinnerRings: NV.S.spinnerRings, ringR: s.ringR, ringA: s.ringA, ringMatchesFormula: Math.abs(s.ringR - expectedR) < 1.0, ringAinBand: s.ringA > 0 && s.ringA <= NV.CFG.enemies.spinner.chargeRingAlpha + 0.01 }); })()"
$AB screenshot /home/z/my-project/scripts/nv/phase2a2_charge_ring.png || true
$AB wait 1200
$AB eval "(function(){ const s = NV.spinnerState()[0]; const gameDt = NV.S.time - window.__tW; const rotRate = (s.rotA - window.__rotW) / gameDt; const growthPerGameSec = (s.ringR - window.__ringR0b) / gameDt; return JSON.stringify({ stillWindup: s.st === 'windup', windupSpinRate: +rotRate.toFixed(2), windupRateBand: rotRate > 8, windupRateTarget: +(NV.CFG.enemies.spinner.spinRateWindup * Math.PI * 2).toFixed(2), ringR: s.ringR, ringRising: s.ringR > 14.0, ringRadius: s.ringR <= NV.CFG.enemies.spinner.chargeRingRadius + 0.5 }); })()"

echo "== 6) restore windUpMs -> spray fires: 8 orbs AT ONCE, ring gone same frame =="
$AB eval "(function(){ $SC.windUpMs = 500; NV.spinners()[0].wT = 0.04; return 'windUp restored 500ms, wT armed to 40ms'; })()"
poll "NV.spinnerState()[0].st === 'spray' && NV.pools.eb.items.filter(x => x.active && x.tint === $SC.colorBullet).length >= 8" 25 400
$AB eval "(function(){ const s = NV.spinnerState()[0]; const orbs = NV.pools.eb.items.filter(x => x.active && x.tint === $SC.colorBullet); const TAU = Math.PI * 2; const wrapDiff = (a, b) => { let d = Math.abs(a - b) % TAU; return d > Math.PI ? TAU - d : d; }; const angs = orbs.map(o => Math.atan2(o.vy, o.vx)).sort((a, b) => a - b); let minGap = 9, maxGap = 0; for (let i = 1; i < angs.length; i++) { const g = angs[i] - angs[i-1]; if (g < minGap) minGap = g; if (g > maxGap) maxGap = g; } const speeds = orbs.map(o => +Math.hypot(o.vx, o.vy).toFixed(1)); return JSON.stringify({ inSprayState: s.st === 'spray', orbCount: orbs.length, exactly8: orbs.length === NV.CFG.enemies.spinner.bulletCount, allCometTex: orbs.every(o => o.texture === NV.TEX.sbullet), rotLockedMod2pi: orbs.every(o => wrapDiff(o.rotation, Math.atan2(o.vy, o.vx)) < 1e-6), evenSpacing: minGap > Math.PI/4 - 0.05 && maxGap < Math.PI/4 + 0.05, speedMin: Math.min(...speeds), speedMax: Math.max(...speeds), speedBand: speeds.every(v => v > 168 && v < 195), dmg: orbs[0].dmg, spinnerRingsAfterFire: NV.S.spinnerRings, ringGone: NV.S.spinnerRings === 0, recoveryTicking: s.cT > 0 && s.cT <= NV.CFG.enemies.spinner.sprayRecoveryMs / 1000 }); })()"
$AB screenshot /home/z/my-project/scripts/nv/phase2a2_spray.png || true

echo "== 6b) spray orbs pass THROUGH enemies (never collide) =="
$AB eval "(function(){ NV.spawnEnemy('drone', NV.spinners()[0].x + 60, NV.spinners()[0].y); const orb = NV.pools.eb.items.find(x => x.active && x.tint === $SC.colorBullet); const drone = NV.pools.enemy.items.find(d => d.active && d.kind === 'drone'); orb.x = drone.x - 6; orb.y = drone.y; window.__droneHp = drone.hp; return 'orb placed just off a fresh drone, flying through it'; })()"
$AB wait 900
$AB eval "(function(){ const drone = NV.pools.enemy.items.find(d => d.active && d.kind === 'drone'); const orb = NV.pools.eb.items.find(x => x.active && x.tint === $SC.colorBullet); return JSON.stringify({ orbStillAlive: !!orb, orbPassed: !orb || Math.abs(orb.x - (drone ? drone.x : -999)) > 20, droneHpUnchanged: drone && drone.hp === window.__droneHp, droneHp: drone ? drone.hp : 'gone' }); })()"

echo "== 7) gap shift: forced single spray advances sprA by EXACTLY half a gap =="
$AB eval "(function(){ NV.pools.eb.releaseAll(); const d = NV.spinners()[0]; if (!d) return 'SPINNER GONE'; window.__sA = d.sprA; d.st = 'windup'; d.wT = 0.001; return 'sprA_before=' + window.__sA.toFixed(6) + ', forced exactly-one windup'; })()"
poll "NV.spinnerState()[0].st === 'spray'" 25 400
$AB eval "(function(){ const d = NV.spinners()[0]; const delta = d.sprA - window.__sA; const expected = (Math.PI * 2 / NV.CFG.enemies.spinner.bulletCount) * 0.5; return JSON.stringify({ sprA_before: +window.__sA.toFixed(6), sprA_after: +d.sprA.toFixed(6), delta: +delta.toFixed(6), expected: +expected.toFixed(6), gapShiftExact: Math.abs(delta - expected) < 1e-6, oneSprayOnly: NV.pools.eb.items.filter(x => x.active && x.tint === $SC.colorBullet).length === NV.CFG.enemies.spinner.bulletCount }); })()"

echo "== 8) spinner orb damages the player (single-orb isolation) =="
$AB eval "(function(){ NV.player.hp = 3; const orbs = NV.pools.eb.items.filter(x => x.active && x.tint === $SC.colorBullet); for (let i = 1; i < orbs.length; i++) NV.pools.eb.release(orbs[i]); const o = orbs[0]; if (!o) return 'NO ORB'; o.x = NV.player.x; o.y = NV.player.y; return 'kept exactly one orb, teleported onto player'; })()"
poll "NV.player.hp === 2" 20 400
$AB eval "JSON.stringify({ hp: NV.player.hp, orbConsumed: NV.pools.eb.items.filter(x => x.active && x.tint === $SC.colorBullet).length === 0 })"

echo "== 9) kill DURING windup: clean cancel, no orphan ring/bullet, yellow pop =="
$AB eval "(function(){ NV.killAll(); NV.player.hp = 3; NV.spawnEnemy('spinner', NV.player.x - 240, NV.player.y - 160); window.__s0 = NV.S.score; return 'fresh spinner for the cancel test'; })()"
poll "NV.spinnerState().length === 1 && NV.spinnerState()[0].st === 'windup'" 45 400
$AB eval "(function(){ const s = NV.spinnerState()[0]; return JSON.stringify({ winding: s.st === 'windup', ringLive: NV.S.spinnerRings === 1, noOrphanBulletYet: NV.pools.eb.items.filter(x => x.active && x.tint === $SC.colorBullet).length === 0 }); })()"
$AB eval "(function(){ const d = NV.spinners()[0]; d.hp = 1; NV.forceKill(); return JSON.stringify({ pending: NV.pendingKills.length, corpseDying: NV.spinners().every(x => x.dying) }); })()"
$AB wait 1400
$AB eval "(function(){ const yellow = NV.pools.part.items.filter(p => p.active && p.tint === $SC.colorPrimary).length; const gain = NV.S.score - window.__s0; return JSON.stringify({ pendingResolved: NV.pendingKills.length === 0, spinnerGone: NV.spinners().length === 0, noOrphanRing: NV.S.spinnerRings === 0, noOrphanBullet: NV.pools.eb.items.filter(x => x.active && x.tint === $SC.colorBullet).length === 0, scoreGain: gain, scored400: gain === 400, yellowBurstParticles: yellow, popFired: yellow >= 8 }); })()"

echo "== 10) hp 3 via real hitEnemy route: survives 1, survives 2, dies on 3 =="
$AB eval "(function(){ NV.killAll(); NV.spawnEnemy('spinner', NV.player.x + 260, NV.player.y + 100); return 'fresh spinner for hp test'; })()"
poll "NV.spinnerState().length === 1" 20 400
$AB eval "(function(){ const d = NV.spinners()[0]; d.vx = 0; d.vy = 0; const r0 = d.hp; NV.hitEnemy(d, 1, 0, 1); const s1 = d.hp === r0 - 1 && !d.dying; NV.hitEnemy(d, 1, 0, 1); const s2 = d.hp === r0 - 2 && !d.dying; NV.hitEnemy(d, 1, 0, 1); const s3 = d.hp <= 0 && d.dying; return JSON.stringify({ hp0: r0, survivesHit1: s1, survivesHit2: s2, diesHit3: s3 }); })()"
$AB wait 1200
$AB eval "JSON.stringify({ pendingResolved: NV.pendingKills.length === 0, spinnerGone: NV.spinners().length === 0 })"

echo "== 11) wall bounce: heading reflects at the boundary =="
$AB eval "(function(){ NV.killAll(); NV.spawnEnemy('spinner', 30, 400); const d = NV.spinners()[0]; d.driftA = Math.PI; d.vx = 0; d.vy = 0; d.st = 'drift'; d.dT = 9; return 'spinner pinned near left wall, heading due west'; })()"
poll "NV.spinnerState()[0] && Math.cos(NV.spinnerState()[0].driftA) > 0.9" 20 400
$AB eval "JSON.stringify({ driftAFlipped: 'yes', driftA: NV.spinnerState()[0].driftA, st: NV.spinnerState()[0].st })"

echo "== 12) restart hygiene: wave1 = drones only, no rings, no spinners =="
$AB eval "NV.startRun(); 'fresh run'"
$AB wait 900
$AB eval "JSON.stringify({ spinners: NV.spinners().length, spinnerRings: NV.S.spinnerRings, wave1QueueAllDrones: NV.Wv.queue.every(k => k === 'drone'), mode: NV.S.mode })"

echo "== console errors =="
$AB errors || true
echo "== DONE =="
