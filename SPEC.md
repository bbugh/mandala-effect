# Mandala Effect: Specification

A web page that generates black-and-white line-art mandalas from exact geometry. The user sets parameters by hand, and exports the result as SVG or PNG to print and color.

## Version 1 scope

### Inputs

1 panel of controls, with no tabs, contains every parameter, in 4 sections: Lines, Center, Rings, and Frame, followed by Export. Controls that do not apply to the current mandala are hidden: the Center section shows Bindu only for Sri Yantra, Wave 1 and Wave 2 only for the Chladni plate and rotated cymatics, and Rotations (below Wave 1 and Wave 2) only for rotated cymatics; the ring editor shows only the options that change the selected ring's motif; the Frame section shows only the settings of the selected frame.

### Geometry

1. **Copies per ring:** each ring repeats its motif its own number of times (1 to 200). No setting ties one ring's count to another ring's count.
2. **Border ratio** (Lines section, radio buttons "Golden" and "Uniform"): with Golden, the center medallion radius is R / φ² (φ = 1.618...), and the ring boundaries between the medallion and the outer edge form a geometric sequence. Uniform gives every ring the same width.
3. **Center medallion**, one of:
   - **Cymatics, Chladni plate:** the nodal lines of a vibrating square plate, `cos(nπx)·cos(mπy) + cos(mπx)·cos(nπy) = 0`. Lines are traced with marching squares. When n equals m the formula with "−" is 0 everywhere, so equal values use "+" instead, which draws a grid of straight lines. n = m = 1 has no lines inside the circle with either sign.
   - **Cymatics, rotated:** the same plate function summed over rotated copies. The Rotations slider (3 to 24) sets the number of copies. At high counts this figure becomes mostly concentric wavy circles.
   - **Seed of Life / Flower of Life:** overlapping circles on a hexagonal grid.
   - **Phyllotaxis:** a sunflower seed head, dots placed at the golden angle (137.508°), with a Fibonacci number of dots.
   - **Metatron's Cube:** the 13 circles of the Fruit of Life (1 in the middle, then 6 and 6 more in the same 6 directions, each circle touching its neighbors in that direction), with a straight line from every circle's center to every other circle's center. A corner points up. The outer circles touch the edge of the center medallion.
4. **Ring motifs.** A hidden variation seed picks a motif, a copy count, and the ring options for each ring. In the controls panel, each ring has its own motif menu, a Spokes slider (1 to 200), and its own ring options. The motif menu lists the motifs in 4 groups, alphabetical within each group: Nature (Leafy vine, Lotus petals, Peacock feathers), Geometric (Arches, Cymatics, Diamond lattice, Dots, Greek key, Sawtooth triangles, Spirograph, Stars), Braids (Celtic knot, Rose curve braid), and Sacred (Flower of Life band, Vajras). A ring shows only the options that change its motif: lotus petals and arches have tips (Pointed and Round radio buttons), inner outlines, and dots; the diamond lattice has inner outlines and dots; the rose braid has wave depth, inner outlines, and dots; the dots ring has dots; the cymatics ring has its own Wave 1 and Wave 2 sliders (the plate's mode numbers n and m, 1 to 12, separate from the center's); the spirograph has a musical interval menu; the Celtic knot has a Strands slider (2 to 6); stars have a Points slider (4 to 12), inner outlines, and dots; sawtooth triangles, leafy vine, and peacock feathers have inner outlines; the Flower of Life band, vajras, and Greek key have none.
   - Inner outlines slider: Off, then 0.2 to 1 in steps of 0.1, the inner outline width as a multiple of the line weight.
   - Dots slider: Off, then 0.5, 0.75, 1, 1.25, 1.5, 1.75, and 2, the dot size as a multiple of the standard size. Dot outlines are 0.6 × the line weight.
   - On page load every ring uses pointed tips, inner outlines 0.6, dots Off, wave depth 0.36, Wave 1 = 3 and Wave 2 = 5, the fifth, 2 strands, and 5 points.

   Motifs:
   - Lotus petals: each petal's base starts at the inner border line
   - Scallops (arches between neighboring petals). Minimum 4 copies (design choice: fewer arches do not read as arches).
   - Flower of Life band: the overlapping circles grid wrapped around the ring. Every row has the ring's spoke count of circles, alternate rows are shifted by half a step, and every circle's radius equals the distance between neighboring centers in its row. Rows are spaced by a constant ratio instead of a constant distance, so the grid keeps the same proportions at every radius (design choice). 1 row is on the ring's center line, and rows from 1 row inside the ring to 1 row outside it are drawn. Parts of circles past the ring are masked at the inner edges of the border lines. Random picks use a spacing of 0.42 to 0.5 times the ring width (design choice). Minimum 2 copies. Source: docs/vendor/wikipedia-overlapping_circles_grid.html. The inner outline and dots settings do not apply to it.
   - Diamond lattice (2 offset zigzags)
   - Rose curve braid (`r = r₀ + a·cos(kθ)` and its phase-shifted copy). Its dots are in the middle of each opening between the 2 curves.
   - Dot ring
   - Cymatics ring: the Chladni plate equation with free edges, drawn across the ring width and around the ring, using the ring's own Wave 1 and Wave 2 values, spanning the ring between the border lines and masked there
   - Spirograph: 1 hypotrochoid for each copy, the path of a pen inside a circle of radius r that rolls inside a fixed circle of radius R (Wikipedia, "Hypotrochoid"). R:r is the ring's musical interval in just intonation: octave 2:1, fifth 3:2, fourth 4:3, major third 5:4, minor third 6:5, major sixth 5:3, or minor sixth 8:5. The curve has R/gcd(R, r) loops. The pen distance 0.8·r is a design choice.
   - Vajras: vajras laid end to end along the ring, 1 for each copy, with a line between each vajra and the next, as in the vajra circle of Tibetan mandalas (himalayanart.org/items/342). Each vajra has a round middle and 2 ends, each with a central prong and 2 side prongs that bend out toward the ring's edges and meet at the end's tip. The sources do not describe the outline, so it is a design choice.
   - Greek key: 1 continuous meander line with square turns (Wikipedia, "Meander (art)"). Each copy is 4 units wide and 4 units high.
   - Celtic knot: 2 to 6 ribbons, each a wave around the ring, that cross over and under each other in turn (Wikipedia, "Celtic knot"). Each ribbon is drawn as its 2 edges, and where a ribbon passes under another, its edges stop with a small space at the other ribbon's edges. Ribbons are narrower with more than 3 strands. When the copy count would make the strands cross at a slope steeper than 1.4, the waves and ribbons are lower in proportion, so the braid is a narrower band in the middle of the ring (design choice).
   - Sawtooth triangles: 1 zigzag line between the ring's edges, so the triangles point out and in by turns. The inner outline is a smaller triangle inside each triangle.
   - Leafy vine: a wavy stem with a leaf on each side of every wave, pointing forward along the stem. The inner outline is a vein down the middle of each leaf.
   - Stars: a row of stars, each with a point toward the outside. With 5 points the inner corners have the regular pentagram's ratio, and with more points they are wider, so the points do not become thin spikes (design choice). The inner outline is a smaller star inside each star, and the dot is in its middle.
   - Peacock feathers: an eye with a shaft toward the center, fine lines (the barbs) that spread from the eye, and an outline around them that narrows to a point on the shaft. The inner outline is a smaller eye inside the eye. The proportions are design choices.
5. **Frames** (Frame section). A frame is an open pattern around the mandala's outer circle: it starts at that circle and has no outer line. A closed pattern, which is complete between 2 circles, is a ring motif. The frame menu has no text label. A frame makes the drawing larger, so the mandala is drawn smaller. Sizes are fractions of the outer circle's radius and are design choices unless a source is named.
   - None (default on page load).
   - Bhupura (Sri Yantra square): the square enclosure of the Sri Yantra, 3 lines with a gate in the middle of each side, built from T. V. Ananthapadmanabha, "Geometry of Srichakra", 2nd ed. (2020), Fig. 1.1 and Fig. 1.2. The Gates menu has the 3 gate styles of Fig. 1.1: closed and projecting (default), open and projecting, and open. The Trivalaya checkbox (on by default) adds the 2 outer circles of the 3 trivalaya circles inside the square; the mandala's outer circle is the innermost of the 3.
   - 8-pointed star: 2 squares, 1 turned 45° (Wikipedia, "Rub el Hizb" and "Star of Lakshmi"). No source found uses it as a frame around a mandala.
   - Ring of flames: flames that rise from a circle around the mandala and lean to 1 side at the tip, as in the ring of fire at the outside of Tibetan mandalas (Wikipedia, "Mandala"; asianart.com/mandalas/structure.html). The sources do not describe the flames' outline. Flames slider: 12 to 72.
   - Lotus petals: petals that open outward from a circle around the mandala, like the 16-petal lotus of the Sri Yantra. The Lotus petals ring motif draws them, so the frame has the same tips (Pointed and Round radio buttons), inner outlines, and dots settings. Petals slider: 6 to 48.
   - Greek key: the Greek key ring motif's meander line, rising from a circle around the mandala. Repeats slider: 40 to 100, so each key stays close to square.
   - When the user picks a frame with a count slider, the count starts at 36 flames, 16 petals, or 60 repeats.

### Output

1. Black lines on white, line weight adjustable, no fills, so the result prints well for coloring.
2. Lines section of the controls panel:
   - Line weight slider, 0.5 to 4.
   - Border thickness slider, 0 to 2 (default 1): ring borders are (1 + 0.8 × border thickness) × the line weight, and the outer edge (1 + 1.4 × border thickness) ×. It does not change any other line. Design choice, no source.
   - Border spacing slider: Off, then 0.1 to 2 in steps of 0.1 (default 1). Off draws each ring border as 1 circle. Any other value draws each border as 2 parallel circles, (2 × the border width + 3 units) × the value apart, and each pattern stops 3 × the value units from the border lines. Design choice, no source.
   - Border ratio: Golden or Uniform (see Geometry).
3. Export section: Download SVG, Download PNG, and below them "Hide difficult to print details", which skips dots and inner outlines smaller than 8 units (the outer radius is 500 units), about 3 mm across on an 8 inch print. Off by default.
4. Cymatics lines are always traced on the finer grid and drawn as Catmull-Rom curves. The checkbox for this was removed because the unsmoothed lines looked the same at screen and print size.
5. Shuffle: the Lines, Center, Rings, and Frame sections each have a Shuffle button, and Shuffle everything (top of the controls panel) runs all 4. None of them changes "Hide difficult to print details", which changes only when the user clicks it.
   - Lines Shuffle picks a line weight, a border thickness, a border spacing (Off half of the time), and a border ratio.
   - Center Shuffle picks a center design different from the current one, and random values only for the settings that design uses.
   - Rings Shuffle picks the number of rings, and a new variation seed, which picks every ring's motif, count, and options. Each ring's inner outlines and dots are Off half of the time.
   - Frame Shuffle picks a frame different from the current one, with None as 1 of the choices, and random values for that frame's settings.
6. Copy counts: each ring's count can be any number from 1 to 200, and the page never changes a chosen count. Rings Shuffle, Shuffle everything, and added rings pick counts within each pattern's legibility range. 200 is above the highest legible count in any ring, about 186 (Flower of Life band in the narrowest of 8 golden-ratio rings).
7. Settings: "Share", next to the page title, puts a link to the current design on the clipboard. The link ends in a short code: a version character, then every setting packed into bits and written in URL-safe base64 (`src/settings.ts`). Opening the link shows the page with those settings. The address bar always shows the link to the current design. Each finished change (releasing a slider, choosing from a menu, changing a checkbox, or clicking a button) adds 1 browser history entry, and changes while a slider moves replace that entry, so Back returns to the design before each finished change. A new code layout gets a new version character, and the page keeps reading earlier versions; the current version is 7. Links from before version 6 open with inner outlines that were on at the slider position nearest 1 − 0.4 × border thickness, and dots that were on at 1. Links from before version 7 open with double borders on at border spacing 1, no frame, and every ring's interval, strands, and points at the page load values. The variation seed is limited to 0 to 99999 so that it fits in the code.
8. Export SVG (vector, any print size) and PNG (3000 × 3000 pixels). Both come from the same layers as the page. The file name is `mandala-` followed by the link code.

### Technology

Vite and TypeScript, vanilla DOM, no framework. pnpm. Vitest for the link codes and the ring layout. The drawing code produces layers: drawing calls, each with a line width and a ring mask. The page draws the layers with WebGL 2 (`src/gl.ts`), which keeps slider changes within 1 screen refresh at 200 spokes in 8 rings; it redraws by itself after a graphics driver reset. The SVG download writes the same layers as SVG paths with ring clip paths (`src/svg.ts`), and the PNG download draws them with WebGL on a 3000 × 3000 canvas.

## Defaults and options

The mandala shown on page load has the Flower of Life center, and its rings use only these patterns: lotus petals, arches, diamond lattice, dots. The mandala drawing guides name petals and teardrops, circles, lines, and triangles as the repeated patterns (`docs/vendor/stanford-cantor-mandala-art-project.pdf`, `docs/vendor/staedtler-how-to-draw-a-mandala.html`).

Center Shuffle, Rings Shuffle, Shuffle everything, and rings added with the Number of rings slider use every center and every ring pattern, including these:

1. Centers: Seed of Life, sunflower spiral, Sri Yantra (`src/geometry/sriYantra.ts`, built from `docs/vendor/sri-chakra-geometry-ijsr-2023.txt` and tested against its tables), Metatron's Cube, Chladni plate (Paul Bourke's formula, `docs/vendor/paulbourke-chladni.html`), and rotated cymatics (design choice, no source).
2. Ring patterns: Flower of Life band, rose curve braid, cymatics ring (design choices, no source), and the ring patterns after them in the Geometry list.

## Sources

The guides describe the construction this project uses: draw concentric circles from a center point, divide the circle into equal parts, and repeat a pattern around each ring. The number of rings, the ring spacing, and the choice of pattern for each ring are the artist's choices in those guides; in this project they are set by the controls or by Shuffle.

## Out of scope for version 1

See `backlog.md`.
