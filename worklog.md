# Neon Void — Worklog

---
Task ID: 1
Agent: main (Super Z)
Task: Align on Neon Void Feel Slice spec; set up environment

Work Log:
- Loaded fullstack-dev skill; initialized environment (Next.js 16 auto-dev on port 3000, preview via `/` route)
- Verified CDN reachability: pixi.js@8, pixi-filters@6, Google Fonts Orbitron — all HTTP 200
- Locked spec with user (7 design forks)

Stage Summary (LOCKED SPEC — Feel Slice v0.1):
- PixiJS v8 (CDN, global PIXI), vanilla JS, ONE banded index.html, no build step
- Controls: WASD thrust (world-space), ship lerps to face mouse, HOLD LMB auto-fire
- Arena: bounded 1280x720 logical, letterboxed to window, glowing purple border, soft-wall bounce + squash
- Enemy: red drones only (chase + weave + separation), spawn just inside edges WITH telegraph rings
- Kill pop: sparks + embers + shockwave ring + white ghost flash + shake + hit-stop + "+100" popup + grid pulse
- Audio day 1: exactly 3 synth sounds (shoot square blip / kill noise+sweep / hurt saw thud), Web Audio, zero files
- Difficulty: forgiving — 3 HP, 1.5s i-frames, player hitbox 9px vs 17px sprite, ramp every wave (speed+count)
- Death: slow-mo 0.85s → GAME OVER (score/best) → R or click restarts < 1s
- Best score persists via localStorage (not the meta shop)
- Definition of done: ship feels good, drones die, every kill pops, death→score→R→flying < 1s
- Delivery: download/neon-void/index.html (source of truth) + public/game/index.html served at `/` via beforeFiles rewrite

---
Task ID: 2
Agent: main (Super Z)
Task: Build + verify Neon Void Feel Slice v0.1 (single-file, PixiJS 8)

Work Log:
- Wrote banded single-file build via parts (scripts/nv/p1-p5) -> download/neon-void/index.html (~42KB, 00 CONFIG .. 13 RUN CONTROL bands)
- Deployed copy to public/game/index.html; next.config.ts beforeFiles rewrite "/" -> "/game/index.html" (preview serves the game at root)
- node --check on extracted JS bundle: SYNTAX OK (fixed false alarm: IIFE opens inside p1 <script>)
- agent-browser E2E: title renders (chromatic bloom title, grid, border, HUD) -> click starts run -> WAVE 1 banner -> telegraph rings -> drone spawn -> hold-LMB kill (kills=1 score=100, popup+ghost captured in shot_play.png) -> forced death: slow-mo -> GAME OVER (score/best/wave, chromatic) -> R restarts in <1s (mode=playing score=0 wave=1 hp=3) -> P pause/resume OK -> localStorage best persists -> file:// double-click boot OK (no CORS) -> swarm test + error scan: zero console errors
- Headless renders ~3 FPS; delta cap (34ms) verified safe: bullet step 26.5px < 33px collision window, no tunneling
- Fixes during verify: particle alpha fade bug (alpha0), bakeTextures() call order (before pool factories), HUD best stale on game-over (hudScore in toOver)

Stage Summary:
- DELIVERABLE: /home/z/my-project/download/neon-void/index.html (source of truth, single file, double-click playable) + served copy at public/game/index.html
- Definition of done MET: fly+feel good, drones chase/die, every kill pops (particles+flash+shake+hitstop+popup+gridpulse+synth kill sound), death->score->R->flying <1s
- Feel Slice scope locked: red drones only; hunters/spinners/tanks, pickups, combo, gun tiers = next phases

---
Task ID: 3
Agent: main (Super Z)
Task: Complete the FULL assignment — Neon Void v1.0 (all phases, not just Feel Slice)

Work Log:
- User restarted the task: "nothing is built, complete the assignment" -> built the complete game on top of the verified v0.1 patterns
- Rewrote as banded single file via parts (scripts/nv/q1-q8) -> download/neon-void/index.html (~78KB, 1884 lines, bands 00 CONFIG .. 13 RUN CONTROL)
- NEW vs v0.1: hunter (orbit + predictive shots + charge telegraph), spinner (drift + dual-arm spiral spray), tank (HP sponge + radial rings + death burst); enemy bullets pool (tinted per kind); gun tiers 1-5 PULSE/TWIN/SPREAD/LANCE/NOVA (pierce + sine-wave NOVA); pickups heart/gun/coin with magnet + blink; combo multiplier (x0.1/kill, 2.6s window, resets on hit, HUD bar); budget wave director (budget=w-scaled, weighted unlock schedule hunter w3 / spinner w5 / tank w7, tier every 5 waves: hp/speed bumps + THEY ADAPT banner); difficulty select EASY/NORMAL/HARD (hp/speed/bullet/budget/iframes/score-mult); DOM title screen with HANGAR (3 ships: VECTOR free / WASP 300 / JUGGERNAUT 600, distinct stats+shapes+colors) + 3 upgrades (TWIN CANNON start t2 / OVERCHARGE +18% rate / MAGNETIZER +70% magnet); META localStorage save (coins/best/ship/owned/upg/diff/autoFire/muted, migrates v0.1 best); 9 synth sounds (shoot per-tier pitch, kill, hurt, coin, gun, heal, ui, boom, tier); RGB split chromatic hurt (options-object constructor per v6 API); banking tilt; ship per-color textures; CR currency popup economy
- Bugfixes during build: static #startBtn/#afToggle listeners were never attached (menu was dead) -> wired; spinner spray never cooled -> cooldown reset on spray end; coin pickup didn't refresh HUD -> hudScore(); combo popup spam -> show x-mult only at >=2; RGBSplitFilter v6 deprecation -> options object; added Q-at-pause -> quit to hangar
- E2E (agent-browser): title/shop renders+interacts, ENGAGE starts (<1s UI swap), wave1 telegraphs->drones, forceKill -> score 100 + combo x1.7 escalation, coin drop -> magnet -> CR +5 banked at game over (TOTAL 5 CR shown), all 4 enemy kinds spawn + hunters/tanks fire (player died to enemy fire: full damage pipeline), dying->over, R restart measured <1s (951ms incl CLI latency), shop buy WASP 300CR -> auto-equip + maxSpeed 445 verified in-run, F auto-fire -> bullets without LMB, LANCE t4 firing, file:// boot clean, zero console errors
- NOTE: headless env renders ~3 FPS (software GL) — game time accrues ~10x slower in tests; delta cap 34ms keeps collisions stable; real browsers run 60fps
- Deployed copy to public/game/index.html (served at / via existing beforeFiles rewrite)

Stage Summary:
- DELIVERABLE COMPLETE: /home/z/my-project/download/neon-void/index.html (double-click playable) + served at preview root
- All 4 planned phases shipped: Feel Slice + combat waves (4 enemy types, enemy bullets, HP/i-frames) + juice (combo, hit-stop, RGB split, 9 sounds) + meta (coins, hangar, upgrades, difficulty, auto-fire)
- Definition of done from spec exceeded; single-file zero-asset principle kept; all tuning in CFG

---
Task ID: 4
Agent: main (Super Z)
Task: DAY 1 JUICE PASS — ITEM 1 (SHIP FEEL) only; STOP for user playtest before Item 2

Work Log:
- Re-read worklog + existing v1.0 build (game exists; earlier "nothing built" summary was stale)
- Touched ONLY: band 00 CONFIG (new juice block + lerpColor util, retired CFG.player.trailRate), band 04 PLAYER render code, one ticker line, showTitle hide. No architecture/refactor changes, no new content
- Added CFG.juice.ship: trailLength 12, trailFade 0.30, trailAlpha 0.6, trailMinSpeed 30, trailFullAt 0.5, bankAngle 18, bankEase 10, pulseRate 12, pulseMinSpeed 25, squashAmount {stretch 1.08, squash 0.94}, squashEase 12, stretchFullAt 0.55
- 1a engine trail: old particle puffs REPLACED by 12-pose ring buffer of ghost afterimages (white shipW silhouettes, additive, alpha 0.6->0 tail-ward, tint ship.color->ship.trail = cyan->pink on VECTOR; length scales with speed via per-frame sampling + speed-based alpha)
- 1b banking: was instant clamp(lat*0.0007, ±0.22rad); now eased ±18deg from lat/maxSpeed with damp(bankEase)
- 1c thrust pulse: additive TEX.dot child at ship tail, ~12Hz flicker with per-frame random phase-speed and alpha jitter, active above 25px/s, tinted ship color
- 1d squash & stretch: new shipWrap container rotates to velocity direction; playerSpr counter-rotates inside (ship still faces cursor, aim unaffected); wrap scale eases to 1.08 along / 0.94 across movement, back to 1.0 at rest; wall-bounce squash preserved (now on wrap axes)
- updateShipTrail(dt) added to unconditional ticker block; ghost textures/scale re-bound per equipped ship in playerReset; showTitle hides the rig
- Verify: node --check SYNTAX OK; agent-browser file://?debug=1 boot clean; startRun -> KeyD synthetic hold -> vx 360 cap; screenshot scripts/nv/item1_trail.png shows cyan->pink ghost fan; auto-fire live (3 bullets, cd cycling); hitMe x3 -> dying -> over -> startRun restart OK; ZERO console/page errors
- Synced served copy: public/game/index.html

Stage Summary:
- ITEM 1 (SHIP FEEL) SHIPPED — awaiting user playtest verdict
- Items 2 (kill moment), 3 (grid reacts), 4 (bullet feel), 5 (death/restart) NOT started, per protocol
- Kill path untouched this pass (sound + score + existing pop only; Item 2 will rework it)
- All new tunables in one place: CFG.juice.ship (edit numbers only)

---
Task ID: 5
Agent: main (Super Z)
Task: DAY 1 JUICE PASS — ITEM 2 (THE KILL MOMENT) only; STOP for user playtest before Item 3

Work Log:
- User confirmed Item 1 (no reverts) and issued "GO for ITEM 2" with the 6-part kill spec + exact CFG.juice.kill defaults
- Re-read full kill path (band 07 killEnemy released enemy + fired everything same-frame), main loop (hitstop => dt=0 while fxUpdate keeps rawDt), enemy AI/texture refresh, pool lifecycle
- Touched ONLY: 00 CONFIG (new CFG.juice.kill), 01 CORE (S kill-shake fields), 02 FX (fxUpdate kill-shake integration, addKillShake, ring()/popup() parametrized — backwards-compatible defaults), 03 POOLS (burstKill re-specced), 06 ENEMIES (dying corpses skipped in AI + spawnEnemy resets dying flag), 07 COLLISIONS (staged killEnemy/finalizeKill/pendingKills/updateKillFlash + skip dying in collideBullets), 13 RUN CONTROL (ticker calls updateKillFlash; startRun/killAll clear state), NV debug hooks (+pendingKills, TEX). No architecture/refactor changes
- Kill is now STAGED: death frame = white flash (enemy sprite -> TEX[kindW], frozen via d.dying) + addKillShake + hitstop(60ms) + sound + grid pulse; flash expiry (frame-exact countdown on rendered frames, survives the freeze) = release corpse + burst + ring + score/popup/drops (+tank radial burst rides with the pop)
- 2.1 white flash: exactly whiteFlashFrames=2 rendered frames BEFORE burst (spec); old post-death ghost() call retired from kill path (pool kept, unused)
- 2.2 burst: burstKill re-specced — particleCount 12 enemy-color sparks (no more tri-color mix/embers), radial 80-200 px/s, life 400ms, shrink+fade via existing pool curve, drag 1.6
- 2.3 ring: ring() gained startScale/alpha0 params; kill ring starts at enemy radius (d.radius/24, TEX.ring baked r24), expands to 3x over 250ms, alpha 1->0, thin stroke
- 2.4 shake: NEW additive directional kill shake (S.kMag/kT/kAng/kx/ky) — 6px per kill, random direction, ease-out (1-k)^2, stacks capped 12, ticks on rawDt so it plays THROUGH the hit-stop freeze; composes with legacy trauma shake (hurt/wall unchanged). Kill path no longer calls addTrauma(feel.traumaKill)
- 2.5 hit-stop: killEnemy -> hitstop(kill.hitStopMs/1000)=60ms (max(), so simultaneous kills don't extend); main loop already freezes player/enemies/bullets/particles via dt=0
- 2.6 popup: popup() gained rise/dur params (defaults preserve old motion); kill popup cyan '#2cf6ff', rise exactly 40px over 0.6s (4/3 taper correction); x-mult combo readout unchanged (gold combo styling comes later per spec)
- E2E (agent-browser, headless ~3fps): same-tick after forceKill -> score 0, corpse active+dying+white tex, hitstop 0.06, kMag 6, pend 1; after flash expiry -> score 100, corpse gone, popup #2cf6ff; mid-pop -> 12+ particles tinted ff2b4e + 1 ring; 3 simultaneous kills -> kMag exactly 12 (cap), hitstop stays 0.06; shake decays to 0; die->over->startRun clean (pend 0, no stuck dying corpses); respawned enemy not stuck dying (pool reuse); ZERO console errors; node --check SYNTAX OK
- Screenshot item2_flash.png: +100 cyan popup over kill point, red ring remnant, SCORE HUD ticked
- Synced served copy: public/game/index.html

Stage Summary:
- ITEM 2 (KILL MOMENT) SHIPPED — staged hit->pop sequence, all 6 sub-items, tunables all in CFG.juice.kill (12 spec keys + whiteFlashFrames)
- feel.traumaKill / feel.hitstopKill now bypassed for kills (still used: hitstopHurt, player-death hitstop(0.09)); ghost pool idle
- Items 3 (grid reacts), 4 (bullet feel), 5 (death/restart) NOT started, per protocol
- Awaiting user playtest verdict + "go" for ITEM 3

---
Task ID: 6
Agent: main (Super Z)
Task: DAY 1 JUICE PASS — ITEM 3 (GRID REACTS) only; STOP for user playtest before Item 4

Work Log:
- User confirmed Item 2 (kept all 3 judgment calls) and issued "GO for ITEM 3" with 4-part grid spec + exact CFG.juice.grid defaults
- Touched ONLY: 00 CONFIG (CFG.juice.grid + pools.ripples:14), 01 CORE (S.gridBase/gridShoot), 02 FX (fxUpdate grid-brightness rewrite + gridShootFlash()), 03 POOLS (TEX.gridPatch canvas bake + ripplePool/gridRipple/updateRipples), 05 BULLETS (fireBullet calls gridShootFlash), 07 COLLISIONS (finalizeKill fires local ripple; old S.gridPulse kill bump removed), 13 RUN CONTROL (ticker updateRipples, startRun resets shoot/ripples). Static gridG untouched — brightness is a per-frame uniform read
- Baseline model: enemy count (active && !dying) > 0 -> combat target = intensityBase + min(intensityMax - intensityBase, count * intensityScale); 0 -> breathing sine breathMin..breathMax over breathPeriodMs; S.gridBase eases via damp(3/easeSec) => 95% in intensityEaseMs; gridC.alpha = clamp(gridBase + gridShoot, 0, 1.6); all on rawDt so ambience survives hit-stop
- a) shoot flash: gridShootFlash() at top of fireBullet (single funnel) refreshes S.gridShoot to shootFlashAmount; linear ease-back over shootFlashMs; stacks independently with the local ripple
- b) kill ripple: TEX.gridPatch baked once from canvas (white 64px grid lines, radial destination-in falloff, logical radius 256); pooled sprites snapped to the 64px lattice so glow lines sit exactly ON the real grid; expands 0 -> killPulseRadius over killPulseMs, alpha killPulseAlpha -> 0, tinted enemy color, additive in fxL; local only — rest of grid unchanged. Old whole-grid S.gridPulse kill response retired (feel.gridPulseKill/gridPulseDecay now dead keys)
- c) breathing idle: verified 0.711 -> 0.720 drift on title screen (inside 0.6..0.8)
- d) combat intensity: 3 drones -> base easing 0.666 toward 0.56 (caught mid-ease at capped delta; formula+direction verified)
- E2E (agent-browser): shoot flash exactly 0.15 during autoFire, decays to exactly 0; kill ripple: count 1, tint ff2b4e, position snapped (617,300)->(640,320), mid-expansion scale 0.239 / alpha 0.294, expires fully; restart clean (ripples 0, shoot 0); ZERO console errors; node --check SYNTAX OK; screenshot item3_ripple.png (late tail: red particles + ring at kill point)
- Synced served copy: public/game/index.html

Stage Summary:
- ITEM 3 (GRID REACTS) SHIPPED — 4 reactions layered on the static grid, all tunables in CFG.juice.grid (12 spec keys); no grid rebuild
- Spec-literal note: 1-2 enemies read DIMMER than idle (formula floor 0.5+0.02n vs breathing 0.6-0.8) — flagged to user in playtest notes
- Item 4 (bullet feel), 5 (death/restart) NOT started, per protocol
- Awaiting user playtest verdict + "go" for ITEM 4

---
Task ID: 7
Agent: main (Super Z)
Task: DAY 1 JUICE PASS — ITEM 3 hotfix (max(breath, combat)) + ITEM 4 (BULLET FEEL) only; STOP for user playtest before Item 5

Work Log:
- User confirmed Item 3 + approved the flagged fix: grid baseline = max(breath, combat) before the 500ms ease (single drone must never dim the grid below idle)
- Hotfix in fxUpdate: breath sine always computed; combat target (when n>0) takes Math.max(breath, combat); ease unchanged. Verified: 1 enemy -> gridBase 0.779 (stays in 0.6..0.8 breath band); 20 enemies -> 0.882 (combat still wins above breathMax)
- ITEM 4 touched ONLY: 00 CONFIG (CFG.juice.bullet, 9 spec keys; pools.muzzles: 8), 02/03 FX (muzzlePool + muzzleFlash + updateMuzzles frame-exact countdown; impactSpark), bakeTextures (TEX.bullet/TEX.lance re-baked as directional streaks via bakeStreak()), 04 PLAYER (recT/recT0/recX/recY render state, playerReset clears, shipWrap position takes recoil offset), 05 BULLETS (fireBullet: recoil set + one muzzleFlash per trigger pull, old per-bullet emit retired; updateBullets: wobble bullets rotate streak to true travel dir — visual only), 07 COLLISIONS (hitEnemy non-lethal branch: white impactSpark at contact point replaces tinted puff), 13 RUN CONTROL (ticker updateMuzzles; startRun/showTitle release muzzle pool), NV hooks (+muzzle pool, muzzleFlash, impactSpark, shipWrap, M). No changes to fire rate, speed, damage, collision, spawn points
- 4a muzzle flash: pooled TEX.dot white sprite at barrel (+18px nose), frame-exact 3-frame countdown (same clock as kill flash), alpha 0.8 -> 0.53 -> 0.27 -> release, slight shrink; ONE flash per pull (not per bullet); static (no drift) so it never smears ship/trail
- 4b trail: bullets bake as tapered streaks — bright head (8px) + fading cyan tail (trailLength 10px baked at boot from CFG), thin white core line (trailCoreAlpha full whisper + hot front half), hot nose cap; LANCE same treatment (15px head); NOVA wobble bullets now rotate the streak to effective velocity; first bake iteration read as white slivers (tail tapered to 0.5px, cyan invisible) -> fixed to halfW 2.6->1.1 with smooth band interpolation, cyan now dominant with white core
- 4c impact spark: exactly impactParticleCount white TEX.spark shards at the enemy edge facing the bullet (d.pos - bulletDir * radius * 0.7), spray back toward shooter (rand cone ±0.9rad, 90-220px/s), 150ms life, pool curve fade; kill = enemy-colored burst, hit = white spark — reads are now distinct
- 4d recoil: fireBullet sets recT0/recT/recX/recY (opposite aim, recoilPx); playerUpdate offsets ONLY shipWrap.position (P.x/P.y untouched — bullets spawn unrecoiled, trailBuf records unrecoiled pose, hitbox/aim unmoved); linear ease-back over recoilMs; dt-driven so it freezes with hit-stop
- Muzzle/hit-stop model: inputs are NOT buffered — fireCd is dt-driven and dt=0 during freeze, so no shot (and no flash) can START during hit-stop; LMB held through a freeze fires after it ends; existing flashes finish their 3 frames through the freeze (feedback survives, gameplay frozen)
- E2E (agent-browser, headless ~3fps): muzzle white/frame-exact 3 frames/decays + pool empty after; streak texW 18 logical (old pill 14) + rot === velAng on live bullets; recoil probe (recoilMs stretched to 5s): mag 1.95 ≈ recoilPx, along −1.95 (exactly opposite aim), player position independent, mag_after_stop 0; hitstop 1.69s forced freeze with autoFire held -> zero new muzzles; impactSpark emits exactly 3 white shards life 0.15; tank integration: hp 22->17, alive, not dying (non-lethal path with sparks); startRun clean (muzzles 0, recT 0, offset 0); ZERO console errors; node --check SYNTAX OK; screenshot item4_bullets2.png (cyan streak firing line toward reticle)
- Synced served copy: public/game/index.html

Stage Summary:
- ITEM 3 HOTFIX SHIPPED (max(breath, combat) baseline, ease untouched) + ITEM 4 (BULLET FEEL) SHIPPED — all 4 sub-items, tunables all in CFG.juice.bullet (9 spec keys, no duplicates)
- Streak width/alpha balance (halfW 2.6->1.1, core alphas) is bake-internal — say the word if it should be exposed to CFG
- Item 5 (death & restart) NOT started, per protocol
- Awaiting user playtest verdict + "go" for ITEM 5

---
Task ID: 8
Agent: main (Super Z)
Task: DAY 1 JUICE PASS — Item 4 tune request (streak taper exposure) + ITEM 5 (DEATH & RESTART) only; STOP for user playtest

Work Log:
- User confirmed Item 4 (kept all judgment calls) with one tune request: expose the streak taper (bake-internal 5.2/2.2 full widths) as CFG keys; and issued "GO for ITEM 5" with the 3-part death/restart spec + exact CFG.juice.death defaults
- Tune request: CFG.juice.bullet.headWidth 5.2 / tailWidth 2.2 (full widths, px) wired into the TEX.bullet bake (bakeStreak halfW = headWidth/2, tailW = tailWidth/2); LANCE keeps its thinner dart profile (2.0/1.0) — only the standard bullet is exposed, per the request
- Touched ONLY: 00 CONFIG (juice.bullet +2 keys, new juice.death 15 keys, retire note on feel.dyingSlowmo/dyingTime), 01 CORE (S: vigA/shipFade/countT/countTo/nbT/promptT/slamT/slamDur/slamHit), 02 FX (fxUpdate: grid baseline FROZEN in over mode + vignette linear decay; vignetteFlash(); addSlamShake()), 03 POOLS (TEX.vignette canvas radial-gradient bake + vignetteSpr/wipeG/RS state machine), 04 PLAYER (playerHit fatal branch = own beat, no hurt juice; playerDie rewritten; ship alpha x shipFade), 05 BULlets bake (headWidth/tailWidth), 07 COLLISIONS (killEnemy hit-stop gated to mode==='playing'), 10 OVERLAYS (over screen rebuilt: goWrap slam container, NEW BEST gold flasher, FINAL SCORE label + huge 52px countup score, wave/best/coins, PRESS R pulse + tiny ESC hint; toOver rewrite; beginRestart/drawWipeBand/updateWipe/updateOverFx), 12 INPUT (R/Space/Enter/click -> beginRestart; ESC guarded), 13 RUN CONTROL (startRun juice-5 resets; ticker: updateOverFx + updateWipe on rawDt; reticle alpha x shipFade), NV hooks (+beginRestart, vignetteFlash, RS, wipeG, vignetteSpr, forceDie, over UI refs)
- a) DEATH BEAT (HP<=0): slow-mo 0.3x game-time for 500ms REAL (dyingT ticks on rawDt); 25 pooled TEX.dot particles in ship color (cyan on VECTOR), speed 40-140, size 1.0-1.8 — bigger+slower than kill shards; red edge vignette snaps 0.6 -> linear 0 over 140ms; A.boom() fires HERE; NO hit-stop, NO trauma, NO hurt flash, NO rings — and the fatal blow now skips the entire hurt-juice bundle in playerHit (judgment call, flagged); kills DURING the death beat still shake/score/pop but their hit-stop is suppressed (hitstop gated to playing)
- b) GAME OVER (after slow-mo releases): GAME OVER slams from -130px with ease-in over 140ms, world jolts 14px DOWN on IMPACT (addSlamShake overwrites the kill-shake channel, kAng = PI/2 +/- 0.12 — the only big shake in the game); score counts 0 -> final with ease-out over 400ms REAL time; NEW BEST! gold #ffd23c pulses 3x over 900ms then eases into solid; PRESS R TO FLY AGAIN sine 0.5..1.0 over 1.5s; grid baseline frozen (arena holds its breath), only shoot-flash residual decays; dim+content ride in with the slam (~90ms)
- c) RESTART: R/Space/Enter/click -> beginRestart(): black band + 2px cyan neon lip TRAVELS left->right (easeInOutQuad, 100ms per half, never a fade); at full cover startRun() resets EVERYTHING (score/wave/enemies/bullets/particles/ripples/shake/hitstop/HP/position/velocity/fireCd + all juice state) and shipFade -> 0; band keeps travelling and reveals the run while the ship fades in over 100ms (the only fade-in — multiplies playerSpr + reticle alpha); flying by 200ms; mash guard: beginRestart no-ops unless RS.phase==='none', so mashing R cannot double-restart or stack; ESC during wipe blocked; showTitle force-clears wipe state
- BEST persistence unchanged: META.best via localStorage at toOver (isBest = score > stored best && score > 0 — a wave-1 zero shows everything but never claims NEW BEST)
- E2E v2 (agent-browser, headless ~3fps; v1 findings were test-sequencing artifacts: score-set eval landed after toOver captured countup — fixed by setting score before forceDie in the same eval): death beat — mode dying, timescale 0.3, dyingT 0.5, hitstop 0, trauma delta 0, kMag delta 0, vigA 0.6 = sprite 0.6, exactly 25 cyan dot particles inside speed band; dying-window kill — same-tick kMag 6 (shake fires), hitstop STAYS 0, pending resolves, score +100; slam — re-armed deterministically, slamHit true, kMag exactly 14 mid-decay, kAng within 0.13 of straight-down, goY lands 0, overC alpha 1, shake settles to exactly 0; countup — mid-count 7570 (< final), final text 009100 exact, BEST 009100, META.best 9100 persisted to localStorage; NEW BEST — visible, gold, mid-pulse 0.97, holds at exactly 1; prompt alpha 0.97 in [0.5,1]; grid — base frozen to <1e-9 across ticks; restart — mash guard held (double beginRestart no-op), covered -> mode playing, full reset verified (score 0, hp 3, alive, vigA 0, kMag 0, pend 0, wave 1, enemies 0), band travels (stretched to 900ms + screenshot: black band + cyan lip mid-screen), wipeGone, shipFade 1, flying; wave-1 zero-score — over shows 000000 + REACHED WAVE 1 + GAME OVER alpha 1, no NEW BEST; streak regression — headWidth/tailWidth 5.2/2.2 live, TEX.bullet 18 logical px unchanged; ZERO console errors; node --check SYNTAX OK
- Screenshots: scripts/nv/item5_over.png (full over screen), item5_band_mid.png (wipe band mid-travel), item5_wipe.png
- Synced served copy: public/game/index.html (md5 c23de800... matches source)

Stage Summary:
- ITEM 4 TUNE REQUEST SHIPPED (headWidth/tailWidth in CFG.juice.bullet) + ITEM 5 (DEATH & RESTART) SHIPPED — all 3 sub-items, tunables all in CFG.juice.death (15 spec keys, no duplicates)
- Judgment calls flagged for user: (1) fatal blow skips the whole hurt-juice bundle (white flash/chromatic/hurt sound/knockback) so the death beat stands alone; (2) old death double-ring + fullscreen flash removed with the old explosion (new beat replaces it); (3) slam shake fires at slam IMPACT, straight down +/- jitter, duration = gameOverSlamMs; (4) countup uses ease-out quad; (5) explosion tint = ship.color (cyan on VECTOR, per-ship identity otherwise); (6) kills during the death slow-mo still pop but never freeze it; (7) kept the banked-CR line (small/dim) + tiny ESC hint — prompt text is exactly "PRESS R TO FLY AGAIN"
- DAY 1 JUICE PASS COMPLETE (all 5 items). Per protocol: NO Phase 2 work started — awaiting user playtest verdict on Item 5, the full CFG.juice tuning table, and the Phase 2 (content) conversation

---
Task ID: 9
Agent: main (Super Z)
Task: PHASE 2A — HUNTER ENEMY ("stop and time it") only; STOP for user playtest verdict

Work Log:
- User opened Phase 2 (content) with the hunter spec: replaces the v1.0 orbit+charge hunter's brain entirely — approach to range, plant, telegraphed lead shot, killable during wind-up. Same protocol: extend CFG, no duplicate keys, STOP with tuning table
- CFG: old flat CFG.hunter block REPLACED by CFG.enemies.hunter (17 keys: radius 17 = 1.3x drone, hp 2 (+hpPerTier 1), speed 90, accel 360, score 250, fireRange 320, windUpMs 350, cooldownMs 900, bulletSpeed 220, bulletDamage 1, leadFactor 1.0, aimLineWidth 1.5, aimLineAlphaStart 0.25, aimLineAlphaEnd 1.0, colorPrimary 0xc000ff, colorBullet 0xff4080); retired: ring/ringSlack (orbit), fireMin/fireMax (random cycle), charge, predict 0.7 + its hidden wave-scaling bump. COL.hunter/hunterHi now DERIVED from colorPrimary (lerpColor to white 0.72) — single color source feeds telegraph ring, kill juice, grid ripple, bakes
- Spawn ratio: waves.weights.hunter 0.6 -> 0.32. Naive 0.25 under-delivers (observed 0.183) because the sub-3-budget tail forces all-drone picks; 0.32 lands observed ratio 0.242-0.268 across runs (target 0.25 = 1 per 4 drones). Wave 1-2: zero hunters (20x buildQueue(6,1) all-drones)
- Visual: HUNTER_PTS rebaked as chevron-diamond (nose 20 vs drone 15 = 1.3x) + inner chevron stroke + core eye; wind-up glow = lazy per-hunter additive halo child (TEX.dot, colorPrimary), alpha/scale ramp with progress + 22Hz pulse; TEX.hbullet = white comet orb (halo r10 + ring + core + tapered tail cone) tinted colorBullet at spawn, sprite rotation locked to travel angle
- AI: state machine st: approach (steer to player, same accel model as drone, brake exp(-6dt) inside fireRange) -> windup (planted exp(-9dt), wT counts dt, predicted intercept recomputed EVERY frame: player.pos + player.vel * tof * leadFactor, tof = dist/bulletSpeed, clamped to arena so the line never draws into the letterbox) -> fire (1 orb toward predicted point off the nose, tinted muzzleFlash at 16px, render-only recoil via sprite pivot kick 2.6px decaying over juice.bullet.recoilMs, A.ui) -> cooldown (stalk toward player, cT -> approach). Nose faces the aim while winding (lerpAngle 14), the player otherwise
- Telegraph: ONE shared aimG Graphics (additive, above enemies) redrawn per frame from live state — line = actual bullet path from nose (12px out) to predicted point + 2.6px impact pip; color lerpColor(colorPrimary -> white) and alpha 0.25 -> 1.0 across the wind-up. S.aimLines = live count (verify hook). Line vanishes the exact frame the orb spawns — telegraph strictly BEFORE the shot; a dying/cancelled hunter can never leave an orphan line
- Wiring: fireEnemyBullet gained dmg + tex params (backwards compatible, texture explicitly reset per spawn); ebPool bullets carry dmg -> updateEBullets -> playerHit(dx, dy, knock, dmg) — playerHit gained dmg param (default 1, contact damage unchanged). Hunter bullets never touch other enemies (ebPool only checks player, unchanged). killEnemy hides halo on corpses
- E2E nv_phase2a_verify.sh (v2, state-driven polling after frame-rate variance broke v1's fixed waits; windUpMs stretched to 30s to hold the telegraph open for probing): config sanity (all 17 keys, old flat block gone, COL sourced, weight 0.32, comet tex baked, hunter tex wider than drone); spawn ratio wave1 0 hunters / wave3 0.242-0.268; spawn at 260px -> brakes -> windup holds (spawnK 1, planted, velNearZero); lead probes: aimX +129px ahead at vx 250 (tof 1.05), -110px behind at vx -200 — the line tracks velocity direction live; dim screenshot (line nose->player + pip); late-windup fade armed; fire: exactly 1 orb, comet tex, rotation === atan2(vy,vx), aims at parked player <0.1rad, speed exactly 220, dmg 1, aimLines 0 same frame, cooldown cT 0.9 exact (v1 run evidence); orb onto player -> hp 3->2, orb consumed; kill during windup: pending resolves, no orphan line/bullet, +250 exact, 12 purple burst particles; restart hygiene (aimLines 0, hunters 0, wave1 queue all drones); ZERO console errors; node --check SYNTAX OK
- Screenshots: scripts/nv/phase2a_telegraph_dim.png (line + pip readable), phase2a_telegraph_bright.png (caught the fire frame: orb leaving, line already gone), phase2a_orb.png
- Synced served copy: public/game/index.html (md5 6831a6dd... matches source)

Stage Summary:
- PHASE 2A HUNTER SHIPPED — one new threat, no waves/bosses/upgrades touched; drones/spinners/tanks behave exactly as before (only the hunter slot changed + the hunter spawn weight)
- All tunables in CFG.enemies.hunter (17 keys); one spawn-system key touched: waves.weights.hunter 0.6 -> 0.32 (ratio spec)
- Judgment calls flagged: (1) speed 90 rides sharedSpeedMult like every enemy (existing tier ramp); (2) hpPerTier 1 kept (existing progression); (3) hunter creeps ~90px closer per 900ms cooldown (spec-literal: cooldown stalks toward player) — may hug the player over long engagements, watch in playtest; (4) recoil = render-only pivot kick (enemy sprites carry gameplay position, so the player-style container offset doesn't apply); (5) predicted point clamped to arena (bullet dies at the wall anyway); (6) hidden wave-scaling of aim accuracy retired — leadFactor is now a pure tunable; (7) fire sound stays A.ui() (no new synth without permission)
- Awaiting user playtest verdict on the 5 evaluation questions; NO further enemy work until then

---
Task ID: 10
Agent: main (Super Z)
Task: PHASE 2A.2 — SPINNER ENEMY ("find the gap") only; STOP for user playtest verdict

Work Log:
- User confirmed the hunter and opened 2A.2: reworks the v1.0 spiral sprayer's brain entirely — lazy drift (never chases), readable charge, one radial ring all at once, shifting gaps. Same protocol: extend CFG, no duplicate keys, STOP with tuning table
- CFG: old flat CFG.spinner block REPLACED by CFG.enemies.spinner (20 keys: radius 11 = slightly under drone 13, hp 3 (+hpPerTier 1), speed 40, accel 130 (v1.0 kept), score 400 (v1.0 kept, rich drops stay), driftTimeMs 1400, windUpMs 500, sprayRecoveryMs 200, bulletCount 8, bulletAngleOffset 0 (live base; per-cycle shift applied internally), bulletSpeed 180, bulletDamage 1, spinRateIdle 0.4, spinRateWindup 2.0, chargeRingRadius 40, chargeRingAlpha 0.7, colorPrimary 0xffcc00, colorBullet 0xffaa44). Retired with the old brain: sprayEvery/sprayDur/coolDur/sprayRot, plus dead v1.0 fields d.sprayT/d.emitCd/d.ax/d.ay/d.fireT in spawnEnemy. COL.spinner/spinnerHi now DERIVED from colorPrimary (lerpColor white 0.72) — single color source feeds sprite bake, halo, charge ring, kill juice
- Spawn ratio: waves.weights.spinner 0.4 -> 0.22, calibrated the same way as the hunter weight — observed wave-5 count ratio lands EXACTLY 0.167 = 1 spinner per 6 drones (target spec). unlock.spinner 5 already = 2 waves after hunter (3); wave 1-4 queues contain zero spinners
- Visual: SPINNER_PTS rescaled to an 8-point gear star (outer 13 / inner 5.5 — reads just under the drone's 15; hitbox 11) + inner star stroke + white hub dot; TEX.sbullet = smaller + dimmer comet orb than the hunter's (halo 6.5 vs 10, ring 4.2 vs 6.2, core 2.1 vs 3.2, shorter tail cone, lower alphas) tinted colorBullet at spawn, rotation locked to travel angle so tails point outward
- AI: state machine st: drift (steers toward a random heading at speed 40 x sharedSpeedMult, NEVER toward the player; heading reflects off arena walls BEFORE steering into them (driftA = PI - driftA / -driftA); sprite spins at spinRateIdle; after driftTimeMs -> windup; FIRST drift staggered rand(0.5,1)x driftTimeMs so simultaneously spawned spinners don't pulse in sync) -> windup (planted exp(-9dt); sprite spins at spinRateWindup (5x idle); additive halo child ramps + pulses; after windUpMs fires the WHOLE ring: bulletCount orbs at sprA + bulletAngleOffset + i/n*TAU, one frame, muzzleFlash + A.ui; then sprA += TAU/n*0.5 — the gaps shift half a step EVERY cycle so parking in one safe spot fails) -> spray (sprayRecoveryMs settle, velocity damped) -> drift on a fresh random heading
- Telegraph: charge ring = ONE shared additive Graphics (spinnerG) redrawn per frame from live state — radius expands outward 0.35x -> 1.0x chargeRingRadius (14 -> 40) while alpha rises (chargeRingAlpha x (0.35 + 0.65 prog) x subtle 18Hz pulse), color colorPrimary; drawn r/alpha stashed on the enemy for the verify hook; S.spinnerRings = live count. Vanishes the exact frame the spray fires; a spinner dying mid-wind-up can never leave an orphan ring (same no-orphan architecture as the hunter aim line). spawnEnemy retints any reused halo child (pool objects are kind-agnostic: a hunter corpse's purple halo can never glow on a spinner)
- Wiring: fireEnemyBullet with dmg + TEX.sbullet (same path the hunter uses); spinner orbs live in ebPool -> only ever check the player, never other enemies; windup state machine advances only while chasing; kill-during-windup = pendingKills path, no orphan anything; hp 3 = survives 2 hits, dies on the 3rd; kill juice in COL.spinner yellow; contact shove (heavy body, stays alive) unchanged from v1.0
- E2E nv_phase2a2_verify.sh (state-driven polling; windUpMs stretched to 30s to hold the charge open; dt-clamp makes game-time ratios exact): config sanity (20 keys, flat block gone, colors sourced, sbullet baked smaller than hbullet, spinner tex smaller than drone); spawn ratio wave1 0 / wave5 0.167 exact; DRIFT — speed in band (40), does NOT approach the player (dist 385 -> 389), idle spin rate measured 2.51 rad/s = spinRateIdle x TAU EXACT; WINDUP — planted (<30 px/s), halo visible, ringR matches the expansion formula to <1px, ringA in band, windup spin rate measured 12.57 rad/s = spinRateWindup x TAU EXACT (5x idle); SPRAY — exactly 8 orbs in one frame, all comet tex, rotation locked to travel angle (mod 2pi — spray angles wrap past pi), spacing even at pi/4, speed exactly 180, dmg 1, ring gone same frame (S.spinnerRings 0), recovery ticking; orbs pass THROUGH a drone untouched (ebPool has no enemy collision); gap shift — forced exactly-one spray advances sprA by 0.392699 = TAU/16 to float precision, one spray only; orb onto player -> hp 3->2, orb consumed; kill during windup — pending resolves, no orphan ring/bullet, +400 exact, 12 yellow burst particles; hp 3 via real hitEnemy route — survives 1, survives 2, dies on 3; wall bounce — heading due west reflects to due east (driftA PI -> 0) at the boundary; restart hygiene — wave1 queue all drones, no rings, no spinners; ZERO console errors; node --check SYNTAX OK
- Screenshots: scripts/nv/phase2a2_charge_ring.png (glowing gear star in wind-up), phase2a2_spray.png (the 8-orb ring expanding all at once)
- Synced served copy: public/game/index.html (md5 27de3dda... matches source)

Stage Summary:
- PHASE 2A.2 SPINNER SHIPPED — one reworked threat, no waves/bosses/upgrades touched; drones/hunters/tanks behave exactly as before (only the spinner slot changed + the spinner spawn weight)
- All tunables in CFG.enemies.spinner (20 keys); one spawn-system key touched: waves.weights.spinner 0.4 -> 0.22 (ratio spec, lands 1:6 measured)
- Judgment calls flagged for user: (1) speed 40 + bulletSpeed 180 ride sharedSpeedMult / DIFF().bullet like every enemy (existing tier ramp); (2) hpPerTier 1 kept (existing progression); (3) score 400 + rich v1.0 drops kept (spec silent — it stays a priority target); (4) first drift staggered rand(0.5,1)x driftTimeMs so co-spawned spinners desync (readable rhythm, not a metronome choir); (5) charge ring expands OUTWARD (visual spec wording wins over the behavior spec's "inward, your call"); (6) new drift heading re-rolled every cycle + reflected off walls — drift reads lazy, not patrol-like; (7) recovery damps velocity at exp(-4dt) so the settle is visible but brief; (8) fire sound stays A.ui() (no new synth without permission); (9) NV hooks gained spinners/spinnerState/hitEnemy (debug-only)
- Awaiting user playtest verdict on the 5 evaluation questions (read the wind-up? spray fair? gap shift kills parking? adds tension? prioritize spinners?); NO further enemy work until then

---
Task ID: 11
Agent: main (Super Z)
Task: PHASE 2B — UPGRADE CARDS (roguelike backbone) only; STOP for user playtest verdict

Work Log:
- User confirmed the spinner and opened 2B: card screen between every wave, exactly 12 build-defining cards, no reroll. Same protocol: extend CFG, no duplicate keys, STOP with tuning table. Spec added one requirement on top: hover/focus plays a 1-second visual-only preview of the card's effect on the player ship
- CFG: CFG.upgrades EXTENDED (meta shop twin/overcharge/magnet untouched, no key collisions) with the 3 spec keys (screenMs 1000, cardGrowScale 1.05, dimAlpha 0.6) + card geometry (cardW 210 / cardH 300 / cardGap 40 / absorbMs 420) + 15 per-card numeric tunables (fastFirePct 0.25, quickFeetPct 0.20, pierceAdd 1, spreadBullets 2, spreadArcAdd 0.12, spreadDmgCut 1, dashChargeAdd 1, fastDashCut 0.40, maxHpAdd 1, maxHpHeal 1, regenWaves 3, regenHeal 1, lastStandRadius 80, explosiveRadius 12, explosiveDamage 2, magnetRadiusPct 0.50, magnetCoinPct 0.25). NEW CFG.player.dash block (charges 1, cooldownMs 1600, speed 880, timeMs 140, iframesMs 220) — the spec-mandated basic dash chassis (no dash existed)
- NEW BAND 14 UPGRADES: the 12 card defs exactly as spec'd ({id, name, desc, category, unique, icon}; RICOCHET / EXPLOSIVE KILLS / LAST STAND unique, the rest stack; uniform rarity), applyUpgrade(), eligibleUpgrades() (owned uniques leave the pool), drawCards() (splice-bag = 3 DISTINCT, no dup), lastStandBlast() + explosiveBurst(), and the whole card screen: cardC on overlayRoot with its own AdvancedBloomFilter, dim 0.6 black, staggered pop-in with easeOutBack, hover = grow to cardGrowScale + border brighten + A.ui + 1s LOOPING preview, pick = fly-to-ship absorb (ease-in, 420ms) + white ship flash + popup + A.gun -> un-dim -> startWave(n+1)
- Run state: player.up bag (12 counters, spec shape) resets in playerReset on death; RUN.regenT for the REGEN counter; NOTHING persisted (meta shop stays separate)
- Data-driven fire path: fireBullet reads the bag — count = tier count + spread*2, fan arc = tier spread + spreadArcAdd*stacks, dmg = max(1, tier dmg - spreadDmgCut) when spread owned, pierce = tier pierce + pierceAdd*stacks, bounces = ricochet flag; TWIN keeps its parallel lanes until SPREAD joins. Tier behavior byte-identical with an empty bag
- RICOCHET: updateBullets reflects off arena walls before the out-of-bounds kill (clamp-back = no tunneling), b.last = null on bounce (same enemy re-hittable), impact spark on the bounce
- DASH (basic): SHIFT/SPACE, edge-triggered (dashHeld), input-dir or facing, velocity burst ignoring the speed cap for timeMs, brief i-frames, puff + micro-trauma; charges recharge one at a time over dashCd() (FAST DASH cuts 40%/stack, 250ms floor); DASH CHARGE adds capacity, granted ready. HUD: DASH label + diamond charge pips bottom-left (crisp layer), rebuilt when max changes
- Wiring: wavesUpdate clear branch now funnels Wv.phase 'cards' with cardT = screenMs (the old 'breather' phase is superseded — the card screen IS the breather; CFG.waves.breather key left in place unused); delay ticks in 'playing' so stray bullets stay dodgeable; mode 'cards' freezes the world while S.time keeps the grid breathing + banner/popups finish; ticker 'cards' branch runs cardUpdate on REAL time; reticle + ship trail active in 'cards'; input: Digit/Numpad 1-3 pick, click hit-tests cards; startRun/showTitle reset the screen + bag; LAST STAND fires in playerHit after damage lands (cannot undo the hit), EXPLOSIVE procs in finalizeKill (chains ride the deferred-pop path); MAGNET multiplies into updatePickups radius (stacks with meta MAGNETIZER) and rounds coin value up in collectPickup; REGEN heals regenHeal x stacks every regenWaves wave starts, silent at full HP
- Preview system (spec addition): own 48-sprite set on pvL ABOVE the cards (world coords map 1:1 onto the unshaken overlay — no occlusion), per-card 1s script looping while hovered — spread = 5-streak fan from the nose, pierce = streak through a ghost drone, ricochet = wall-impact then deflected streak (delayed spawns), explosive = burst ring + sparks, fastFire = triple muzzle flicker, quickFeet = ship afterimages, dashCharge = popping pips + streak, fastDash = streak + shrinking ring, maxHp = ghost ship + heal cross (TEX.plus), regen = green crosses converging, lastStand = expanding 80px ring + sparks, magnet = coins pulled in. Visual only — never touches game state
- E2E nv_phase2b_verify.sh (state-driven polling; deterministic tricks: field held via Wv.phase 'cards' + cardT 9999, gun rate stretched to 0.5/s for single-volley isolation, dash timeMs stretched to 800 for the burst probe, synthetic keys ALWAYS keyup-cleaned because the edge-trigger is real): config sanity (3 spec keys + dash block + meta shop intact + 12 cards + 3 uniques); dash — Space spends charge (1->0), burst exactly 880 in band, i-frames set, recharge completes, DASH CHARGE max 2 granted ready, FAST DASH cd observed decaying from 0.96; fire path — baseline volley exactly 1, spread volley exactly 3 with dmg cut to 1, LANCE volley 3 with dmg 2 and pierce 3 (tier 2 + card 1 proves stacking), wall bounce observed with charge spent and bullet alive inside the arena; explosive — corpse burst chains the 20px-away neighbor, exactly 2 kills, no orphans; last stand — hp 3->2, drone at 50px killed, drone at 266px alive; magnet — coin at 140px (outside base 110, inside magnetized 165) pulled and collected for exactly 6 CR; max hp — cap 4 + heal to 3; regen — silent at waves 2-3, heals on the 3rd wave start, counter resets; quick feet — sustained-thrust speed lands exactly 432 = 360 x 1.2; funnel — clear lands first (playing mode, cardT counting from ~1.0), then dim + 3 distinct cards with [ 1 ] [ 2 ] [ 3 ] keys, all 12 eligible; hover — grow to 1.043->1.05 caught mid-ease, preview id matches the card (5-sprite spread fan observed), unhover clears; pick via Digit1 — absorb, screen closed, wave 2 starts, stack = 1; draw integrity — 100/100 draws all-distinct, owning the 3 uniques leaves exactly 9 eligible; restart hygiene — bag zeroed, dash 1/1, screen closed, meta untouched; ZERO console errors; node --check SYNTAX OK (3401 lines)
- Screenshots: scripts/nv/phase2b_cards.png (full screen: dim + 3 category-colored cards + icons), phase2b_preview.png (hover grow + spread fan preview floating over the cards), phase2b_absorb.png
- Synced served copy: public/game/index.html (md5 b5b860fb... matches source)

Stage Summary:
- PHASE 2B UPGRADE CARDS SHIPPED — the roguelike backbone: every wave clear pauses the run for a 1-of-3 pick; exactly the 12 spec'd cards, nothing extra; per-run only, never persisted; no reroll (v1)
- One prerequisite system shipped with it per the spec's own contingency: BASIC DASH (no dash existed; DASH CHARGE / FAST DASH needed the chassis). All dash numbers in CFG.player.dash
- All tunables in CFG.upgrades (+ CFG.player.dash); zero duplicate keys; meta shop untouched
- Judgment calls flagged for user: (1) explosiveRadius is SPEC-LITERAL 12px — that is SMALLER than a drone's radius (13), so the burst only procs on near-overlapping enemies; the card is honest but weak at 12. If it never chains in playtest, raise explosiveRadius to 60-120 (one number). (2) LAST STAND kill test is dist <= 80px + victim radius (bodies at the edge count). (3) DASH CHARGE grants the new charge READY (generous read of "+1 dash charge"). (4) SPREAD's "slight damage down" = flat -1 per bullet (LANCE 3->2, everything else floors at 1). (5) TWIN's parallel lanes collapse into the wider fan once SPREAD is owned (two systems fighting over bullet layout otherwise). (6) Card-screen sound is the existing tier/gun synth chimes — no new synth without permission. (7) The wave-clear banner may still be fading behind the dim when cards pop (banner rides the crisp layer) — reads as the clear moment decaying, flagged in case it bothers. (8) REGEN counts wave STARTS from the pick (heals on the 3rd start after owning it)
- Awaiting playtest verdict on the 5 focus questions (moment vs popup? <2s read? ship meaningfully different at wave 10? reroll urge? delay length?); NO protect missions or any other system until then
