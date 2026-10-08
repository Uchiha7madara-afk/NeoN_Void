#!/usr/bin/env bash
# ITEM 3 — GRID REACTS E2E (headless ~3fps; 1 rendered frame ~= 330ms real, dt capped 34ms)
set -e
AB="agent-browser"
URL="file:///home/z/my-project/download/neon-void/index.html?debug=1"

echo "== boot =="
$AB open "$URL" >/dev/null
$AB wait 2500

echo "== c) breathing idle on title (two samples ~1.6s apart, expect 0.6..0.8 drift) =="
$AB eval "JSON.stringify({mode:NV.S.mode, base1:+NV.S.gridBase.toFixed(3), shoot:NV.S.gridShoot})"
$AB wait 1600
$AB eval "JSON.stringify({base2:+NV.S.gridBase.toFixed(3), shoot:NV.S.gridShoot})"

echo "== d) combat intensity: 3 drones -> target 0.5+min(0.4,3*0.02)=0.56 =="
$AB eval "NV.startRun(); NV.spawnEnemy('drone', 300, 200); NV.spawnEnemy('drone', 900, 200); NV.spawnEnemy('drone', 640, 500); 'spawned'"
$AB wait 2000
$AB eval "JSON.stringify({base:+NV.S.gridBase.toFixed(3), expect:0.56, shoot:NV.S.gridShoot})"

echo "== a) shoot flash: autoFire on -> bump ~0.15; off -> decays to 0 =="
$AB eval "NV.META.autoFire = true; 'autoFire on'"
$AB wait 700
$AB eval "JSON.stringify({shoot:+NV.S.gridShoot.toFixed(3)})"
$AB eval "NV.META.autoFire = false; 'autoFire off'"
$AB wait 1500
$AB eval "JSON.stringify({shoot_after:+NV.S.gridShoot.toFixed(3)})"

echo "== b) kill ripple: local patch, enemy tint, lattice-snapped =="
$AB eval "NV.killAll(); NV.spawnEnemy('drone', 617, 300); 'drone at 617,300'"
$AB wait 600
$AB eval "NV.forceKill(); 'killed'"
$AB wait 900
$AB eval "(function(){ const r = NV.pools.ripple.items.find(r=>r.active); return JSON.stringify({ ripples: NV.pools.ripple.countActive(), tint: r ? r.tint.toString(16) : 'none', x: r ? r.x : 0, y: r ? r.y : 0, snapped: r ? (r.x % 64 === 0 && r.y % 64 === 0) : false, scale: r ? +r.scale.x.toFixed(3) : 0, alpha: r ? +r.alpha.toFixed(3) : 0 }); })()"
$AB screenshot /home/z/my-project/scripts/nv/item3_ripple.png || true

echo "== ripple expires (200ms game ~= 6 frames) =="
$AB wait 2200
$AB eval "JSON.stringify({ripples: NV.pools.ripple.countActive()})"

echo "== restart cleanliness =="
$AB eval "NV.startRun(); JSON.stringify({mode:NV.S.mode, ripples:NV.pools.ripple.countActive(), shoot:NV.S.gridShoot})"

echo "== console errors =="
$AB errors || true
echo "== DONE =="
