# Mandala Effect: Specification

A web page that generates black-and-white line-art mandalas from exact geometry. The user sets parameters by hand, and exports the result as SVG or PNG to print and color.

## Version 1 scope

### Inputs

1 panel of controls, with no tabs, contains every parameter. Controls that do not apply to the current mandala are disabled, never hidden.

### Numerology (Pythagorean system), not on the page

The Pattern tab that used this was removed from the page. `src/personal.ts` and `src/numerology.ts` still contain it.

Letters convert to numbers in a 1 to 9 cycle: A=1, B=2, ... I=9, J=1, ... R=9, S=1, ... Z=8.

"Reduce" means: add the digits together until the result is a single digit, except stop at the master numbers 11, 22, and 33.

| Number | Calculation | Drawing parameter |
| --- | --- | --- |
| Life Path | Reduce month, day, and year separately, add them, reduce the sum | Rotations (used only by the rotated cymatics center) |
| Birthday | Reduce the day of the month | Number of rings |
| Expression | Reduce the sum of all letters in the name | Variation seed (which motif goes in which ring), and the spoke count of the outermost ring |
| Soul Urge | Reduce the sum of the vowels (A, E, I, O, U) | Cymatics mode `n` |
| Personality | Reduce the sum of the consonants (Y counts as a consonant) | Cymatics mode `m` |

Life Path to rotations: 1 → 6, 2 → 12, 3 to 9 → 2 × Life Path, 11 → 22, 22 and 33 → 24.

Birthday to rings: 3 + ((Birthday − 1) mod 5), which gives 3 to 7 rings.

Cymatics modes: master numbers are reduced to a single digit for this mapping. If `n` equals `m`, `m` becomes `m + 1`, because equal modes produce a blank plate.

The variation seed combines the Expression number with the name and birthdate text, so 2 people with the same Expression number still get different mandalas.

### Geometry

1. **Copies per ring:** each ring repeats its motif its own number of times (1 to 200). No setting ties one ring's count to another ring's count.
2. **Golden ratio ring spacing:** the center medallion radius is R / φ² (φ = 1.618...), and the ring boundaries between the medallion and the outer edge form a geometric sequence. A "Uniform" spacing option (equal ring widths) is also available.
3. **Center medallion**, one of:
   - **Cymatics, Chladni plate:** the nodal lines of a vibrating square plate, `cos(nπx)·cos(mπy) + cos(mπx)·cos(nπy) = 0`. Lines are traced with marching squares. When n equals m the formula with "−" is 0 everywhere, so equal values use "+" instead, which draws a grid of straight lines. n = m = 1 has no lines inside the circle with either sign. This is the default center.
   - **Cymatics, rotated:** the same plate function summed over rotated copies. The Rotations slider (3 to 24) sets the number of copies. At high counts this figure becomes mostly concentric wavy circles.
   - **Seed of Life / Flower of Life:** overlapping circles on a hexagonal grid.
   - **Phyllotaxis:** a sunflower seed head, dots placed at the golden angle (137.508°), with a Fibonacci number of dots.
4. **Ring motifs.** The variation seed picks a motif, a copy count, and the ring options for each ring. In the controls panel, each ring has its own motif menu, a Spokes slider (1 to 200), and its own ring options. A ring shows only the options that change its motif: lotus petals and arches have tips (pointed or round), inner outlines, and dots; the diamond lattice has inner outlines and dots; the rose braid has wave depth, inner outlines, and dots; the dots ring has dots; the cymatics ring has its own Cymatics n and m sliders (1 to 12, separate from the center's); the Flower of Life band has none. On page load every ring uses pointed tips, inner outlines on, dots off, wave depth 0.36, and cymatics modes n = 3 and m = 5. Motifs:
   - Lotus petals: each petal's base starts at the inner border line
   - Scallops (arches between neighboring petals). Minimum 4 copies (design choice: fewer arches do not read as arches).
   - Flower of Life band: the overlapping circles grid wrapped around the ring. Every row has the ring's spoke count of circles, alternate rows are shifted by half a step, and every circle's radius equals the distance between neighboring centers in its row. Rows are spaced by a constant ratio instead of a constant distance, so the grid keeps the same proportions at every radius (design choice). 1 row is on the ring's center line, and rows from 1 row inside the ring to 1 row outside it are drawn. Parts of circles past the ring are masked at the inner edges of the border lines. Random picks use a spacing of 0.42 to 0.5 times the ring width (design choice). Minimum 2 copies. Source: docs/vendor/wikipedia-overlapping_circles_grid.html. The inner outline and dots settings do not apply to it.
   - Diamond lattice (2 offset zigzags)
   - Rose curve braid (`r = r₀ + a·cos(kθ)` and its phase-shifted copy)
   - Dot ring
   - Cymatics ring: the Chladni plate equation with free edges, drawn across the ring width and around the ring, using the ring's own modes n and m, spanning the ring between the border lines and masked there

### Output

1. Black lines on white, line weight adjustable, no fills, so the result prints well for coloring.
2. Lines section of the controls panel: line weight and line options.
   - Line contrast slider, 0 to 2 (default 1): ring borders are (1 + 0.8 × contrast) × the line weight, inner outlines and dots (1 − 0.4 × contrast) ×, and the outer edge (1 + 1.4 × contrast) ×. At 0 every line has the same weight. Design choice, no source.
   - Hide difficult to print details: skips dots and inner outlines smaller than 8 units (the outer radius is 500 units), about 3 mm across on an 8 inch print. Off by default.
3. Rings section of the controls panel: Double borders with spacing. Each ring border is 2 parallel circles, and each pattern stops a small distance before the border. On by default.
4. Cymatics lines are always traced on the finer grid and drawn as Catmull-Rom curves. The checkbox for this was removed because the unsmoothed lines looked the same at screen and print size.
5. Shuffle everything (top of the controls panel): picks every setting at random, including every center, every ring pattern, every slider within its range, and every checkbox.
6. Copy counts: each ring's count can be any number from 1 to 200, and the page never changes a chosen count. Shuffle everything, Shuffle rings, Variation, and added rings pick counts within each pattern's legibility range. 200 is above the highest legible count in any ring, about 186 (Flower of Life band in the narrowest of 8 golden-ratio rings).
7. Settings: "Share", next to the page title, puts a link to the current design on the clipboard. The link ends in a short code: a version character, then every setting packed into bits and written in URL-safe base64 (`src/settings.ts`). Opening the link shows the page with those settings. The address bar always shows the link to the current design. Each finished change (releasing a slider, choosing from a menu, changing a checkbox, or clicking a button) adds 1 browser history entry, and changes while a slider moves replace that entry, so Back returns to the design before each finished change. A new code layout gets a new version character, and the page keeps reading earlier versions. The Variation number is limited to 0 to 99999 so that it fits in the code.
8. Export SVG (vector, any print size) and PNG (3000 × 3000 pixels). Both come from the same layers as the page.

### Technology

Vite and TypeScript, vanilla DOM, no framework. pnpm. Vitest for the numerology functions, the link codes, and the ring layout. The drawing code produces layers: drawing calls, each with a line width and a ring mask. The page draws the layers with WebGL 2 (`src/gl.ts`), which keeps slider changes within 1 screen refresh at 200 spokes in 8 rings; it redraws by itself after a graphics driver reset. The SVG download writes the same layers as SVG paths with ring clip paths (`src/svg.ts`), and the PNG download draws them with WebGL on a 3000 × 3000 canvas.

## Defaults and options

The mandala shown on page load uses only these. Shuffle everything, Shuffle rings, the Variation number, and rings added with the Number of rings slider use every option:

1. Centers: Flower of Life, Seed of Life, sunflower spiral.
2. Ring patterns: lotus petals, arches, diamond lattice, dots. The mandala drawing guides name petals and teardrops, circles, lines, and triangles as the repeated patterns (`docs/vendor/stanford-cantor-mandala-art-project.pdf`, `docs/vendor/staedtler-how-to-draw-a-mandala.html`).

These are available in the controls panel only:

1. Centers: Sri Yantra (`src/geometry/sriYantra.ts`, built from `docs/vendor/sri-chakra-geometry-ijsr-2023.txt` and tested against its tables), Chladni plate (Paul Bourke's formula, `docs/vendor/paulbourke-chladni.html`), and rotated cymatics (design choice, no source).
2. Ring patterns: Flower of Life band, rose curve braid, cymatics ring (design choices, no source).

## Sources

The guides describe the construction this project uses: draw concentric circles from a center point, divide the circle into equal parts, and repeat a pattern around each ring. The number of rings, the ring spacing, and the choice of pattern for each ring are the artist's choices in those guides; in this project they are set by the controls or by the variation number.

## Out of scope for version 1

See `backlog.md`.
