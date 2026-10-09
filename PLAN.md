# Mandala Effect: Implementation Plan

1. Create the Vite + TypeScript project with pnpm, plus Vitest.
2. `src/numerology.ts`: letter values, reduce with master numbers, Life Path, Birthday, Expression, Soul Urge, Personality, and the mapping to drawing parameters. Unit tests in `src/numerology.test.ts`.
3. `src/rng.ts`: string hash and a seeded random number generator, so the same inputs always produce the same mandala.
4. `src/geometry/`:
   - `rings.ts`: ring boundary radii (golden and even).
   - `motifs.ts`: one function per ring motif. Each function receives a `RingContext` (inner and outer radius, copy count, half-repeat offset, mask edges, and the ring's tips, outlines, dots, wave depth, and cymatics modes) and makes drawing calls on 2 pens (`pen.ts`): 1 for the main lines and 1 for thinner details.
   - `centers.ts`: Chladni medallion (marching squares), Seed/Flower of Life, phyllotaxis.
5. `src/render.ts`: combine center and rings into layers: recorded drawing calls, each with a line width and a ring mask. `src/gl.ts` draws the layers on the page with WebGL, and `src/svg.ts` writes them as an SVG file.
6. `src/main.ts` and `index.html`: control panel, numerology readout, live redraw on every change.
7. `src/export.ts`: SVG download (from `src/svg.ts`) and PNG download (the layers drawn with WebGL on a 3000 × 3000 canvas).
8. Run the tests and the type check, start the dev server, and check that the page generates output for several inputs.
