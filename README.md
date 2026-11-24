# Surya Bay v11

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/musemosmouses/surya-bay-v11/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/musemosmouses/surya-bay-v11/reward.svg)](https://make.fun/bounty/gta6-01)

[![make.fun](https://img.shields.io/badge/make.fun-gta6--01-orange)](https://make.fun/bounty/gta6-01)

**Surya Bay** — an original sun-soaked coastal open world for the make.fun
`gta6-01` bounty ("Make GTA 6"). Third-person, three.js, fully offline:
walk the streets, steal and drive cars, and take 5+ boats out of the harbor.

## What is in the game

- **Open world**: seeded procedural city (~12×12 blocks), beach, sea,
  harbor district with piers, containers, cranes and warehouses.
- **On foot**: WASD + mouse camera, sprint, punch, pistol + shotgun
  (5-pellet spread, muzzle flash, hitmarker, `Q` to swap weapons).
- **Driving**: `E` to enter/exit any car, arcade physics, handbrake,
  traffic AI, 36 pedestrians who flee gunfire.
- **Boats**: driveable boats in the harbor; marine police patrol boats
  chase and ram you when wanted on the water.
- **Wanted system**: 0–5 stars with decay, land police chases, police
  helicopter with spotlight at 3+ stars, dispatch panel with live
  callsigns and tactics, including a MARINE section and an AIR ONE row.
- **Weather & tide**: deterministic CLEAR → RAIN → STORM cycle (300 s),
  400 s tide; rain makes roads slick, high tide floods the beach strip
  (cars stall, on-foot speed ×0.6), storms darken the sky.
- **Missions**: 8 story missions — courier runs, a boat-escape Harbor Run,
  a 5-gate Sunset Sprint race, and the King of Surya Bay finale
  (6 rivals, $1,500) — plus a repeatable street-race side job. Harbor
  Delivery runs can go HOT (~40%, seeded): extra stars plus a sea chase.
- **Progression**: money, ranks COURIER → RUNNER → FIXER → KING, crew
  ability cards (3, all with real mechanics), save/load in localStorage.
- **Presentation**: dense HUD (health/armor, cash, stars, weapon slots
  1–7, speed, minimap with roads/player/police/boats/gates), NPC
  dialogue box with portrait tied to live mission steps, radio lines,
  WebAudio synth SFX + music loop, start screen and pause.
- **Deterministic**: seeded RNG throughout; `?shot=` query stages
  deterministic captures for screenshots.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Controls

| Key | Action |
| --- | --- |
| WASD / mouse | Move / camera |
| Shift | Sprint |
| E | Enter / exit car or boat |
| F | Punch |
| Click | Fire weapon |
| Q | Swap pistol / shotgun |
| 1–7 | Weapon slots |
| R | Radio next line |
| P / Esc | Pause |
| M | Mute |

Repo: `surya-bay-v11` · bounty slug `gta6-01` · built from scratch for v11.
