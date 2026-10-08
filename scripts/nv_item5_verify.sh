#!/usr/bin/env bash
# ITEM 5 — DEATH & RESTART E2E v2 (headless ~3fps; 1 rendered frame ~= 280-330ms, dt capped 34ms)
# Real-time durations stretch ~9-10x wall-clock: slowMo 500ms raw ~= 4.5-5s wall, wipe 100ms raw ~= 1s wall.
set -e
AB="agent-browser"
URL="file:///home/z/my-project/download/neon-void/index.html?debug=1"

echo "== boot =="
$AB open "$URL" >/dev/null
$AB wait 2500
$AB eval "JSON.stringify({ bootBest: NV.META.best, headWidth: NV.CFG.juice.bullet.headWidth, tailWidth: NV.CFG.juice.bullet.tailWidth, streakTexW: NV.TEX.bullet.width, streakTexW_logical_expected: 8 + NV.CFG.juice.bullet.trailLength })"

echo "== run start + score set BEFORE death (toOver must capture it) =="
$AB eval "(function(){ NV.startRun(); NV.S.score = 9000; return 'run, score 9000'; })()"
$AB wait 1200

echo "== a) death beat: forceDie -> slow-mo, NO hit-stop, NO trauma/kill-shake, vignette, 25 cyan =="
$AB eval "(function(){ window.__pre = { parts: NV.pools.part.countActive(), trauma: +NV.S.trauma.toFixed(4), kMag: NV.S.kMag }; NV.forceDie(); const boom = NV.pools.part.items.filter(p => p.active && p.tint === NV.player.ship.color && p.maxLife >= 0.6 && p.maxLife <= 1.0 && p.texture === NV.TEX.dot); return JSON.stringify({ mode: NV.S.mode, timescale: NV.S.timescale, dyingT: +NV.S.dyingT.toFixed(3), hitstop: NV.S.hitstop, vigA: +NV.S.vigA.toFixed(2), vigSpr: +NV.vignetteSpr.alpha.toFixed(2), boomCount: boom.length, expected: NV.CFG.juice.death.explosionCount, boomIsDotTex: boom.every(p => p.texture === NV.TEX.dot), speedBand: boom.every(p => Math.hypot(p.vx, p.vy) <= NV.CFG.juice.death.explosionSpeedMax + 1), partsDelta: NV.pools.part.countActive() - __pre.parts, traumaDelta: +(NV.S.trauma - __pre.trauma).toFixed(4), kMagDelta: NV.S.kMag - __pre.kMag, alive: NV.player.alive, score: NV.S.score }); })()"

echo "== a2) during slow-mo: in-world kill pops (shake+score) but hit-stop suppressed =="
$AB wait 1000
$AB eval "(function(){ const km0 = NV.S.kMag; NV.spawnEnemy('drone', 300, 150); NV.forceKill(); return JSON.stringify({ killShake_same_tick: NV.S.kMag, km0: km0, shakeIs6: NV.S.kMag >= 6, mode: NV.S.mode }); })()"
$AB wait 1300
$AB eval "JSON.stringify({ mode: NV.S.mode, dyingT: +NV.S.dyingT.toFixed(3), hitstop_during_death_beat: NV.S.hitstop, pendingResolved: NV.pendingKills.length === 0, scoreAfterPop: NV.S.score })"

echo "== b) game over: slam armed deterministically -> big shake on impact =="
$AB wait 4200
$AB eval "JSON.stringify({ mode: NV.S.mode, overVisible: NV.over.c.visible, slamT: +NV.S.slamT.toFixed(3), countTo: NV.S.countTo })"
$AB eval "(function(){ NV.S.slamT = 0; NV.S.slamHit = false; return 'slam armed'; })()"
$AB wait 2000
$AB eval "JSON.stringify({ slamHit: NV.S.slamHit, kMag_mid_decay: +NV.S.kMag.toFixed(2), kMag_le14: NV.S.kMag <= NV.CFG.juice.death.gameOverShake, kAngDown: Math.abs(NV.S.kAng - Math.PI / 2) <= 0.13, goY: NV.over.go.y, goAlpha: +NV.over.go.alpha.toFixed(2), overCAlpha: +NV.over.c.alpha.toFixed(2) })"
$AB wait 1800
$AB eval "JSON.stringify({ shakeSettled: NV.S.kMag === 0, goY_landed: NV.over.go.y === 0 })"

echo "== b2) score counts UP 0 -> final (real time), BEST line + localStorage =="
$AB eval "(function(){ NV.S.countT = 0.1; return 'countup armed at k=0.25'; })()"
$AB wait 600
$AB eval "(function(){ const v = parseInt(NV.over.score.text, 10); return JSON.stringify({ midCount: v, inRange: v > 0 && v < 9100 }); })()"
$AB wait 4200
$AB eval "JSON.stringify({ final: NV.over.score.text, final_expected: '009100', best: NV.over.best.text, best_expected: 'BEST 009100', wave: NV.over.wave.text, metaBest: NV.META.best, label: NV.over.label.text })"

echo "== b3) NEW BEST! gold pulse -> holds solid =="
$AB eval "JSON.stringify({ visible: NV.over.newBest.visible, gold: NV.over.newBest.style.fill === '#ffd23c' })"
$AB eval "(function(){ NV.S.nbT = 0.02; return 'pulse armed'; })()"
$AB wait 400
$AB eval "(function(){ const a = NV.over.newBest.alpha; return JSON.stringify({ midPulse: +a.toFixed(3), pulsing: a > 0.3 && a < 1 }); })()"
$AB wait 8800
$AB eval "JSON.stringify({ holdsAt1: NV.over.newBest.alpha === 1, promptAlpha: +NV.over.prompt.alpha.toFixed(2), promptInRange: NV.over.prompt.alpha >= 0.5 && NV.over.prompt.alpha <= 1.0 })"

echo "== b4) grid holds its breath: baseline FROZEN on the over screen =="
$AB eval "(function(){ window.__g1 = NV.S.gridBase; return 'base1 ' + __g1.toFixed(6); })()"
$AB wait 1500
$AB eval "JSON.stringify({ base1: +__g1.toFixed(6), base2: +NV.S.gridBase.toFixed(6), frozen: Math.abs(NV.S.gridBase - __g1) < 1e-9 })"
$AB screenshot /home/z/my-project/scripts/nv/item5_over.png || true

echo "== c) restart: band wipe, mash guard, full reset, ship fade-in =="
$AB eval "(function(){ NV.beginRestart(); const p1 = NV.RS.phase; NV.beginRestart(); const p2 = NV.RS.phase; return JSON.stringify({ phase: p1, mashGuardHeld: p1 === p2 && p1 === 'in', wipeVisible: NV.wipeG.visible }); })()"
$AB wait 500
$AB screenshot /home/z/my-project/scripts/nv/item5_wipe.png || true
$AB wait 1100
$AB eval "(function(){ const sf = NV.S.shipFade; return JSON.stringify({ mode_after_cover: NV.S.mode, phase: NV.RS.phase, shipFade: +sf.toFixed(2), fadeRampingOrDone: (NV.RS.phase === 'out' ? sf < 1 : sf === 1), reset: { score: NV.S.score, hp: NV.player.hp, alive: NV.player.alive, vigA: NV.S.vigA, kMag: NV.S.kMag, pend: NV.pendingKills.length, wave: NV.S.wave, enemies: NV.pools.enemy.countActive() } }); })()"
$AB wait 1600
$AB eval "JSON.stringify({ phase: NV.RS.phase, wipeGone: !NV.wipeG.visible, shipFade: NV.S.shipFade, flying: NV.S.mode === 'playing' && NV.player.alive })"

echo "== c2) wave-1 score-0 death: everything still shows, no NEW BEST =="
$AB eval "NV.startRun(); 'fresh run'"
$AB wait 800
$AB eval "(function(){ NV.forceDie(); return JSON.stringify({ score: NV.S.score, mode: NV.S.mode }); })()"
$AB wait 5200
$AB eval "JSON.stringify({ mode: NV.S.mode, overVisible: NV.over.c.visible, scoreShown: NV.over.score.text, waveShown: NV.over.wave.text, goAlpha: +NV.over.go.alpha.toFixed(2), newBestHidden: !NV.over.newBest.visible })"

echo "== console errors =="
$AB errors || true
echo "== DONE =="
