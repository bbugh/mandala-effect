# Mandala Effect: Implementation Plan

1. Create the Vite + TypeScript project with pnpm, plus Vitest.
2. `src/numerology.ts`: letter values, reduce with master numbers, Life Path, Birthday, Expression, Soul Urge, Personality, and the mapping to drawing parameters. Unit tests in `src/numerology.test.ts`.
3. `src/rng.ts`: string hash and a seeded random number generator, so the same inputs always produce the same mandala.
4. `src/geometry/`:
   - `rings.ts`: ring boundary radii (golden and even).
   - `motifs.ts`: one function per ring motif. Each function receives the inner radius, the outer radius, the symmetry count, and the random generator, and returns SVG markup.
   - `centers.ts`: Chladni medallion (marching squares), Seed/Flower of Life, phyllotaxis.
5. `src/render.ts`: combine center and rings into one SVG string.
6. `src/main.ts` and `index.html`: control panel, numerology readout, live redraw on every change.
7. `src/export.ts`: SVG download and PNG download (SVG drawn into a canvas).
8. Run the tests and the type check, start the dev server, and check that the page generates output for several inputs.
