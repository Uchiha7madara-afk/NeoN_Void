#!/usr/bin/env bash
# ITEM 4 — BULLET FEEL E2E (headless ~3fps; 1 rendered frame ~= 330ms real, dt capped 34ms)
# + ITEM 3 hotfix check: grid baseline = max(breath, combat), never dims below idle.
set -e
AB="agent-browser"
URL="file:///home/z/my-project/download/neon-void/index.html?debug=1"

echo "== boot =="
$AB open "$URL" >/dev/null
$AB wait 2500

echo "== ITEM3 hotfix A: single drone -> grid stays in breath band (0.6..0.8), never dims =="
$AB eval "NV.startRun(); 'run'"
$AB wait 400
$AB eval "NV.killAll(); NV.Wv.phase = 'breather'; NV.Wv.breatherT = 999; NV.spawnEnemy('drone', 900, 200); 'single drone, waves parked'"
$AB wait 2500
$AB eval "JSON.stringify({ n: NV.pools.enemy.countActive(), base: +NV.S.gridBase.toFixed(3), breathBand: '0.6..0.8' })"

echo "== ITEM3 hotfix B: 20 drones -> combat (0.9) must still win over breath (max 0.8) =="
$AB eval "(function(){ NV.killAll(); for (let i = 0; i < 20; i++) NV.spawnEnemy('drone', 120 + (i % 10) * 100, 150 + ((i / 10) | 0) * 180); return 'swarm 20'; })()"
$AB wait 2500
$AB eval "JSON.stringify({ n: NV.pools.enemy.countActive(), base: +NV.S.gridBase.toFixed(3), expectAbove: 0.8 })"

echo "== b) trail: bullets are streak textures aligned with travel =="
$AB eval "NV.killAll(); NV.M.x = 1050; NV.M.y = 250; NV.META.autoFire = true; 'firing right'"
$AB wait 1500
$AB eval "(function(){ const b = NV.pools.bullet.items.find(b => b.active); return JSON.stringify({ bullets: NV.pools.bullet.countActive(), texW: b ? b.texture.width : 0, oldPillWas: 28, rot: b ? +b.rotation.toFixed(3) : 0, velAng: b ? +Math.atan2(b.vy, b.vx).toFixed(3) : 0 }); })()"
$AB screenshot /home/z/my-project/scripts/nv/item4_bullets.png || true

echo "== a) muzzle flash: white pooled flicker, decays over 3 frames =="
$AB eval "(function(){ NV.muzzleFlash(640, 300); const m = NV.pools.muzzle.items.find(m => m.active); return JSON.stringify({ count: NV.pools.muzzle.countActive(), alpha0: m ? +m.alpha.toFixed(2) : 0, white: m ? m.tint === 0xffffff : false, frames: m ? m.t0 : 0 }); })()"
$AB wait 400
$AB eval "(function(){ const m = NV.pools.muzzle.items.find(m => m.active); return JSON.stringify({ alpha_f2: m ? +m.alpha.toFixed(2) : 'gone', t: m ? m.t : 0 }); })()"
$AB wait 800
$AB eval "JSON.stringify({ muzzles_left: NV.pools.muzzle.countActive() })"

echo "== d) recoil: sprite-only, opposite aim, ship position never walks =="
$AB eval "(function(){ const dx = NV.shipWrap.x - NV.player.x, dy = NV.shipWrap.y - NV.player.y; const a = NV.player.angle; const along = dx * Math.cos(a) + dy * Math.sin(a); const px = NV.player.x, py = NV.player.y; return JSON.stringify({ mag: +Math.hypot(dx, dy).toFixed(2), along: +along.toFixed(2), recT: +NV.player.recT.toFixed(3), cap: NV.CFG.juice.bullet.recoilPx }); })()"
$AB eval "NV.META.autoFire = false; 'stopped'"
$AB wait 1600
$AB eval "(function(){ const dx = NV.shipWrap.x - NV.player.x, dy = NV.shipWrap.y - NV.player.y; return JSON.stringify({ mag_after_stop: +Math.hypot(dx, dy).toFixed(3), recT: NV.player.recT }); })()"

echo "== a2) inputs paused during hit-stop: fireCd frozen -> no NEW muzzle in freeze =="
$AB eval "NV.killAll(); NV.META.autoFire = true; NV.S.hitstop = 2; 'freeze 2s while holding fire'"
$AB wait 1600
$AB eval "JSON.stringify({ hitstop: +NV.S.hitstop.toFixed(2), muzzles_during_freeze: NV.pools.muzzle.countActive() })"
$AB eval "NV.S.hitstop = 0; NV.META.autoFire = false; 'unfrozen'"

echo "== c) impact spark: exactly N white shards, 150ms, spraying back =="
$AB eval "(function(){ const n0 = NV.pools.part.countActive(); NV.impactSpark(NV.player.x + 120, NV.player.y, 300, 0); const ps = NV.pools.part.items.filter(p => p.active && Math.abs(p.maxLife - 0.15) < 1e-6); return JSON.stringify({ emitted: NV.pools.part.countActive() - n0, expected: NV.CFG.juice.bullet.impactParticleCount, allWhite: ps.length === NV.CFG.juice.bullet.impactParticleCount && ps.every(p => p.tint === 0xffffff), life: ps.length ? +ps[0].maxLife.toFixed(3) : 0 }); })()"

echo "== c2) integration: tank eats hits — hp drops, survives, no kill read =="
$AB eval "NV.M.x = NV.player.x + 240; NV.M.y = NV.player.y; NV.META.autoFire = true; NV.spawnEnemy('tank', NV.player.x + 240, NV.player.y); 'tank on aim line'"
$AB wait 6000
$AB eval "(function(){ const d = NV.pools.enemy.items.find(e => e.active && e.kind === 'tank'); return JSON.stringify({ found: !!d, hp: d ? d.hp : 0, hpMax: d ? d.cfg.hp : 0, damaged: d ? d.hp < d.cfg.hp : false, stillAlive_notDying: d ? (!d.dying && d.active) : false }); })()"

echo "== restart cleanliness =="
$AB eval "NV.startRun(); JSON.stringify({ mode: NV.S.mode, muzzles: NV.pools.muzzle.countActive(), recT: NV.player.recT, recoilOffset: +Math.hypot(NV.shipWrap.x - NV.player.x, NV.shipWrap.y - NV.player.y).toFixed(3) })"

echo "== console errors =="
$AB errors || true
echo "== DONE =="
