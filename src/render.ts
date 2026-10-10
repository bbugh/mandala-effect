import { type CenterName, type CenterOptions, drawCenter } from "./geometry/centers";
import { DEFAULT_MOTIFS, DEFAULT_RING_OPTIONS, DOT_LINE, DOT_STEPS, INNER_OUTLINE_STEPS, INTERVAL_NAMES, legibleCounts, minCount, MOTIFS, type MotifName, type RingContext, type RingOptions } from "./geometry/motifs";
import { type Disk, Path } from "./geometry/pen";
import { ringRadii, type Spacing } from "./geometry/rings";
import { createRng, pick } from "./rng";

export interface RingSpec extends RingOptions {
  motif: MotifName;
  /** Number of copies of the motif around the ring. */
  count: number;
}

export interface MandalaParams {
  /** Number of rotated copies in the rotated cymatics center. */
  rotations: number;
  spacing: Spacing;
  center: CenterName;
  chladniN: number;
  chladniM: number;
  seed: number;
  lineWeight: number;
  rings: RingSpec[];
  /** Sri Yantra center point. */
  bindu: boolean;
  /** 0: every line uses lineWeight. Higher values make borders thicker and details thinner. */
  borderThickness: number;
  /**
   * 0: single-line ring borders. Otherwise double-line ring borders, with a space between the 2 lines and
   * between each border and its pattern, as a multiple of the standard space (1). One of BORDER_SPACING_STEPS.
   */
  borderSpacing: number;
  /** Smooth cymatics lines into curves on a finer grid. */
  smooth: boolean;
  /** Leave out details smaller than MIN_DETAIL. */
  minDetail: boolean;
}

export const RADIUS = 500;
const MARGIN = 24;
/** Width and height of the drawing in drawing units. */
export const DRAWING_SIZE = 2 * (RADIUS + MARGIN);

/** Positions of the border spacing slider: 0, then 0.1 to 2 in steps of 0.1. The leftmost position, 0, draws single borders. */
export const BORDER_SPACING_STEPS: readonly number[] = Array.from({ length: 21 }, (_, k) => Number((k * 0.1).toFixed(1)));

/** Rose braid wave depths that the page's slider offers: 0.1 to 0.5 in steps of 0.02. */
const WAVE_DEPTHS = Array.from({ length: 21 }, (_, k) => Number((0.1 + k * 0.02).toFixed(2)));

/** Cymatics ring modes that the page's sliders offer: 1 to 12. */
const CYMATICS_MODES = Array.from({ length: 12 }, (_, k) => k + 1);

/**
 * Chooses a motif and a legible copy count for each ring from the variation seed.
 * A ring never repeats the motif of the ring directly inside it. With randomOptions, each ring's
 * tips, inner outlines, dots, wave depth, cymatics modes, and spirograph interval are also chosen from the seed; otherwise every ring
 * uses DEFAULT_RING_OPTIONS.
 */
export function autoRings(
  seed: number,
  count: number,
  spacing: Spacing,
  motifs: readonly MotifName[] = DEFAULT_MOTIFS,
  randomOptions = false,
): RingSpec[] {
  const rng = createRng(seed);
  // A separate sequence for the options, so the motifs and counts for a seed do not depend on randomOptions.
  const optionRng = createRng(seed + 0x9e3779b9);
  // A third sequence for the cymatics modes, so the other options for a seed stay the same as before rings had their own modes.
  const modeRng = createRng(seed + 0x7f4a7c15);
  // A fourth sequence for the inner outline and dot sizes, so the other options for a seed stay the same as when they were on or off.
  const sizeRng = createRng(seed + 0x5bd1e995);
  // A fifth sequence for the spirograph intervals, for the same reason.
  const intervalRng = createRng(seed + 0x2545f491);
  const radii = ringRadii(RADIUS, count, spacing);
  const rings: RingSpec[] = [];
  for (let i = 0; i < count; i++) {
    const motif = pick(rng, motifs.filter((name) => name !== rings[i - 1]?.motif));
    const options: RingOptions = randomOptions
      ? {
          petalTip: pick(optionRng, ["pointed", "round"] as const),
          // Each is off half of the time, and otherwise at a random position of its slider.
          innerOutline: pick(optionRng, [true, false]) ? pick(sizeRng, INNER_OUTLINE_STEPS.slice(1)) : 0,
          dots: pick(optionRng, [true, false]) ? pick(sizeRng, DOT_STEPS.slice(1)) : 0,
          waveDepth: pick(optionRng, WAVE_DEPTHS),
          cymaticsN: pick(modeRng, CYMATICS_MODES),
          cymaticsM: pick(modeRng, CYMATICS_MODES),
          interval: pick(intervalRng, INTERVAL_NAMES),
        }
      : DEFAULT_RING_OPTIONS;
    rings.push({ motif, count: pick(rng, legibleCounts(motif, radii[i], radii[i + 1])), ...options });
  }
  return rings;
}

/** Black lines on white paper, as RGB values from 0 to 255. Every line has round ends and round corners. */
export const INK: readonly [number, number, number] = [0, 0, 0];
export const PAPER: readonly [number, number, number] = [255, 255, 255];

/** Lines drawn with 1 width and 1 mask, or filled circles in the ink color. Only circles can be filled. */
export type Stroke =
  | {
      kind: "lines";
      path: Path;
      /** Line width in drawing units. */
      width: number;
      /** Inner and outer radius of the ring that the lines are masked to, or null for no mask. The inner radius is 0 for a disk. */
      mask: [number, number] | null;
    }
  | { kind: "disks"; disks: Disk[] };

/** A ring, the center, or the borders. key changes whenever any setting that affects its strokes changes. */
export interface Layer {
  key: string;
  strokes: Stroke[];
}

/** Layers from the previous call. A ring or center whose settings did not change reuses its layer. */
let cache = new Map<string, Layer>();

/**
 * Everything the mandala draws, in drawing units centered on (0, 0). The outputs (the WebGL drawing and the
 * SVG file) only convert these layers; every decision about the design is made here.
 */
export function mandalaLayers(params: MandalaParams): Layer[] {
  const radii = ringRadii(RADIUS, params.rings.length, params.spacing);
  const weight = params.lineWeight;
  const border = params.borderThickness;
  const borderWeight = weight * (1 + 0.8 * border);
  const outerWeight = weight * (1 + 1.4 * border);
  // Distance between the 2 lines of a double border, and between a border and its pattern.
  const spacing = params.borderSpacing;
  const borderGap = spacing ? (borderWeight * 2 + 3) * spacing : 0;
  // The pattern gap is measured between the edges of the strokes, so it stays the same at every line weight.
  const patternGap = spacing ? borderGap / 2 + borderWeight / 2 + weight / 2 + 3 * spacing : 0;

  const next = new Map<string, Layer>();
  const layer = (key: string, build: () => Stroke[]) => {
    const found = cache.get(key) ?? next.get(key) ?? { key, strokes: build().filter((s) => (s.kind === "lines" ? !s.path.empty : s.disks.length > 0)) };
    next.set(key, found);
    return found;
  };

  const r0 = radii[0] - patternGap;
  const centerOptions: CenterOptions = {
    center: params.center,
    chladniN: params.chladniN,
    chladniM: params.chladniM,
    smooth: params.smooth,
    rotations: params.rotations,
    bindu: params.bindu,
  };
  const layers = [
    layer(JSON.stringify(["center", r0, centerOptions, weight]), () => {
      const lines = new Path();
      const disks: Disk[] = [];
      const { clip } = drawCenter({ lines, disks }, r0, centerOptions);
      return [
        { kind: "lines", path: lines, width: weight, mask: clip ? [0, r0] : null },
        { kind: "disks", disks },
      ];
    }),
  ];

  params.rings.forEach((spec, i) => {
    // The inner edges of the border lines' strokes. Every pattern is masked here, so no line crosses a border line.
    const clip: [number, number] = [radii[i] + borderGap / 2 + borderWeight / 2, radii[i + 1] - borderGap / 2 - borderWeight / 2];
    const ring: RingContext = {
      r1: radii[i] + patternGap,
      r2: radii[i + 1] - patternGap,
      count: Math.max(minCount(spec.motif), spec.count),
      offset: i % 2 === 1,
      clip,
      style: {
        petalTip: spec.petalTip,
        innerOutline: spec.innerOutline,
        dots: spec.dots,
        waveDepth: spec.waveDepth,
        cymaticsN: spec.cymaticsN,
        cymaticsM: spec.cymaticsM,
        interval: spec.interval,
        smooth: params.smooth,
        minDetail: params.minDetail,
      },
    };
    layers.push(
      layer(JSON.stringify([spec.motif, ring, weight]), () => {
        const main = new Path();
        const detail = new Path();
        const dots = new Path();
        MOTIFS[spec.motif](ring, { main, detail, dots });
        return [
          { kind: "lines", path: main, width: weight, mask: clip },
          { kind: "lines", path: detail, width: weight * spec.innerOutline, mask: clip },
          { kind: "lines", path: dots, width: weight * DOT_LINE, mask: clip },
        ];
      }),
    );
  });

  const borderRadii = radii.slice(0, params.rings.length + 1);
  layers.push(
    layer(JSON.stringify(["borders", borderRadii, borderGap, borderWeight, outerWeight]), () => {
      const borders = new Path();
      for (const r of borderRadii) {
        if (spacing) {
          borders.circle(0, 0, r - borderGap / 2);
          borders.circle(0, 0, r + borderGap / 2);
        } else borders.circle(0, 0, r);
      }
      const outer = new Path();
      outer.circle(0, 0, RADIUS + 12);
      return [
        { kind: "lines", path: borders, width: borderWeight, mask: null },
        { kind: "lines", path: outer, width: outerWeight, mask: null },
      ];
    }),
  );

  cache = next;
  return layers;
}
