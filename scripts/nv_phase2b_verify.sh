#!/usr/bin/env bash
# PHASE 2B — UPGRADE CARDS E2E (state-driven polling; headless frame rate and
# therefore game-time rate varies wildly, ~0.06x-0.5x real). Determinism tricks:
#   - wave flow HELD via Wv.phase='cards' + cardT=9999 (playing mode, no spawns)
#   - fire rate stretched to 0.5/s so ONE volley is observable in isolation
#   - dash timeMs stretched to 800 for the burst probe (restored after)
#   - keys are ALWAYS cleared (keyup) before/after each key-driven test — the
#     dash is edge-triggered, a stuck synthetic key swallows the next trigger
set -e
AB="agent-browser"
URL="file:///home/z/my-project/download/neon-void/index.html?debug=1"
CU="NV.CFG.upgrades"

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
$AB eval "JSON.stringify({ screenMs: $CU.screenMs, grow: $CU.cardGrowScale, dim: $CU.dimAlpha, cardW: $CU.cardW, absorbMs: $CU.absorbMs, dashCfg: !!NV.CFG.player.dash && NV.CFG.player.dash.charges === 1 && NV.CFG.player.dash.cooldownMs === 1600 && NV.CFG.player.dash.speed === 880 && NV.CFG.player.dash.timeMs === 140, metaShopIntact: !!$CU.twin && !!$CU.overcharge && !!$CU.magnet, cards: NV.UPGRADES.length, uniques: NV.UPGRADES.filter(u => u.unique).map(u => u.id).sort().join(','), cats: Object.keys($CU).length >= 15, texPlus: !!NV.TEX.plus })"

echo "== 2) DASH basic: SPACE spends a charge, burst 880, i-frames, recharge =="
$AB eval "(function(){ window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' })); NV.startRun(); NV.killAll(); NV.Wv.queue.length = 0; NV.Wv.phase = 'cards'; NV.Wv.cardT = 9999; NV.META.autoFire = false; NV.CFG.player.dash.timeMs = 800; NV.CFG.player.dash.cooldownMs = 150; return JSON.stringify({ mode: NV.S.mode, dash: NV.dash() }); })()"
$AB wait 700
$AB eval "(function(){ window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); return 'space down'; })()"
poll "NV.dash().charges === 0 && Math.hypot(NV.player.vx, NV.player.vy) > 800" 20 250
$AB eval "(function(){ const sp = Math.hypot(NV.player.vx, NV.player.vy); return JSON.stringify({ burstSpeed: +sp.toFixed(0), burstBand: sp > 800 && sp < 960, iframes: +NV.player.iframes.toFixed(2), iframesSet: NV.player.iframes > 0 && NV.player.iframes <= 0.23, charges: NV.dash().charges }); })()"
$AB eval "(function(){ window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); NV.player.dashT = 0; NV.CFG.player.dash.timeMs = 140; return 'space up + dash window restored'; })()"
poll "NV.dash().charges === 1 && NV.dash().cdT <= 0.001" 90 300
$AB eval "JSON.stringify({ recharged: NV.dash().charges === 1, cooldownWasStretched150: true })"

echo "== 3) DASH CHARGE: +1 max granted ready; FAST DASH: cd starts at x0.6 =="
$AB eval "(function(){ window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' })); NV.CFG.player.dash.cooldownMs = 1600; NV.giveUpg('dashCharge'); NV.giveUpg('fastDash'); return JSON.stringify({ max: NV.dash().max, chargesReady: NV.dash().charges, expectedCd: (1600/1000)*(1-0.4) }); })()"
$AB wait 700
$AB eval "(function(){ window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' })); return 'shift down'; })()"
poll "NV.dash().charges === 1 && NV.dash().cdT > 0.3 && NV.dash().cdT < 1.03" 60 300
$AB eval "(function(){ window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' })); return JSON.stringify({ fastDashCdObserved: +NV.dash().cdT.toFixed(2), shiftTriggerWorks: true }); })()"

echo "== 4) fire path: SPREAD +2 / dmg cut / PIERCE stacks / RICOCHET bounce =="
$AB eval "(function(){ NV.startRun(); NV.killAll(); NV.Wv.queue.length = 0; NV.Wv.phase = 'cards'; NV.Wv.cardT = 9999; NV.META.autoFire = false; NV.CFG.gunTiers[0].rate = 0.5; NV.CFG.gunTiers[3].rate = 0.5; return 'fire rate stretched to 0.5/s (one observable volley)'; })()"
$AB eval "(function(){ NV.pools.bullet.releaseAll(); NV.player.fireCd = 0.001; NV.META.autoFire = true; return 'baseline volley armed'; })()"
poll "NV.pools.bullet.countActive() >= 1" 20 300
$AB eval "(function(){ const n = NV.pools.bullet.countActive(); NV.pools.bullet.releaseAll(); NV.giveUpg('spread'); NV.player.fireCd = 0.001; return JSON.stringify({ baselineVolley: n, is1: n === 1 }); })()"
poll "NV.pools.bullet.countActive() >= 3" 20 300
$AB eval "(function(){ const n = NV.pools.bullet.countActive(); const b = NV.pools.bullet.items.find(x => x.active); NV.pools.bullet.releaseAll(); NV.giveUpg('pierce'); NV.giveGun(4); NV.player.fireCd = 0.001; return JSON.stringify({ spreadVolley: n, is3: n === 3, bulletDmgCutTo1: b.dmg === 1 }); })()"
poll "NV.pools.bullet.items.filter(b => b.active && b.texture === NV.TEX.lance).length >= 1" 20 300
$AB eval "(function(){ const ls = NV.pools.bullet.items.filter(b => b.active && b.texture === NV.TEX.lance); const b = ls[0]; NV.pools.bullet.releaseAll(); NV.giveUpg('ricochet'); NV.giveGun(1); NV.player.fireCd = 0.001; NV.M.x = -300; NV.M.y = NV.player.y; return JSON.stringify({ lanceVolley: ls.length, lanceDmg: b.dmg, dmgIs2: b.dmg === 2, lancePierce: b.pierce, pierceIsTier2PlusCard1: b.pierce === 3 }); })()"
poll "NV.pools.bullet.items.some(b => b.active && b.vx > 0)" 60 300
$AB eval "(function(){ const bounced = NV.pools.bullet.items.find(b => b.active && b.vx > 0); const out = JSON.stringify({ wallBounceObserved: !!bounced, bounceChargesSpent: bounced ? bounced.bounces === 0 : false, insideArena: bounced ? bounced.x > 12 && bounced.x < NV.CFG.world.w : false }); NV.META.autoFire = false; NV.pools.bullet.releaseAll(); NV.CFG.gunTiers[0].rate = 8.0; NV.CFG.gunTiers[3].rate = 6.2; return out; })()"

echo "== 5) EXPLOSIVE KILLS: corpse burst chains the neighbor =="
$AB eval "(function(){ NV.startRun(); NV.killAll(); NV.Wv.queue.length = 0; NV.Wv.phase = 'cards'; NV.Wv.cardT = 9999; NV.giveUpg('explosive'); const x = NV.player.x + 220, y = NV.player.y + 120; NV.spawnEnemy('drone', x, y); NV.spawnEnemy('drone', x + 20, y); const ds = NV.pools.enemy.items.filter(d => d.active && d.kind === 'drone'); window.__d1 = ds[0]; window.__d2 = ds[1]; window.__kills0 = NV.S.kills; NV.hitEnemy(window.__d1, 1, 0, 1); return JSON.stringify({ spawned: ds.length, d1Dying: window.__d1.dying }); })()"
poll "NV.pools.enemy.items.every(d => !d.active) && NV.pendingKills.length === 0" 30 300
$AB eval "JSON.stringify({ chainResolved: NV.pools.enemy.items.every(d => !d.active), killsGained: NV.S.kills - (window.__kills0 || 0), bothKilled: (NV.S.kills - (window.__kills0 || 0)) === 2, noOrphans: NV.pendingKills.length === 0 })"

echo "== 6) LAST STAND: hit detonates 80px nova; far enemy survives =="
$AB eval "(function(){ NV.giveUpg('lastStand'); NV.player.hp = 3; NV.player.iframes = 0; NV.spawnEnemy('drone', NV.player.x + 50, NV.player.y); NV.spawnEnemy('drone', NV.player.x + 300, NV.player.y); const ds = NV.pools.enemy.items.filter(d => d.active && d.kind === 'drone'); window.__near = ds[0]; window.__far = ds[1]; return JSON.stringify({ placed: ds.length, hpBefore: NV.player.hp }); })()"
$AB eval "NV.hitMe(); 'player hit'"
$AB wait 1500
$AB eval "(function(){ return JSON.stringify({ hpAfter: NV.player.hp, hpLost1: NV.player.hp === 2, nearGone: !window.__near.active, farAlive: window.__far.active, farDist: Math.round(Math.hypot(window.__far.x - NV.player.x, window.__far.y - NV.player.y)) }); })()"

echo "== 7) MAGNET: +25% coin gain (5 -> 6), radius 110 -> 165 pull =="
$AB eval "(function(){ window.__cr0 = NV.S.runCoins; NV.player.up.magnet = 1; NV.pools.pickup.releaseAll(); NV.pools.enemy.releaseAll(); const pu = NV.pools.pickup.get(); pu.kind = 'coin'; pu.texture = NV.TEX.coin; pu.x = NV.player.x + 140; pu.y = NV.player.y; pu.vx = 0; pu.vy = 0; pu.life = 9; pu.t = 0; pu.scale.set(1); pu.alpha = 1; window.__pd0 = Math.round(Math.hypot(pu.x - NV.player.x, pu.y - NV.player.y)); return JSON.stringify({ coinPlaced: pu.active, dist: window.__pd0, insideMagnetized165: window.__pd0 < 165, outsideBase110: window.__pd0 > 110 }); })()"
poll "NV.S.runCoins > (window.__cr0 || 0)" 30 300
$AB eval "JSON.stringify({ coinCollected: true, gained: NV.S.runCoins - (window.__cr0 || 0), gained6: (NV.S.runCoins - (window.__cr0 || 0)) === 6 })"

echo "== 8) MAX HP: +1 cap + heal; REGEN: heal every 3rd wave start =="
$AB eval "(function(){ NV.player.hp = 2; NV.giveUpg('maxHp'); return JSON.stringify({ hpMax: NV.player.hpMax, hp: NV.player.hp, maxIs4: NV.player.hpMax === 4, healedTo3: NV.player.hp === 3 }); })()"
$AB eval "(function(){ NV.giveUpg('regen'); NV.player.hp = 1; NV.RUN.regenT = 0; NV.startWave(2); NV.startWave(3); return JSON.stringify({ afterTwoWaveStarts: NV.player.hp, still1: NV.player.hp === 1, regenT: NV.RUN.regenT }); })()"
$AB eval "(function(){ NV.startWave(4); return JSON.stringify({ afterThirdWaveStart: NV.player.hp, healedTo2: NV.player.hp === 2, regenTReset: NV.RUN.regenT === 0 }); })()"

echo "== 9) QUICK FEET: speed cap 360 -> 432 under sustained thrust =="
$AB eval "(function(){ window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' })); NV.player.up.quickFeet = 1; NV.player.x = 420; NV.player.y = 360; NV.player.vx = 0; NV.player.vy = 0; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' })); return 'KeyD down'; })()"
poll "Math.hypot(NV.player.vx, NV.player.vy) > 400" 30 300
$AB eval "(function(){ const sp = Math.hypot(NV.player.vx, NV.player.vy); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' })); return JSON.stringify({ speed: +sp.toFixed(0), inBand: sp > 400 && sp <= 434, expectedCap: 360 * 1.2 }); })()"

echo "== 10) wave clear -> 1s delay (still playing) -> card screen =="
$AB eval "(function(){ NV.startRun(); NV.killAll(); NV.Wv.queue.length = 0; return 'wave 1 field emptied, funnel armed'; })()"
poll "NV.Wv.phase === 'cards' && NV.S.mode === 'playing' && NV.Wv.cardT > 0.05 && NV.Wv.cardT <= 1.01" 60 300
$AB eval "(function(){ NV.skipDelay(); return JSON.stringify({ funnelPhase: NV.Wv.phase, cardTatDetection: +NV.Wv.cardT.toFixed(3), modeStillPlayingDuringDelay: NV.S.mode === 'playing' }); })()"
poll "NV.S.mode === 'cards' && NV.cardState().open && NV.cardState().phase === 'live'" 30 300
$AB eval "(function(){ const cs = NV.cardState(); return JSON.stringify({ draw: cs.draw, distinct: new Set(cs.draw).size === cs.draw.length, three: cs.draw.length === 3, keys: cs.slots.map(s => s.key).join(' '), dimRising: cs.dimA > 0, eligibleAll12: NV.eligible().length === 12 }); })()"
$AB screenshot /home/z/my-project/scripts/nv/phase2b_cards.png || true

echo "== 11) hover: grow 5% + 1s looping preview on the ship =="
$AB eval "(function(){ NV.M.x = NV.cardState().slots[0].x; NV.M.y = NV.cardState().slots[0].y; window.__hid = NV.cardState().draw[0]; return 'pointer parked on card 1: ' + window.__hid; })()"
poll "NV.cardState().hover === 0 && NV.preview().active" 20 300
$AB eval "(function(){ const s0 = NV.cardState().slots[0]; return JSON.stringify({ previewId: NV.preview().id, previewIdMatchesCard: NV.preview().id === window.__hid, previewSprites: NV.preview().n, growScale: s0.sc, grown: s0.sc > 1.0 }); })()"
$AB screenshot /home/z/my-project/scripts/nv/phase2b_preview.png || true
$AB eval "(function(){ NV.M.x = 640; NV.M.y = 120; return 'pointer moved away'; })()"
poll "NV.cardState().hover === -1 && !NV.preview().active" 20 300

echo "== 12) pick via keyboard 1 -> absorb -> next wave begins =="
$AB eval "(function(){ window.__pick = NV.cardState().draw[0]; window.__wave0 = NV.S.wave; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1' })); return 'digit 1 pressed for ' + window.__pick; })()"
poll "(NV.cardState().phase === 'absorb') || (NV.S.mode === 'playing' && NV.S.wave === (window.__wave0 || 1) + 1)" 20 250
$AB screenshot /home/z/my-project/scripts/nv/phase2b_absorb.png || true
poll "NV.S.mode === 'playing' && NV.S.wave === (window.__wave0 || 1) + 1" 45 300
$AB eval "(function(){ return JSON.stringify({ picked: window.__pick, stack: NV.player.up[window.__pick], stackIs1: NV.player.up[window.__pick] === 1, screenClosed: !NV.cardState().open, waveNow: NV.S.wave, nextWaveStarted: NV.S.wave === (window.__wave0 || 1) + 1 }); })()"

echo "== 13) draw integrity: no dup in 100 draws; owned uniques leave the pool =="
$AB eval "(function(){ let ok = true; for (let i = 0; i < 100; i++) { const d = NV.draw3(); if (new Set(d).size !== d.length) { ok = false; break; } } return JSON.stringify({ hundredDrawsAllDistinct: ok, eligibleNow: NV.eligible().length }); })()"
$AB eval "(function(){ NV.startRun(); NV.giveUpg('ricochet'); NV.giveUpg('explosive'); NV.giveUpg('lastStand'); const el = NV.eligible(); return JSON.stringify({ eligibleCount: el.length, uniquesGone: !el.includes('ricochet') && !el.includes('explosive') && !el.includes('lastStand'), exactlyNine: el.length === 9 }); })()"

echo "== 14) restart hygiene: bag zeroed, dash reset, screen closed =="
$AB eval "NV.startRun(); 'fresh run'"
$AB wait 900
$AB eval "(function(){ const up = NV.player.up; return JSON.stringify({ bagZeroed: Object.keys(up).every(k => up[k] === 0), dash: NV.dash(), screenClosed: !NV.cardState().open, mode: NV.S.mode, wave1QueueAllDrones: NV.Wv.queue.every(k => k === 'drone'), metaUpgradesUntouched: !!NV.CFG.upgrades.twin && !!NV.CFG.upgrades.overcharge, runStateFresh: NV.RUN.regenT === 0 }); })()"

echo "== console errors =="
$AB errors || true
echo "== DONE =="
