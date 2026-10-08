#!/usr/bin/env bash
# ITEM 2 — KILL MOMENT E2E (headless, ~3fps => 1 rendered frame ~= 330ms real)
# All state read via window.NV (debug hooks).
set -e
AB="agent-browser"
URL="file:///home/z/my-project/download/neon-void/index.html?debug=1"

echo "== boot =="
$AB open "$URL" >/dev/null
$AB wait 2500

echo "== startRun + spawn 1 drone =="
$AB eval "NV.startRun(); NV.spawnEnemy('drone', 640, 220); 'spawned'"
$AB wait 800

echo "== forceKill -> immediate state (staged kill, same JS tick) =="
$AB eval "NV.forceKill(); JSON.stringify({mode:NV.S.mode, score:NV.S.score, hitstop:+NV.S.hitstop.toFixed(3), kMag:NV.S.kMag, kx:+NV.S.kx.toFixed(1), ky:+NV.S.ky.toFixed(1), enemyActive:NV.pools.enemy.items.filter(e=>e.active).length, dying:NV.pools.enemy.items.filter(e=>e.active&&e.dying).length, isWhite:NV.pools.enemy.items.filter(e=>e.active&&e.dying).every(e=>e.texture===NV.TEX.droneW), pend:NV.pendingKills.length})"

echo "== screenshot mid-flash/pop =="
$AB screenshot /home/z/my-project/scripts/nv/item2_flash.png || true

echo "== wait for flash expiry + pop (~7 rendered frames) =="
$AB wait 2600
$AB eval "JSON.stringify({score:NV.S.score, kills:NV.S.kills, hitstop:+NV.S.hitstop.toFixed(3), enemyActive:NV.pools.enemy.items.filter(e=>e.active).length, parts:NV.pools.part.countActive(), rings:NV.pools.ring.countActive(), popups:NV.pools.popup.countActive(), popupFill:(()=>{const a=NV.pools.popup.items.filter(p=>p.active);return a.length?String(a[0].style.fill):'none'})(), kMag:NV.S.kMag})"

echo "== multi-kill stack cap: 3 drones, simultaneous kill =="
$AB eval "NV.spawnEnemy('drone', 300, 200); NV.spawnEnemy('drone', 900, 200); NV.spawnEnemy('drone', 640, 500); '3 spawned'"
$AB wait 500
$AB eval "NV.forceKill(); JSON.stringify({kMag_after3:NV.S.kMag, cap:NV.CFG.juice.kill.shakeMaxStack, hitstop:+NV.S.hitstop.toFixed(3), dying:NV.pools.enemy.items.filter(e=>e.active&&e.dying).length, pend:NV.pendingKills.length})"

echo "== shake fully decays =="
$AB wait 2200
$AB eval "JSON.stringify({kMag:NV.S.kMag, kx:NV.S.kx, ky:NV.S.ky})"

echo "== restart cleanliness: die -> over -> startRun =="
$AB eval "NV.hitMe(); NV.hitMe(); NV.hitMe(); NV.S.mode"
$AB wait 11000
$AB eval "NV.S.mode"
$AB eval "NV.startRun(); JSON.stringify({mode:NV.S.mode, pend:NV.pendingKills.length, kMag:NV.S.kMag, dyingVisible:NV.pools.enemy.items.filter(e=>e.visible&&e.dying).length, enemies:NV.pools.enemy.countActive()})"

echo "== respawned enemy is NOT stuck dying (pool reuse safety) =="
$AB eval "NV.spawnEnemy('drone', 640, 220); 'spawned'"
$AB wait 600
$AB eval "JSON.stringify({dying:NV.pools.enemy.items.filter(e=>e.active&&e.dying).length, active:NV.pools.enemy.countActive(), alive:NV.pools.enemy.items.filter(e=>e.active&&!e.dying).length})"

echo "== console errors =="
$AB errors || true
echo "== DONE =="
