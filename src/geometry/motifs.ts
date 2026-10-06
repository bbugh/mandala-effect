// Ring motifs. Each motif fills the band between radii r1 and r2 and repeats
// symmetry × repeat times around the center.

import { linesToPath, zeroContour } from "./contour";
import { circle, clipToRing, path, polar, polyline, pt } from "./svg";

type P = [number, number];

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
 * Patterns used when rings are generated: petals and teardrops, circles, triangles, and
 * arches, as named in the mandala drawing guides (docs/vendor/stanford-cantor-mandala-art-project.pdf,
 * docs/vendor/staedtler-how-to-draw-a-mandala.html). The others are available in the Design tab only.
 */
export const DEFAULT_MOTIFS: readonly MotifName[] = ["lotus", "scallops", "lattice", "dots"];

export type PetalTip = "pointed" | "round";

/** 0: outline only. 1: adds an inner outline. 2: adds an inner outline and dots. */
export type Detail = 0 | 1 | 2;

export interface RingStyle {
  petalTip: PetalTip;
  detail: Detail;
  /** Rose braid wave height as a fraction of the ring width. */
  waveDepth: number;
  chladniN: number;
  chladniM: number;
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

/** Output of a motif: main outlines, and detail elements (inner outlines and dots) drawn with a thinner line. */
export interface MotifOutput {
  main: string;
  detail: string;
}

export interface RingContext {
  r1: number;
  r2: number;
  count: number;
  /** Rotates every other ring by half a repeat so neighboring rings interleave. */
  offset: boolean;
  /** Inner edges of the ring's border lines. Patterns that are cut off (Flower of Life band) end here. */
  clip: [number, number];
  id: string;
  style: RingStyle;
}

const TAU = Math.PI * 2;

/**
 * Range of arc length per repeat, in multiples of the ring width, that keeps each
 * motif legible. Used to choose automatic repeat counts.
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

export const MAX_REPEAT = 12;

/** Repeat multipliers (1 to MAX_REPEAT) that keep the motif legible in this ring. */
export function legibleRepeats(motif: MotifName, r1: number, r2: number, symmetry: number): number[] {
  const h = r2 - r1;
  const circumference = Math.PI * (r1 + r2);
  const [min, max] = LEGIBLE_ARC[motif];
  const all = Array.from({ length: MAX_REPEAT }, (_, k) => k + 1);
  const arc = (k: number) => circumference / (symmetry * k);
  const legible = all.filter((k) => arc(k) >= min * h && arc(k) <= max * h);
  if (legible.length > 0) return legible;
  // No multiplier is in range: use the one closest to the middle of the range.
  const target = ((min + max) / 2) * h;
  return [all.reduce((best, k) => (Math.abs(arc(k) - target) < Math.abs(arc(best) - target) ? k : best))];
}

function petal(a: number, base: number, tip: number, halfWidth: number, tipStyle: PetalTip): string {
  const span = tip - base;
  const start = polar(base, a - halfWidth);
  const end = polar(base, a + halfWidth);
  const top = polar(tip, a);
  if (tipStyle === "round") {
    return path(
      `M${pt(start)}C${pt(polar(base + span * 0.6, a - halfWidth * 1.1))} ${pt(polar(tip, a - halfWidth * 0.75))} ${pt(top)}` +
        `C${pt(polar(tip, a + halfWidth * 0.75))} ${pt(polar(base + span * 0.6, a + halfWidth * 1.1))} ${pt(end)}`,
    );
  }
  return path(
    `M${pt(start)}C${pt(polar(base + span * 0.55, a - halfWidth * 1.05))} ${pt(polar(tip - span * 0.2, a - halfWidth * 0.3))} ${pt(top)}` +
      `C${pt(polar(tip - span * 0.2, a + halfWidth * 0.3))} ${pt(polar(base + span * 0.55, a + halfWidth * 1.05))} ${pt(end)}`,
  );
}

/** Collects main and detail markup, and applies the minimum detail size. */
function collector(style: RingStyle) {
  const main: string[] = [];
  const detail: string[] = [];
  const large = (size: number) => !style.minDetail || size >= MIN_DETAIL;
  return {
    main,
    detail,
    large,
    dot(center: P, r: number) {
      if (large(r)) detail.push(circle(...center, r));
    },
    output(wrap: (markup: string, part: keyof MotifOutput) => string = (m) => m): MotifOutput {
      return { main: wrap(main.join(""), "main"), detail: wrap(detail.join(""), "detail") };
    },
  };
}

function lotus({ r1, r2, count, offset, style }: RingContext): MotifOutput {
  const out = collector(style);
  const h = r2 - r1;
  const step = TAU / count;
  const w = step / 2;
  for (let i = 0; i < count; i++) {
    const a = i * step + (offset ? w : 0);
    out.main.push(petal(a, r1, r2 - h * 0.04, w, style.petalTip));
    if (style.detail >= 1 && out.large(r1 * w * 0.55)) out.detail.push(petal(a, r1, r1 + h * 0.62, w * 0.55, style.petalTip));
    if (style.detail >= 2) out.dot(polar(r1 + h * 0.78, a), h * 0.05);
  }
  return out.output();
}

function scallops({ r1, r2, count, offset, style }: RingContext): MotifOutput {
  const out = collector(style);
  const h = r2 - r1;
  const step = TAU / count;
  const shift = offset ? step / 2 : 0;

  const arch = (a: number, height: number) => {
    const top = r1 + height;
    const from = polar(r1, a);
    const to = polar(r1, a + step);
    if (style.petalTip === "pointed") {
      // Two curves that meet at an angle at the top, like a Gothic arch.
      const peak = polar(top, a + step / 2);
      return path(`M${pt(from)}Q${pt(polar(top, a))} ${pt(peak)}Q${pt(polar(top, a + step))} ${pt(to)}`);
    }
    const controlRadius = 2 * top - r1 * Math.cos(step / 2);
    return path(`M${pt(from)}Q${pt(polar(controlRadius, a + step / 2))} ${pt(to)}`);
  };

  for (let i = 0; i < count; i++) {
    const a = i * step + shift;
    out.main.push(arch(a, h * 0.92));
    if (style.detail >= 1 && out.large(h * 0.37)) out.detail.push(arch(a, h * 0.55));
    if (style.detail >= 2) out.dot(polar(r1 + h * 0.74, a + step / 2), h * 0.06);
  }
  return out.output();
}

/**
 * The overlapping circles grid of the Flower of Life (docs/vendor/wikipedia-overlapping_circles_grid.html),
 * repeated around the ring and masked by the ring. Circle centers are on a hexagonal grid with 1 row on
 * the ring's center line, rows sqrt(3)/2 × spacing apart, and alternate rows shifted by half a step.
 * Every circle's radius equals the spacing. The grid continues past the ring on both sides, and the
 * mask cuts it off at the inner edges of the border lines. The detail setting does not apply.
 */
function flowerBand({ r1, r2, count, offset, id, clip }: RingContext): MotifOutput {
  const mid = (r1 + r2) / 2;
  const step = TAU / count;
  const spacing = 2 * mid * Math.sin(step / 2);
  const rowGap = (spacing * Math.sqrt(3)) / 2;
  // Enough rows that the grid covers the whole ring.
  const rows = Math.ceil(((clip[1] - clip[0]) / 2 + spacing) / rowGap);
  const circles: string[] = [];
  for (let k = -rows; k <= rows; k++) {
    const rowRadius = mid + k * rowGap;
    if (rowRadius <= 0) continue;
    const shift = (offset ? step / 2 : 0) + (Math.abs(k) % 2 === 1 ? step / 2 : 0);
    for (let i = 0; i < count; i++) circles.push(circle(...polar(rowRadius, i * step + shift), spacing));
  }
  return { main: clipToRing(`${id}-main`, clip[0], clip[1], circles.join("")), detail: "" };
}

function lattice({ r1, r2, count, offset, style }: RingContext): MotifOutput {
  const out = collector(style);
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
    if (style.detail >= 1 && out.large(mid * (step / 4) * inset)) {
      // Smaller diamond inside each diamond.
      out.detail.push(
        polyline([
          polar(mid - (h / 2) * inset, a),
          polar(mid, a + (step / 4) * inset),
          polar(mid + (h / 2) * inset, a),
          polar(mid, a - (step / 4) * inset),
        ]),
      );
    }
    if (style.detail >= 2) out.dot(polar(mid, a), h * 0.05);
  }
  out.main.push(polyline(outward), polyline(inward));
  return out.output();
}

/** Rose curve r = mid + a·cos(kθ) and its mirror, which cross to form a braid. */
function roseBraid({ r1, r2, count, offset, style }: RingContext): MotifOutput {
  const out = collector(style);
  const h = r2 - r1;
  const mid = (r1 + r2) / 2;
  const shift = offset ? Math.PI / count : 0;
  const samples = Math.max(720, count * 48);
  const curve = (amplitude: number) => {
    const points: P[] = [];
    for (let i = 0; i < samples; i++) {
      const theta = (i * TAU) / samples;
      points.push(polar(mid + amplitude * Math.cos(count * (theta - shift)), theta));
    }
    return polyline(points);
  };
  const amplitude = h * style.waveDepth;
  out.main.push(curve(amplitude), curve(-amplitude));
  if (style.detail >= 1 && out.large(amplitude * 0.5)) out.detail.push(curve(amplitude * 0.5), curve(-amplitude * 0.5));
  if (style.detail >= 2) {
    for (let i = 0; i < 2 * count; i++) {
      out.dot(polar(mid, (i * Math.PI) / count + shift + Math.PI / (2 * count)), h * 0.05);
    }
  }
  return out.output();
}

function dots({ r1, r2, count, offset, style }: RingContext): MotifOutput {
  const out = collector(style);
  const h = r2 - r1;
  const mid = (r1 + r2) / 2;
  const step = TAU / count;
  const shift = offset ? step / 2 : 0;
  const big = Math.min(h * 0.32, ((TAU * mid) / count) * 0.38);
  for (let i = 0; i < count; i++) {
    const a = i * step + shift;
    out.main.push(circle(...polar(mid, a), big));
    if (style.detail >= 1) out.dot(polar(mid, a), big * 0.45);
    if (style.detail >= 2) out.dot(polar(mid, a + step / 2), big * 0.25);
  }
  return out.output();
}

/**
 * Chladni figure on the ring: the square plate equation with free edges,
 * cos(nπs)·cos(mπt) + cos(mπs)·cos(nπt) = 0, where s is the position across the
 * ring (0 to 1) and t is the position around it (0 to 2 per repeat).
 */
function cymatics({ r1, r2, count, offset, style }: RingContext): MotifOutput {
  const { chladniN: n, chladniM: m, smooth } = style;
  const h = r2 - r1;
  const shift = offset ? Math.PI / count : 0;
  const plate = (s: number, theta: number) => {
    const t = (count * (theta - shift)) / Math.PI;
    return Math.cos(n * Math.PI * s) * Math.cos(m * Math.PI * t) + Math.cos(m * Math.PI * s) * Math.cos(n * Math.PI * t);
  };
  const resolution = smooth ? 2 : 1;
  const lines = zeroContour(plate, {
    x0: 0, x1: 1, y0: 0, y1: TAU,
    nx: 60 * resolution,
    ny: Math.min(6000 * resolution, count * 48 * resolution),
  });
  const d = linesToPath(lines.map((line) => line.map(([s, theta]) => polar(r1 + s * h, theta))), smooth);
  return { main: d ? path(d) : "", detail: "" };
}

export const MOTIFS: Record<MotifName, (ctx: RingContext) => MotifOutput> = {
  lotus,
  scallops,
  flowerBand,
  lattice,
  roseBraid,
  dots,
  cymatics,
};
