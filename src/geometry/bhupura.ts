// The bhupura: the square enclosure of the Sri Yantra, with a gate in the middle of each side, and the trivalaya,
// the 3 circles inside it. Source: T. V. Ananthapadmanabha, "Geometry of Srichakra", 2nd ed. (2020), sections 1.2
// and 1.3, Fig. 1.1 and Fig. 1.2. https://www.vagmionline.com/html/downloads/Geometry_Of_SriChakra.pdf

import { type Pen, type Point, polyline } from "./pen";

/**
 * The 3 gate styles of Fig. 1.1: (a) open without projection, (b) open with projection, (c) projecting out of
 * the square and closed.
 */
export type GateStyle = "open" | "projecting" | "closed";

export const GATE_LABELS: Record<GateStyle, string> = {
  closed: "Closed, projecting",
  projecting: "Open, projecting",
  open: "Open",
};

export const GATE_STYLES: readonly GateStyle[] = ["closed", "projecting", "open"];

/**
 * Sizes in the units of Fig. 1.2, where the innermost circle of the trivalaya has diameter 144. The mandala's
 * outer circle is that circle. Every outer corner lies on a circle of diameter 224, at 30°, 45°, and 60°
 * from the horizontal.
 */
const TRIVALAYA_INNER = 72;
/** The outermost trivalaya circle has diameter 108·√2. */
const TRIVALAYA_OUTER = 54 * Math.SQRT2;
/** The corner of the outer square, at 45°. */
const OUTER_SIDE = 112 * Math.SQRT1_2;
/** The inner square's sides touch the outermost trivalaya circle, and the middle line is halfway between. */
const SPACE = (OUTER_SIDE - TRIVALAYA_OUTER) / 2;
/** The gate's outer corners, at 30° and 60°. */
const BAR_OUT = 112 * Math.cos(Math.PI / 6);
const BAR = 112 * Math.sin(Math.PI / 6);
/** Fig. 1.2 marks the gate's depth beyond its inner corners as 12. */
const BAR_IN = BAR_OUT - 12;
/** The gate's inner corners lie on the lines at 15° and 75°. The opening is about 1/3 of the side. */
const NECK = BAR_IN * Math.tan(Math.PI / 12);

/** Distance from the center to the frame's farthest line, for a mandala whose outer circle has radius r. */
export function bhupuraExtent(r: number, gate: GateStyle): number {
  const unit = r / TRIVALAYA_INNER;
  return unit * { closed: BAR_OUT, projecting: BAR_IN, open: OUTER_SIDE }[gate];
}

/** The 4 copies of the top side's points, turned 90° at a time. y points down. */
function turned(points: Point[], turn: number): Point[] {
  return points.map(([x, y]) => [[x, y], [-y, x], [-x, -y], [y, -x]][turn] as Point);
}

/**
 * Draws the 3 lines of the square, outer line first, and the 2 outer trivalaya circles when trivalaya is on.
 * The mandala's outer circle is the innermost trivalaya circle, so it is not drawn here.
 */
export function drawBhupura(pens: { outer: Pen; inner: Pen }, r: number, gate: GateStyle, trivalaya: boolean) {
  const u = r / TRIVALAYA_INNER;
  if (trivalaya) {
    pens.inner.circle(0, 0, u * (TRIVALAYA_INNER + TRIVALAYA_OUTER) / 2);
    pens.inner.circle(0, 0, u * TRIVALAYA_OUTER);
  }
  for (let k = 0; k < 3; k++) {
    const pen = k === 0 ? pens.outer : pens.inner;
    // Each line is the outer line moved toward the mandala by the same distance on every edge.
    const d = SPACE * k;
    const side = u * (OUTER_SIDE - d);
    const neck = u * (NECK - d);
    if (gate === "closed") {
      const bar = u * (BAR - d);
      const barIn = u * (BAR_IN + d);
      const barOut = u * (BAR_OUT - d);
      // The top side from left to right: a neck out of the square, then a wider bar across its end.
      const top: Point[] = [
        [-side, -side],
        [-neck, -side],
        [-neck, -barIn],
        [-bar, -barIn],
        [-bar, -barOut],
        [bar, -barOut],
        [bar, -barIn],
        [neck, -barIn],
        [neck, -side],
      ];
      polyline(pen, [0, 1, 2, 3].flatMap((turn) => turned(top, turn)));
    } else {
      // Each corner is drawn on its own, from the opening on the top side to the opening on the right side.
      // With projection, the line turns out at each side of the opening, as far as the closed gate's neck.
      const corner: Point[] =
        gate === "projecting"
          ? [[neck, -u * BAR_IN], [neck, -side], [side, -side], [side, -neck], [u * BAR_IN, -neck]]
          : [[u * NECK, -side], [side, -side], [side, -u * NECK]];
      for (let turn = 0; turn < 4; turn++) polyline(pen, turned(corner, turn), false);
    }
  }
}
