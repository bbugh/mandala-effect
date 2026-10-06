# Mandala Effect: Specification

A web page that generates black-and-white line-art mandalas from exact geometry. The user enters a name and a birthdate, or sets parameters by hand, and exports the result as SVG or PNG to print and color.

## Version 1 scope

### Inputs

The control panel has 2 tabs.

1. **Pattern tab:** full name, birthdate, and a Generate button. The page calculates Pythagorean numerology numbers and converts them into a complete mandala. The tab has no other controls.
2. **Custom tab:** every parameter, filled with the values from the last Generate. Controls that do not apply to the current mandala are disabled, never hidden.

### Numerology (Pythagorean system)

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
2. **Golden ratio ring spacing:** the center medallion radius is R / φ² (φ = 1.618...), and the ring boundaries between the medallion and the outer edge form a geometric sequence. An "even" spacing option is also available.
3. **Center medallion**, one of:
   - **Cymatics, Chladni plate:** the nodal lines of a vibrating square plate, `cos(nπx)·cos(mπy) + cos(mπx)·cos(nπy) = 0`. Lines are traced with marching squares. This is the default center.
   - **Cymatics, rotated:** the same plate function summed over rotated copies, so that the figure has the mandala's symmetry. At high symmetry counts this figure becomes mostly concentric wavy circles.
   - **Seed of Life / Flower of Life:** overlapping circles on a hexagonal grid.
   - **Phyllotaxis:** a sunflower seed head, dots placed at the golden angle (137.508°), with a Fibonacci number of dots.
4. **Ring motifs.** The variation seed picks a motif and a repeat count for each ring. In the Custom tab, each ring has its own motif menu and repeat menu (symmetry × 1 to 12). Global ring styles: petal and arch tips (pointed or round), detail level (outline, inner outline, inner outline and dots), and rose braid wave depth. Motifs:
   - Lotus petals
   - Scallops (arches between neighboring petals)
   - Flower of Life band (overlapping circles clipped to the ring)
   - Diamond lattice (2 offset zigzags)
   - Rose curve braid (`r = r₀ + a·cos(kθ)` and its phase-shifted copy)
   - Dot ring
   - Cymatics ring: the Chladni plate equation with free edges, drawn across the ring width and around the ring, using the same modes n and m as the center

### Output

1. Black lines on white, line weight adjustable, no fills, so the result prints well for coloring.
2. Line finish options, each with its own checkbox in the Custom tab:
   - Thick borders, thin details: ring borders 1.8 × the line weight, inner outlines and dots 0.6 ×, outer edge 2.4 ×. On by default.
   - Double borders with spacing: each ring border is 2 parallel circles, and each pattern stops a small distance before the border. On by default.
   - Smooth cymatics curves: traces cymatics lines on a grid with twice the resolution and draws them as Catmull-Rom curves. On by default.
   - Leave out tiny details: skips dots and inner outlines smaller than 3 units (the outer radius is 500 units). Off by default.
3. Export SVG (vector, any print size) and PNG (3000 × 3000 pixels).

### Technology

Vite and TypeScript, vanilla DOM, no framework. pnpm. Vitest for the numerology functions. The drawing code produces an SVG string, which the page inserts into the document and the export buttons save.

## Out of scope for version 1

See `backlog.md`.
