# KD RPG WORLD Plan

## Objective
Create a single KD pixel world that blends multiple biomes/themes while keeping agent workflow visibility clear.

## World Composition
1. `Guild Command` zone:
- warm wood office floor
- desks, shelves, main coordination hub
- best for `main-agent`, `engineer`, `tech-lead`

2. `Dark Ops` zone:
- dark tech chamber
- servers, runes, crystals
- best for `security`, `qa`, `devops`

3. `Wild Frontier` zone:
- exploration biome
- trees, rocks, water, bridges, camp
- best for `analyst`, `pm`, `architect`, `release-manager`

## Asset Sources (from `Assets.zip`)
1. `craftpix-net-189780...guild-hall...zip`:
- core interior/exterior architecture
- walls, floors, furniture

2. `craftpix-net-654184...home...zip`:
- natural props, extra environment pieces

3. `craftpix-net-555940...male...zip`
4. `craftpix-net-419402...female...zip`
- animated 4-direction character sets

5. `craftpix-net-255216...ui...zip`
- pixel UI skin elements

## Implementation Phases
1. `Phase 1 (done)`:
- KD RPG WORLD multi-zone map in frontend engine
- role-based spawn by zone
- richer object/tile rendering

2. `Phase 2`:
- import selected Craftpix atlases into `frontend/public/assets/kd-rpg-world/`
- add extraction script with cleanup:
  - remove `__MACOSX`
  - ignore coupons and promo files
  - copy only runtime PNG and license metadata

3. `Phase 3`:
- replace primitive tile drawing with sprite atlas rendering
- map TMX layers to KD runtime tiles
- keep walkable/collision map generated from object layers

4. `Phase 4`:
- port same world renderer into VS Code native panel build
- keep Antigravity web observer visually consistent

## Licensing Checkpoint
Before packaging for npm/public release:
1. verify Craftpix license permits redistribution in your delivery mode
2. include attribution/notice files if required
3. if redistribution restricted, keep asset import local/project-only
