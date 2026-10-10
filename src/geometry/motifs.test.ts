import { describe, expect, test } from "vitest";
import { DEFAULT_RING_OPTIONS, INTERVAL_NAMES, MOTIFS, type RingContext } from "./motifs";
import { Path, type Pen } from "./pen";

/** A pen that records the distance of every point from the center. */
function radiusPen(radii: number[]): Pen {
  const add = (x: number, y: number) => radii.push(Math.hypot(x, y));
  return { moveTo: add, lineTo: add, bezierCurveTo: (_a, _b, _c, _d, x, y) => add(x, y), closePath: () => {}, circle: () => {} };
}

describe("spirograph ring", () => {
  test("every interval draws a curve that stays inside the ring", () => {
    for (const interval of INTERVAL_NAMES) {
      const radii: number[] = [];
      const ring: RingContext = {
        r1: 300,
        r2: 400,
        count: 12,
        offset: true,
        clip: [300, 400],
        style: { ...DEFAULT_RING_OPTIONS, interval, smooth: false, minDetail: false },
      };
      MOTIFS.spirograph(ring, { main: radiusPen(radii), detail: new Path(), dots: new Path() });
      expect(radii.length).toBeGreaterThan(0);
      expect(Math.min(...radii)).toBeGreaterThanOrEqual(300);
      expect(Math.max(...radii)).toBeLessThanOrEqual(400);
    }
  });
});

describe("vajra ring", () => {
  test("draws vajras that stay inside the ring", () => {
    for (const count of [4, 24, 60]) {
      const radii: number[] = [];
      const ring: RingContext = {
        r1: 300,
        r2: 340,
        count,
        offset: true,
        clip: [300, 340],
        style: { ...DEFAULT_RING_OPTIONS, smooth: false, minDetail: false },
      };
      MOTIFS.vajra(ring, { main: radiusPen(radii), detail: new Path(), dots: new Path() });
      expect(radii.length).toBeGreaterThan(0);
      expect(Math.min(...radii)).toBeGreaterThanOrEqual(300 - 1e-9);
      expect(Math.max(...radii)).toBeLessThanOrEqual(340 + 1e-9);
    }
  });
});
