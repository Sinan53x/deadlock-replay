# @deadlock-replay/view3d

Not started. Planned for week 2–3 of the [roadmap](../../ROADMAP.md).

The 3D view renders the same `Timeline` as `view2d`, so the 2D/3D toggle is a renderer swap, not a second data path.

- **Map:** `citadel.vmap_c` exported to glTF with [Source2Viewer](https://github.com/ValveResourceFormat/ValveResourceFormat) once per patch, then `gltf-transform optimize` (meshopt geometry, KTX2 textures, LODs). Served from R2.
- **Heroes:** only the 12 heroes in the loaded match are fetched. Animation is picked from game state (idle, run, shoot, death), not reconstructed from the networked animgraph.
- **Abilities:** drawn as stylized markers from `casts` and projectile entities, not particle-system recreations.
- **Budget:** 60 fps on a mid-range laptop. The static map merges into few draw calls with distance culling; 2D stays the fallback for phones.
