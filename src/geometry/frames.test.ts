import { describe, expect, test } from "vitest";
import { GATE_STYLES } from "./bhupura";
import { drawFrame, FRAME_COUNTS, FRAME_NAMES, frameExtent } from "./frames";
import type { Pen } from "./pen";

/** A pen that records the largest distance of any point from the center along the x or y axis, and the smallest distance from the center. */
function boundsPen(bounds: { box: number; near: number }): Pen {
  const add = (x: number, y: number, r = 0) => {
    bounds.box = Math.max(bounds.box, Math.abs(x) + r, Math.abs(y) + r);
    bounds.near = Math.min(bounds.near, Math.abs(Math.hypot(x, y) - r));
  };
  return { moveTo: add, lineTo: add, bezierCurveTo: (_a, _b, _c, _d, x, y) => add(x, y), closePath: () => {}, circle: (x, y, r) => add(x, y, r) };
}

describe("frames", () => {
  test("every frame draws outside the circle and inside its extent", () => {
    for (const frame of FRAME_NAMES.filter((name) => name !== "none")) {
      const range = FRAME_COUNTS[frame];
      for (const gate of GATE_STYLES) {
        for (const frameCount of range ? [range.min, range.start, range.max] : [1]) {
          for (const frameTip of ["pointed", "round"] as const) {
            const options = { gate, trivalaya: true, frameCount, frameTip, frameInnerOutline: 1, frameDots: 2, minDetail: false };
            const bounds = { box: 0, near: Infinity };
            const pen = boundsPen(bounds);
            drawFrame(frame, { outer: pen, border: pen, detail: pen, dots: pen }, 500, options);
            expect(bounds.near, frame).toBeGreaterThan(500);
            expect(bounds.box, frame).toBeLessThanOrEqual(frameExtent(frame, 500, options) + 1e-9);
          }
        }
      }
    }
  });
});
