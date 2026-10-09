// Ring motifs. Each motif fills the band between radii r1 and r2 and repeats
// its ring's count of copies around the center.

import { drawLines, zeroContour } from "./contour";
import { type Pen, type Point as P, polar, polyline } from "./pen";

export type MotifName = "lotus" | "scallops" | "flowerBand" | "lattice" | "roseBraid" | "dots" | "cymatics";

export const MOTIF_LABELS: Record<MotifName, string> = {
  lotus: "Lotus petals",
  scallops: "Arches",
  flowerBand: "Flower of Life band",
  lattice: "Diamond lattice",
  roseBraid: "Rose curve braid",
  dots: "Dots",
  cymatics: "Cymatics",
};

export const MOTIF_NAMES = Object.keys(MOTIF_LABELS) as MotifName[];

/**
 * Patterns of the starting design and the personal mandala: petals and teardrops, circles, triangles, and
 * arches, as named in the mandala drawing guides (docs/vendor/stanford-cantor-mandala-art-project.pdf,
 * docs/vendor/staedtler-how-to-draw-a-mandala.html). The Shuffle buttons use every pattern.
 */
export const DEFAULT_MOTIFS: readonly MotifName[] = ["lotus", "scallops", "lattice", "dots"];

export type PetalTip = "pointed" | "round";

/** Settings that each ring has for itself. */
export interface RingOptions {
  petalTip: PetalTip;
  /** Adds an inner outline inside each petal, arch, lattice diamond, and braid wave. */
  innerOutline: boolean;
  /** Adds dots to the ring pattern. */
  dots: boolean;
  /** Rose braid wave height as a fraction of the ring width. */
  waveDepth: number;
  /** Cymatics ring modes n and m, 1 to 12. */
  cymaticsN: number;
  cymaticsM: number;
}

export const DEFAULT_RING_OPTIONS: RingOptions = { petalTip: "pointed", innerOutline: true, dots: false, waveDepth: 0.36, cymaticsN: 3, cymaticsM: 5 };

/** The ring options that change each motif's drawing. The page shows only these for a ring. */
export const MOTIF_OPTIONS: Record<MotifName, readonly (keyof RingOptions)[]> = {
  lotus: ["petalTip", "innerOutline", "dots"],
  scallops: ["petalTip", "innerOutline", "dots"],
  flowerBand: [],
  lattice: ["innerOutline", "dots"],
  roseBraid: ["waveDepth", "innerOutline", "dots"],
  dots: ["dots"],
  cymatics: ["cymaticsN", "cymaticsM"],
};

export interface RingStyle extends RingOptions {
  /** Smooth cymatics lines into curves and trace them on a finer grid. */
  smooth: boolean;
  /** Leave out detail elements smaller than MIN_DETAIL. */
  minDetail: boolean;
}

/**
 * Smallest dot radius or inner-outline width drawn when minDetail is on, in drawing units (outer radius is 500).
 * Design choice, no source: 8 units is about 3 mm across when the mandala is printed 8 inches wide.
 */
export const MIN_DETAIL = 8;

/** Where a motif draws: main outlines, and detail elements (inner outlines and dots) drawn with a thinner line. */
export interface MotifPens {
  main: Pen;
  detail: Pen;
}

export interface RingContext {
  r1: number;
  r2: number;
  count: number;
  /** Rotates every other ring by half a repeat so neighboring rings interleave. */
  offset: boolean;
  /** Inner edges of the ring's border lines. mandalaLayers masks every pattern here. */
  clip: [number, number];
  style: RingStyle;
}

const TAU = Math.PI * 2;

/**
 * Range of arc length per repeat, in multiples of the ring width, that keeps each
 * motif legible. Used to choose automatic copy counts.
 */
const LEGIBLE_ARC: Record<MotifName, [number, number]> = {
  lotus: [0.45, 1.6],
  scallops: [0.6, 2.2],
  flowerBand: [0.42, 0.5],
  lattice: [0.5, 1.8],
  roseBraid: [0.8, 2.5],
  dots: [0.5, 1.5],
  cymatics: [1.2, 3.2],
};

/**
 * Highest copy count per ring. The most copies any motif can have and stay legible in the
 * narrowest ring of any layout is about 186 (Flower of Life band, 8 golden-ratio rings).
 */
export const MAX_COUNT = 200;

/**
 * Lowest copy count for each motif. With 1 copy the Flower of Life band's circles have no size, so it draws
 * nothing. Arches below 4 copies do not read as arches (design choice).
 */
const MIN_COUNT: Partial<Record<MotifName, number>> = { flowerBand: 2, scallops: 4 };

export function minCount(motif: MotifName): number {
  return MIN_COUNT[motif] ?? 1;
}

/** Copy counts (1 to MAX_COUNT) that keep the motif legible in this ring. */
export function legibleCounts(motif: MotifName, r1: number, r2: number): number[] {
  const h = r2 - r1;
  const circumference = Math.PI * (r1 + r2);
  const [min, max] = LEGIBLE_ARC[motif];
  const low = Math.max(minCount(motif), Math.ceil(circumference / (max * h)));
  const high = Math.min(MAX_COUNT, Math.floor(circumference / (min * h)));
  if (low <= high) return Array.from({ length: high - low + 1 }, (_, k) => low + k);
  // No count is in range: use the one closest to the middle of the range.
  return [Math.min(MAX_COUNT, Math.max(minCount(motif), Math.round(circumference / (((min + max) / 2) * h))))];
}

/** A point given as [radius, angle]. */
type RA = [number, number];

/**
 * Draws a path whose segments are straight lines (1 point), quadratic curves (2 points), or cubic
 * curves (3 points) in radius and angle instead of x and y. The result bends with the ring, so a
 * shape that spans a large part of the circle follows the circle instead of cutting across it.
 */
function bentPath(pen: Pen, start: RA, segments: RA[][], closed = false) {
  const points: P[] = [polar(...start)];
  let from = start;
  for (const segment of segments) {
    const controls = [from, ...segment];
    const radius = Math.max(...controls.map(([r]) => r));
    const angles = controls.map(([, a]) => a);
    const arc = radius * (Math.max(...angles) - Math.min(...angles)) + Math.abs(segment[segment.length - 1][0] - from[0]);
    // About 1 point every 3 drawing units, at least 2 for a straight line and 8 for a curve.
    const samples = Math.max(segment.length === 1 ? 2 : 8, Math.ceil(arc / 3));
    for (let k = 1; k <= samples; k++) points.push(polar(...bezier(controls, k / samples)));
    from = segment[segment.length - 1];
  }
  polyline(pen, points, closed);
}

/** Point at t (0 to 1) on the Bézier curve with these control points (de Casteljau's algorithm). */
function bezier(controls: RA[], t: number): RA {
  let level = controls;
  while (level.length > 1) {
    level = level.slice(1).map((p, i) => [level[i][0] + (p[0] - level[i][0]) * t, level[i][1] + (p[1] - level[i][1]) * t] as RA);
  }
  return level[0];
}

function petal(pen: Pen, a: number, base: number, tip: number, halfWidth: number, tipStyle: PetalTip) {
  const span = tip - base;
  const start: RA = [base, a - halfWidth];
  const end: RA = [base, a + halfWidth];
  const top: RA = [tip, a];
  if (tipStyle === "round") {
    return bentPath(pen, start, [
      [[base + span * 0.6, a - halfWidth * 1.1], [tip, a - halfWidth * 0.75], top],
      [[tip, a + halfWidth * 0.75], [base + span * 0.6, a + halfWidth * 1.1], end],
    ]);
  }
  bentPath(pen, start, [
    [[base + span * 0.55, a - halfWidth * 1.05], [tip - span * 0.2, a - halfWidth * 0.3], top],
    [[tip - span * 0.2, a + halfWidth * 0.3], [base + span * 0.55, a + halfWidth * 1.05], end],
  ]);
}

/** Whether a detail of this size is drawn: with minDetail on, details smaller than MIN_DETAIL are left out. */
const large = (style: RingStyle, size: number) => !style.minDetail || size >= MIN_DETAIL;

/** A detail dot, unless it is too small for minDetail. */
function dot(out: MotifPens, style: RingStyle, center: P, r: number) {
  if (large(style, r)) out.detail.circle(...center, r);
}

function lotus({ r1, r2, count, offset, clip, style }: RingContext, out: MotifPens) {
  const h = r2 - r1;
  const step = TAU / count;
  const w = step / 2;
  for (let i = 0; i < count; i++) {
    const a = i * step + (offset ? w : 0);
    // The petal's base starts at the inner border line.
    petal(out.main, a, clip[0], r2 - h * 0.04, w, style.petalTip);
    if (style.innerOutline && large(style, r1 * w * 0.55)) petal(out.detail, a, r1, r1 + h * 0.62, w * 0.55, style.petalTip);
    if (style.dots) dot(out, style, polar(r1 + h * 0.78, a), h * 0.05);
  }
}

function scallops({ r1, r2, count, offset, style }: RingContext, out: MotifPens) {
  const h = r2 - r1;
  const step = TAU / count;
  const shift = offset ? step / 2 : 0;

  const arch = (pen: Pen, a: number, height: number) => {
    const top = r1 + height;
    const from: RA = [r1, a];
    const to: RA = [r1, a + step];
    if (style.petalTip === "pointed") {
      // Two curves that meet at an angle at the top, like a Gothic arch.
      return bentPath(pen, from, [
        [[top, a], [top, a + step / 2]],
        [[top, a + step], to],
      ]);
    }
    // A quadratic curve reaches halfway to its control point, so the control point is at twice the height.
    bentPath(pen, from, [[[r1 + 2 * height, a + step / 2], to]]);
  };

  for (let i = 0; i < count; i++) {
    const a = i * step + shift;
    arch(out.main, a, h * 0.92);
    if (style.innerOutline && large(style, h * 0.37)) arch(out.detail, a, h * 0.55);
    if (style.dots) dot(out, style, polar(r1 + h * 0.74, a + step / 2), h * 0.06);
  }
}

/**
 * The overlapping circles grid of the Flower of Life (docs/vendor/wikipedia-overlapping_circles_grid.html),
 * wrapped around the ring. Every row has `count` circles, and alternate rows are shifted by half a step,
 * as in the flat grid. Each circle's radius equals the distance to the neighboring centers in its row, so
 * it passes through them. Rows are spaced by a constant ratio q instead of a constant distance, so the grid
 * keeps the same proportions at every radius and never reaches the center. q is chosen so that the distance
 * between centers in neighboring rows is the geometric mean of the 2 rows' radii (design choice; for small
 * steps q ≈ 1 + √3·sin(step/2), the flat grid's row gap). One row is on the ring's center line, and the
 * ring mask in mandalaLayers cuts the grid off at the inner edges of the border lines. The inner outline
 * and dots settings do not apply.
 */
function flowerBand({ r1, r2, count, offset, clip }: RingContext, out: MotifPens) {
  const mid = (r1 + r2) / 2;
  const half = Math.PI / count;
  const sin = Math.sin(half);
  // Solves 1 + q² − 2q·cos(half) = 4q·sin²(half): the law of cosines for 2 centers in neighboring rows.
  const c = Math.cos(half) + 2 * sin * sin;
  const q = c + Math.sqrt(c * c - 1);
  const row = (k: number) => {
    const radius = mid * q ** k;
    const size = 2 * radius * sin;
    // Rows from 1 row inside the ring to 1 row outside it are drawn; the caller stops at the first row past them.
    if (radius > clip[1] * q || radius < clip[0] / q) return false;
    const shift = (offset ? half : 0) + (Math.abs(k) % 2 === 1 ? half : 0);
    for (let i = 0; i < count; i++) out.main.circle(...polar(radius, i * 2 * half + shift), size);
    return true;
  };
  row(0);
  for (let k = 1; row(k); k++);
  for (let k = -1; row(k); k--);
}

function lattice({ r1, r2, count, offset, style }: RingContext, out: MotifPens) {
  const h = r2 - r1;
  const mid = (r1 + r2) / 2;
  const step = TAU / count;
  const shift = offset ? step / 2 : 0;
  const outward: P[] = [];
  const inward: P[] = [];
  const inset = 0.45;
  for (let i = 0; i < count; i++) {
    const a = i * step + shift;
    outward.push(polar(r1, a), polar(r2, a + step / 2));
    inward.push(polar(r2, a), polar(r1, a + step / 2));
    if (style.innerOutline && large(style, mid * (step / 4) * inset)) {
      // Smaller diamond inside each diamond.
      polyline(out.detail, [
        polar(mid - (h / 2) * inset, a),
        polar(mid, a + (step / 4) * inset),
        polar(mid + (h / 2) * inset, a),
        polar(mid, a - (step / 4) * inset),
      ]);
    }
    if (style.dots) dot(out, style, polar(mid, a), h * 0.05);
  }
  polyline(out.main, outward);
  polyline(out.main, inward);
}

/** Rose curve r = mid + a·cos(kθ) and its mirror, which cross to form a braid. */
function roseBraid({ r1, r2, count, offset, style }: RingContext, out: MotifPens) {
  const h = r2 - r1;
  const mid = (r1 + r2) / 2;
  const shift = offset ? Math.PI / count : 0;
  const samples = Math.max(720, count * 48);
  const curve = (pen: Pen, amplitude: number) => {
    const points: P[] = [];
    for (let i = 0; i < samples; i++) {
      const theta = (i * TAU) / samples;
      points.push(polar(mid + amplitude * Math.cos(count * (theta - shift)), theta));
    }
    polyline(pen, points);
  };
  const amplitude = h * style.waveDepth;
  curve(out.main, amplitude);
  curve(out.main, -amplitude);
  if (style.innerOutline && large(style, amplitude * 0.5)) {
    curve(out.detail, amplitude * 0.5);
    curve(out.detail, -amplitude * 0.5);
  }
  if (style.dots) {
    for (let i = 0; i < 2 * count; i++) {
      dot(out, style, polar(mid, (i * Math.PI) / count + shift + Math.PI / (2 * count)), h * 0.05);
    }
  }
}

function dots({ r1, r2, count, offset, style }: RingContext, out: MotifPens) {
  const h = r2 - r1;
  const mid = (r1 + r2) / 2;
  const step = TAU / count;
  const shift = offset ? step / 2 : 0;
  const big = Math.min(h * 0.32, ((TAU * mid) / count) * 0.38);
  for (let i = 0; i < count; i++) {
    const a = i * step + shift;
    out.main.circle(...polar(mid, a), big);
    if (style.dots) {
      dot(out, style, polar(mid, a), big * 0.45);
      dot(out, style, polar(mid, a + step / 2), big * 0.25);
    }
  }
}

/**
 * Chladni figure on the ring: the square plate equation with free edges,
 * cos(nπs)·cos(mπt) + cos(mπs)·cos(nπt) = 0, where s is the position across the
 * ring (0 to 1) and t is the position around it (0 to 2 per repeat).
 */
function cymatics({ count, offset, clip, style }: RingContext, out: MotifPens) {
  const { cymaticsN: n, cymaticsM: m, smooth } = style;
  // The plate spans the ring between the border lines.
  const [r1, r2] = clip;
  const h = r2 - r1;
  const shift = offset ? Math.PI / count : 0;
  const plate = (s: number, theta: number) => {
    const t = (count * (theta - shift)) / Math.PI;
    return Math.cos(n * Math.PI * s) * Math.cos(m * Math.PI * t) + Math.cos(m * Math.PI * s) * Math.cos(n * Math.PI * t);
  };
  const resolution = smooth ? 2 : 1;
  // The figure repeats every 2π/count, so 1 repeat is traced and rotated to the others.
  const step = TAU / count;
  const repeat = zeroContour(plate, { x0: 0, x1: 1, y0: shift, y1: shift + step, nx: 60 * resolution, ny: 48 * resolution });
  const lines = Array.from({ length: count }, (_, k) => repeat.map((line) => line.map(([s, theta]) => polar(r1 + s * h, theta + k * step)))).flat();
  drawLines(out.main, lines, smooth);
}

export const MOTIFS: Record<MotifName, (ctx: RingContext, out: MotifPens) => void> = {
  lotus,
  scallops,
  flowerBand,
  lattice,
  roseBraid,
  dots,
  cymatics,
};
