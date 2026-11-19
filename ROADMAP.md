# Roadmap

Each slice ships something usable on its own. Every issue states its acceptance test before work starts, and all tests run offline against the fixture demos.

## Week 1: 2D replay from a match ID

- [x] Parse a demo into a timeline: positions, facing, health, kills, ability casts
- [x] 2D viewer with play, scrub, speed, kill feed
- [x] `?t=mm:ss` share links
- [ ] Parse in the browser: drop a `.dem` file onto the page, nothing uploaded
- [ ] Load by match ID through a Cloudflare Worker that streams from Valve's replay CDN
- [ ] Hero names and portraits instead of hero IDs
- [ ] Game clock from game rules instead of demo start, so times match the in-game clock
- [ ] Two more fixture matches from different patches, with golden timeline snapshots

## Week 2: 3D map

- [ ] Source2Viewer export of `citadel.vmap_c` to glTF, scripted per patch
- [ ] `gltf-transform` pipeline: meshopt, KTX2, LODs, size budget enforced in CI
- [ ] Three.js scene that streams the map and holds 60 fps on a mid-range laptop
- [ ] 2D/3D toggle on the same timeline and clock

## Week 3: heroes in 3D

- [ ] Hero models for the 12 heroes in the match, fetched on demand
- [ ] Animation picked from state: idle, run, shoot, death
- [ ] Ability casts and projectiles as stylized markers
- [ ] Follow cam, free cam, top-down cam

## Week 4: strats

- [ ] Pause and draw on the map (lines, arrows, circles), in 2D and 3D
- [ ] Drawings saved in the share link
- [ ] Playwright screenshot tests at fixed ticks for both renderers
