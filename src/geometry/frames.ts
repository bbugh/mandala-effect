// Frames drawn around the mandala's outer circle.

import { bhupuraExtent, drawBhupura, type GateStyle } from "./bhupura";
import { type Pen, polar, polyline } from "./pen";
import { DEFAULT_RING_OPTIONS, drawGreekKey, MOTIFS, type PetalTip } from "./motifs";
import { bentCurve } from "./vajra";

export type FrameName = "none" | "bhupura" | "star" | "flames" | "lotus" | "greekKey";

export const FRAME_LABELS: Record<FrameName, string> = {
  none: "None",
  bhupura: "Bhupura (Sri Yantra square)",
  star: "8-pointed star",
  flames: "Ring of flames",
  lotus: "Lotus petals",
  greekKey: "Greek key",
};

export const FRAME_NAMES = Object.keys(FRAME_LABELS) as FrameName[];

/**
 * Where a frame draws: the outermost line with the outer circle's line width, every other line with the ring
 * borders' line width, and the lotus petals' inner outlines and dots with the widths that a ring gives them.
 */
export interface FramePens {
  outer: Pen;
  border: Pen;
  detail: Pen;
  dots: Pen;
}

/** Settings of the frames. The lotus petal settings are the same as the Lotus petals ring's settings. */
export interface FrameOptions {
  gate: GateStyle;
  trivalaya: boolean;
  /** Number of lotus petals, flames, or Greek key repeats. */
  frameCount: number;
  frameTip: PetalTip;
  frameInnerOutline: number;
  frameDots: number;
  minDetail: boolean;
}

/** The frames that have a count setting, with the setting's name and the lowest, highest, and starting counts. Design choices. */
export const FRAME_COUNTS: Partial<Record<FrameName, { label: string; min: number; max: number; start: number }>> = {
  flames: { label: "Flames", min: 12, max: 72, start: 36 },
  lotus: { label: "Petals", min: 6, max: 48, start: 16 },
  greekKey: { label: "Repeats", min: 40, max: 100, start: 60 },
};

/** Sizes as fractions of the radius of the outer circle. Design choices, no source. */
const STAR_SPACE = 0.03;
const BAND_SPACE = 0.03;
const FLAME_HEIGHT = 0.12;
const LOTUS_HEIGHT = 0.14;
const GREEK_KEY_HEIGHT = 0.08;

/** Distance from the center to the frame's farthest point, for a frame around a circle of radius r. */
export function frameExtent(frame: FrameName, r: number, options: Pick<FrameOptions, "gate">): number {
  switch (frame) {
    case "none":
      return r;
    case "bhupura":
      return bhupuraExtent(r, options.gate);
    case "star":
      // The corners of the turned square are √2 times the half side from the center.
      return r * (1 + 2 * STAR_SPACE) * Math.SQRT2;
    case "flames":
      return r * (1 + BAND_SPACE + FLAME_HEIGHT);
    case "lotus":
      return r * (1 + BAND_SPACE + LOTUS_HEIGHT);
    case "greekKey":
      return r * (1 + BAND_SPACE + GREEK_KEY_HEIGHT);
  }
}

/**
 * The 8-pointed star of 2 squares, 1 turned 45° (Wikipedia, "Rub el Hizb" and "Star of Lakshmi"). No source found
 * uses it as a frame around a mandala.
 */

/** A square of half side s, turned by angle. */
function square(pen: Pen, s: number, angle = 0) {
  polyline(pen, [0, 1, 2, 3].map((k) => polar(s * Math.SQRT2, angle + Math.PI / 4 + (k * Math.PI) / 2)));
}

/**
 * The ring of fire, outermost (Wikipedia, "Mandala"; asianart.com/mandalas/structure.html). The sources describe it
 * as stylized scrollwork in several colors and do not describe the flames' outline or count, so each flame here,
 * rising from a circle and leaning to 1 side at its tip, is a design choice.
 */
function flames(pens: FramePens, r: number, base: number, count: number) {
  const tip = base + r * FLAME_HEIGHT;
  const step = (Math.PI * 2) / count;
  const lean = step * 0.35;
  pens.border.circle(0, 0, base);
  for (let i = 0; i < count; i++) {
    const a = i * step;
    const left = bentCurve([[base, a - step / 2], [base + (tip - base) * 0.55, a - step * 0.55], [base + (tip - base) * 0.7, a + lean * 0.2], [tip, a + lean]]);
    const right = bentCurve([[tip, a + lean], [base + (tip - base) * 0.6, a + step * 0.2], [base + (tip - base) * 0.45, a + step * 0.5], [base, a + step / 2]]);
    polyline(pens.outer, [...left, ...right.slice(1)], false);
  }
}

/**
 * Lotus petals that open outward from a circle around the mandala, like the 16-petal lotus of the Sri Yantra. The
 * Lotus petals ring draws them, so the frame has the ring's tips, inner outline, and dots settings. The height is a
 * design choice.
 */
function lotus(pens: FramePens, r: number, options: FrameOptions) {
  const base = r * (1 + BAND_SPACE);
  // The ring's petal tips stop 4% of the ring's width inside its outer edge.
  const outer = base + (r * LOTUS_HEIGHT) / 0.96;
  pens.border.circle(0, 0, base);
  MOTIFS.lotus(
    {
      r1: base,
      r2: outer,
      count: options.frameCount,
      offset: false,
      clip: [base, outer],
      style: {
        ...DEFAULT_RING_OPTIONS,
        petalTip: options.frameTip,
        innerOutline: options.frameInnerOutline,
        dots: options.frameDots,
        smooth: false,
        minDetail: options.minDetail,
      },
    },
    { main: pens.outer, detail: pens.detail, dots: pens.dots },
  );
}

/** Draws the frame around a circle of radius r. */
export function drawFrame(frame: FrameName, pens: FramePens, r: number, options: FrameOptions) {
  switch (frame) {
    case "none":
      return;
    case "bhupura":
      return drawBhupura({ outer: pens.outer, inner: pens.border }, r, options.gate, options.trivalaya);
    case "star": {
      const s = r * (1 + 2 * STAR_SPACE);
      square(pens.outer, s);
      return square(pens.outer, s, Math.PI / 4);
    }
    case "flames":
      return flames(pens, r, r * (1 + BAND_SPACE), options.frameCount);
    case "lotus":
      return lotus(pens, r, options);
    case "greekKey": {
      // The meander rises from a circle around the mandala and has no outer line.
      const base = r * (1 + BAND_SPACE);
      pens.border.circle(0, 0, base);
      return drawGreekKey(pens.outer, base, base + r * GREEK_KEY_HEIGHT, options.frameCount);
    }
  }
}
