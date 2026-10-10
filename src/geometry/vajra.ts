// Vajras laid end to end in a band between 2 circles. The vajra ring motif draws them.

import { type Pen, type Point, polar, polyline } from "./pen";

/** A point given as [radius, angle]. */
export type RA = [number, number];

/** Points along the cubic Bézier curve with these control points in radius and angle, so the curve bends with the circle. */
export function bentCurve(controls: [RA, RA, RA, RA], samples = 24): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const u = 1 - t;
    const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    const r = controls.reduce((sum, [cr], k) => sum + w[k] * cr, 0);
    const a = controls.reduce((sum, [, ca], k) => sum + w[k] * ca, 0);
    points.push(polar(r, a));
  }
  return points;
}

/**
 * The vajra circle: vajras alternating with lines in a band between 2 circles (himalayanart.org/items/342). The
 * sources do not describe the vajras' direction or outline, so these are design choices: vajras laid end to end
 * along the band, each with a round middle and 2 ends of a central prong and 2 side prongs that bend out toward the
 * band's edges and meet at the end's tip. The band's 2 circles are not drawn here.
 */
export function drawVajras(pen: Pen, inner: number, outer: number, count: number, shift = 0) {
  const mid = (inner + outer) / 2;
  const half = (outer - inner) / 2;
  const step = (Math.PI * 2) / count;
  for (let i = 0; i < count; i++) {
    const a = i * step + shift;
    // The line between this vajra and the next.
    polyline(pen, [polar(inner, a + step / 2), polar(outer, a + step / 2)], false);
    const knob = half * 0.3;
    pen.circle(...polar(mid, a), knob);
    const knobAngle = knob / mid;
    for (const side of [-1, 1]) {
      const start = a + side * knobAngle;
      const end = a + side * step * 0.42;
      const span = end - start;
      polyline(pen, [polar(mid, start), polar(mid, end)], false);
      for (const edge of [-1, 1]) {
        const prong = bentCurve([[mid, start], [mid + edge * half * 0.9, start + span * 0.15], [mid + edge * half * 0.9, start + span * 0.75], [mid, end]]);
        polyline(pen, prong, false);
      }
    }
  }
}
