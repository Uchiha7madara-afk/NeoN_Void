#!/usr/bin/env bash
# PHASE 2A — HUNTER ENEMY E2E v2 (state-driven polling; headless frame time varies 300-450ms)
# Trick: windUpMs is stretched to 30s to hold the telegraph open for probing,
# then restored to 350ms to test the real fire beat deterministically.
set -e
AB="agent-browser"
URL="file:///home/z/my-project/download/neon-void/index.html?debug=1"
HC="NV.CFG.enemies.hunter"

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
$AB eval "JSON.stringify({ windUpMs: $HC.windUpMs, fireRange: $HC.fireRange, cooldownMs: $HC.cooldownMs, bulletSpeed: $HC.bulletSpeed, leadFactor: $HC.leadFactor, hp: $HC.hp, radius: $HC.radius, colorPrimary: $HC.colorPrimary.toString(16), colorBullet: $HC.colorBullet.toString(16), oldFlatHunterGone: NV.CFG.hunter === undefined, colHunterSourced: NV.CFG.colors.hunter === $HC.colorPrimary, weight: NV.CFG.waves.weights.hunter, hbulletTex: !!NV.TEX.hbullet, hunterTexWider: NV.TEX.hunter.width > NV.TEX.drone.width, aimLinesState: NV.S.aimLines })"

echo "== 2) spawn ratio: wave1 zero hunters, wave3 ~1 hunter per 4 drones =="
$AB eval "(function(){ let w1d = 0, w1h = 0; for (let i = 0; i < 20; i++) { const q = NV.buildQueue(6, 1); w1h += q.filter(k => k === 'hunter').length; w1d += q.filter(k => k === 'drone').length; } let w3d = 0, w3h = 0, w3o = 0; for (let i = 0; i < 60; i++) { const q = NV.buildQueue(12, 3); w3h += q.filter(k => k === 'hunter').length; w3d += q.filter(k => k === 'drone').length; w3o += q.filter(k => k !== 'hunter' && k !== 'drone').length; } const ratio = w3h / Math.max(1, w3d); return JSON.stringify({ wave1: { hunters: w1h, drones: w1d, zeroHunters: w1h === 0 }, wave3: { hunters: w3h, drones: w3d, others: w3o, ratio: +ratio.toFixed(3), target: 0.25, inBand: ratio > 0.16 && ratio < 0.36 } }); })()"

echo "== 3) controlled field + stretched windup for probing =="
$AB eval "(function(){ NV.startRun(); NV.killAll(); NV.Wv.queue.length = 0; NV.Wv.phase = 'breather'; NV.Wv.breatherT = 9999; $HC.windUpMs = 30000; return JSON.stringify({ hp: NV.player.hp, x: NV.player.x, y: NV.player.y, mode: NV.S.mode, windUpStretched: $HC.windUpMs === 30000 }); })()"
$AB wait 800

echo "== 4) hunter spawns inside fireRange -> APPROACH brakes -> WINDUP holds =="
$AB eval "NV.spawnEnemy('hunter', NV.player.x + 260, NV.player.y); 'hunter at +260'"
poll "NV.hunterState().length === 1 && NV.hunterState()[0].st === 'windup'" 30 400
$AB eval "(function(){ const h = NV.hunterState()[0]; return JSON.stringify({ h, winding: h.st === 'windup', wT_held: h.wT > 25, spawnKDone: h.spawnK >= 1, aimLines: NV.S.aimLines, planted: h.dist <= 321, velNearZero: Math.hypot(NV.hunters()[0].vx, NV.hunters()[0].vy) < 30 }); })()"
$AB screenshot /home/z/my-project/scripts/nv/phase2a_telegraph_dim.png || true

echo "== 5) telegraph LEADS the player (aim = where you're GOING) =="
$AB eval "NV.player.vx = 250; NV.player.vy = 0; 'player moving +x'"
$AB wait 700
$AB eval "(function(){ const h = NV.hunterState()[0]; const lead = h.aimX - NV.player.x; const tof = h.dist / ($HC.bulletSpeed * 1.0); return JSON.stringify({ leadPx: Math.round(lead), tof: +tof.toFixed(2), leadsAhead: lead > 60, withinPhysics: lead <= NV.player.vx * tof * 1.6 }); })()"
$AB eval "NV.player.vx = -200; NV.player.vy = 0; 'player moving -x'"
$AB wait 700
$AB eval "(function(){ const h = NV.hunterState()[0]; const lead = h.aimX - NV.player.x; return JSON.stringify({ leadPx: Math.round(lead), trailsBehind: lead < -30 }); })()"
$AB eval "NV.player.vx = 0; NV.player.vy = 0; 'player parked'"

echo "== 5b) late-windup read: line fades to bright white =="
$AB eval "(function(){ $HC.windUpMs = 350; NV.hunters()[0].wT = 0.05; return 'windUp restored 350ms, wT armed to 50ms'; })()"
$AB wait 300
$AB screenshot /home/z/my-project/scripts/nv/phase2a_telegraph_bright.png || true

echo "== 6) windup completes -> FIRE: one comet orb, line gone same frame =="
poll "NV.hunterState()[0] && NV.hunterState()[0].st === 'cooldown' && NV.pools.eb.items.filter(x => x.active && x.tint === $HC.colorBullet).length === 1" 30 400
$AB eval "(function(){ const h = NV.hunterState()[0]; const b = NV.pools.eb.items.filter(x => x.active && x.tint === $HC.colorBullet); const o = b[0]; const angToPlayer = Math.atan2(NV.player.y - h.y, NV.player.x - h.x); return JSON.stringify({ inCooldown: h.st === 'cooldown', cooldownTicking: h.cT > 0.4 && h.cT <= $HC.cooldownMs / 1000, orbCount: b.length, isCometTex: o.texture === NV.TEX.hbullet, rotLocked: Math.abs(o.rotation - Math.atan2(o.vy, o.vx)) < 1e-6, aimsAtParkedPlayer: Math.abs(Math.atan2(o.vy, o.vx) - angToPlayer) < 0.1, speed: +Math.hypot(o.vx, o.vy).toFixed(1), speedBand: Math.hypot(o.vx, o.vy) > 200 && Math.hypot(o.vx, o.vy) < 245, dmg: o.dmg, aimLinesAfterFire: NV.S.aimLines, windUpRestored: $HC.windUpMs === 350 }); })()"
$AB screenshot /home/z/my-project/scripts/nv/phase2a_orb.png || true

echo "== 7) hunter bullet damages the player (bulletDamage wired) =="
$AB eval "(function(){ const b = NV.pools.eb.items.find(x => x.active && x.tint === $HC.colorBullet); if (!b) return 'NO ORB'; b.x = NV.player.x; b.y = NV.player.y; return 'orb teleported onto player'; })()"
poll "NV.player.hp === 2" 20 400
$AB eval "(function(){ const left = NV.pools.eb.items.filter(x => x.active && x.tint === $HC.colorBullet).length; return JSON.stringify({ hp: NV.player.hp, orbConsumed: left === 0 }); })()"
$AB eval "NV.killAll(); NV.Wv.queue.length = 0; NV.Wv.phase = 'breather'; NV.Wv.breatherT = 9999; 'field cleared'"

echo "== 8) kill DURING windup: clean cancel, no orphan line/bullet, purple pop =="
$AB eval "(function(){ NV.player.hp = 3; NV.spawnEnemy('hunter', NV.player.x + 200, NV.player.y); return 'hunter 2 at +200'; })()"
poll "NV.hunterState().length === 1 && NV.hunterState()[0].st === 'windup'" 30 400
$AB eval "(function(){ const h = NV.hunterState()[0]; window.__s0 = NV.S.score; return JSON.stringify({ winding: h.st === 'windup', aimLines: NV.S.aimLines, noOrphanBulletYet: NV.pools.eb.items.filter(x => x.active && x.tint === $HC.colorBullet).length === 0 }); })()"
$AB eval "(function(){ if (NV.hunters()[0]) NV.hunters()[0].wT = 0.35; NV.forceKill(); return JSON.stringify({ pending: NV.pendingKills.length, corpseDying: NV.hunters().every(d => d.dying) }); })()"
$AB wait 1400
$AB eval "(function(){ const purple = NV.pools.part.items.filter(p => p.active && p.tint === $HC.colorPrimary).length; const scoreGain = NV.S.score - window.__s0; return JSON.stringify({ pendingResolved: NV.pendingKills.length === 0, hunterGone: NV.hunters().length === 0, aimLines: NV.S.aimLines, noOrphanLine: NV.S.aimLines === 0, noOrphanBullet: NV.pools.eb.items.filter(x => x.active && x.tint === $HC.colorBullet).length === 0, scoreGain, scored250: scoreGain === 250, purpleBurstParticles: purple, popFired: purple >= 8 }); })()"

echo "== 9) restart hygiene: no telegraph, no hunters, wave1 = drones only =="
$AB eval "NV.startRun(); 'fresh run'"
$AB wait 900
$AB eval "(function(){ return JSON.stringify({ aimLines: NV.S.aimLines, hunters: NV.hunters().length, wave1QueueAllDrones: NV.Wv.queue.every(k => k === 'drone'), mode: NV.S.mode }); })()"

echo "== console errors =="
$AB errors || true
echo "== DONE =="
