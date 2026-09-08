# Experimental procedural biomes

Choose a location under **Біом → Тестові генератори**, or follow the trail north:
Jungle → Forest → EZ-Tree grove → THREE.Terrain valley → simplex meadows → FastNoiseLite hills → SeedThree garden → Jungle. South reverses this route.

- EZ-Tree 1.1.0: real Oak/Ash/Aspen generator, three seeded variants shared across at most 39 trees. Its ~3 MB compressed texture/code chunk loads only on demand.
- THREE.Terrain 3.1.1: seeded PerlinDiamond heightfield, sampled by both visible ground and walking physics.
- simplex-noise 4.0.3: seeded layered 2D noise for gently rolling ground.
- fastnoise-lite 1.1.1: OpenSimplex2 ridged fractal terrain. Existing pine vegetation is reused for the three terrain comparisons.
- SeedThree: vendored Weber–Penn skeleton and RNG from SkyeShark/SeedThree, pinned in src/vendor/seedthree/UPSTREAM_COMMIT. Only the math import changes from three/webgpu to three. A local WebGL branch/leaf renderer is used; this is not the upstream WebGPU renderer or its LOD system.

MIT notices are distributed in public/licenses. All procedural geometry is generated on biome entry/regeneration, not during walking. Experimental plant counts are lower than the original forests. FPS depends on the device; no performance improvement is claimed. Biome changes retain the existing short fade, rather than streaming one continuous world.

Validation: npm run build; node check-experiments.mjs (all seven biomes and entire trail circuit), node check-travel.mjs, node check-movement.mjs. Browser scripts expect Vite on port 5173 and the bundled Playwright runtime.
