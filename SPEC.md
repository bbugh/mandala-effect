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
| Life Path | Reduce month, day, and year separately, add them, reduce the sum | Symmetry (number of repeats around the center) |
| Birthday | Reduce the day of the month | Number of rings |
| Expression | Reduce the sum of all letters in the name | Variation seed (which motif goes in which ring), and the repeat count of the outermost ring |
| Soul Urge | Reduce the sum of the vowels (A, E, I, O, U) | Cymatics mode `n` |
| Personality | Reduce the sum of the consonants (Y counts as a consonant) | Cymatics mode `m` |

Life Path to symmetry: 1 → 6, 2 → 12, 3 to 9 → 2 × Life Path, 11 → 22, 22 and 33 → 24.

Birthday to rings: 3 + ((Birthday − 1) mod 5), which gives 3 to 7 rings.

Cymatics modes: master numbers are reduced to a single digit for this mapping. If `n` equals `m`, `m` becomes `m + 1`, because equal modes produce a blank plate.

The variation seed combines the Expression number with the name and birthdate text, so 2 people with the same Expression number still get different mandalas.

### Geometry

1. **Rotational symmetry:** every ring repeats its motif a multiple of the symmetry count.
2. **Golden ratio ring spacing:** the center medallion radius is R / φ² (φ = 1.618...), and the ring boundaries between the medallion and the outer edge form a geometric sequence. A "Uniform" spacing option (equal ring widths) is also available.
3. **Center medallion**, one of:
   - **Cymatics, Chladni plate:** the nodal lines of a vibrating square plate, `cos(nπx)·cos(mπy) + cos(mπx)·cos(nπy) = 0`. Lines are traced with marching squares. This is the default center.
   - **Cymatics, rotated:** the same plate function summed over rotated copies, so that the figure has the mandala's symmetry. At high symmetry counts this figure becomes mostly concentric wavy circles.
   - **Seed of Life / Flower of Life:** overlapping circles on a hexagonal grid.
   - **Phyllotaxis:** a sunflower seed head, dots placed at the golden angle (137.508°), with a Fibonacci number of dots.
4. **Ring motifs.** The variation seed picks a motif and a repeat count for each ring. In the controls panel, each ring has its own motif menu and repeat menu (symmetry × 1 to 12). Global ring styles: petal and arch tips (pointed or round), detail level (outline, inner outline, inner outline and dots), and rose braid wave depth. Motifs:
   - Lotus petals: each petal's base starts at the inner border line
   - Scallops (arches between neighboring petals)
   - Flower of Life band: the overlapping circles grid repeated around the ring and masked by the ring, so it is cut off at the inner edges of the border lines. 1 row of circle centers is on the ring's center line, and every circle's radius equals the grid spacing. Spacing is 0.42 to 0.5 times the ring width (design choice). Source: docs/vendor/wikipedia-overlapping_circles_grid.html. The Detail setting does not apply to it.
   - Diamond lattice (2 offset zigzags)
   - Rose curve braid (`r = r₀ + a·cos(kθ)` and its phase-shifted copy)
   - Dot ring
   - Cymatics ring: the Chladni plate equation with free edges, drawn across the ring width and around the ring, using the same modes n and m as the center, spanning the ring between the border lines and masked there

### Output

1. Black lines on white, line weight adjustable, no fills, so the result prints well for coloring.
2. Lines section of the controls panel: line weight and line options.
   - Line contrast slider, 0 to 2 (default 1): ring borders are (1 + 0.8 × contrast) × the line weight, inner outlines and dots (1 − 0.4 × contrast) ×, and the outer edge (1 + 1.4 × contrast) ×. At 0 every line has the same weight. Design choice, no source.
   - Hide difficult to print details: skips dots and inner outlines smaller than 8 units (the outer radius is 500 units), about 3 mm across on an 8 inch print. Off by default.
3. Rings section of the controls panel: Double borders with spacing. Each ring border is 2 parallel circles, and each pattern stops a small distance before the border. On by default.
4. Cymatics lines are always traced on the finer grid and drawn as Catmull-Rom curves. The checkbox for this was removed because the unsmoothed lines looked the same at screen and print size.
5. Shuffle everything (top of the controls panel): picks every setting at random, including every center, every ring pattern, every slider within its range, and every checkbox.
6. Repeat counts: each ring's Repeats dropdown disables the counts at which its pattern is not legible in that ring. When the pattern, symmetry, ring spacing, or number of rings changes, or settings are pasted, a ring whose count is no longer legible changes to the closest legible count.
7. Settings: "Copy" puts a link to the page on the clipboard, ending in a short code: a version character, then every setting packed into bits and written in URL-safe base64 (`src/settings.ts`). Opening the link shows the page with those settings. A new code layout gets a new version character, and the page keeps reading earlier versions. "Paste" reads a link, a code, or the settings text from earlier copies. The Variation number is limited to 0 to 99999 so that it fits in the code.
8. Export SVG (vector, any print size) and PNG (3000 × 3000 pixels).

### Technology

Vite and TypeScript, vanilla DOM, no framework. pnpm. Vitest for the numerology functions. The drawing code produces an SVG string, which the page inserts into the document and the export buttons save.

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
