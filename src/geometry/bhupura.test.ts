import { describe, expect, test } from "vitest";
import { bhupuraExtent, drawBhupura, GATE_STYLES } from "./bhupura";
import { Path, type Pen, type Point } from "./pen";

/** A pen that records each line's points. */
function linePen(lines: Point[][]): Pen {
  return {
    moveTo: (x, y) => lines.push([[x, y]]),
    lineTo: (x, y) => lines[lines.length - 1].push([x, y]),
    bezierCurveTo: () => {},
    closePath: () => {},
    circle: () => {},
  };
}

// With r = 72, drawing units are the units of Fig. 1.2 in "Geometry of Srichakra".
describe("bhupura", () => {
  test("the closed gate's outer corners are on the circle of diameter 224 at 30°, 45°, and 60°", () => {
    const outer: Point[][] = [];
    drawBhupura({ outer: linePen(outer), inner: new Path() }, 72, "closed", true);
    const corners = outer[0].filter(([x, y]) => Math.abs(Math.hypot(x, y) - 112) < 1e-9);
    const angles = corners.map(([x, y]) => Math.round((Math.atan2(-y, x) * 180) / Math.PI)).filter((a) => a > 0 && a < 90);
    expect(angles.sort((a, b) => a - b)).toEqual([30, 45, 60]);
    expect(bhupuraExtent(72, "closed")).toBeCloseTo(112 * Math.cos(Math.PI / 6));
  });

  test("the inner line touches the outermost trivalaya circle, and the opening is about 1/3 of the side", () => {
    const inner: Point[][] = [];
    const outer: Point[][] = [];
    drawBhupura({ outer: linePen(outer), inner: linePen(inner) }, 72, "closed", false);
    // The inner pen has the middle line, then the inner line.
    const side = Math.min(...inner[1].map(([x, y]) => Math.max(Math.abs(x), Math.abs(y))));
    expect(side).toBeCloseTo(54 * Math.SQRT2);
    const outerSide = 112 * Math.SQRT1_2;
    const neck = Math.min(...outer[0].filter(([, y]) => Math.abs(y + outerSide) < 1e-9).map(([x]) => Math.abs(x)));
    expect((2 * neck) / (2 * outerSide)).toBeGreaterThan(0.25);
    expect((2 * neck) / (2 * outerSide)).toBeLessThan(0.36);
  });

  test("every gate style draws 3 lines that stay inside its extent", () => {
    for (const gate of GATE_STYLES) {
      const lines: Point[][] = [];
      drawBhupura({ outer: linePen(lines), inner: linePen(lines) }, 72, gate, false);
      expect(lines.length, gate).toBe(gate === "closed" ? 3 : 12);
      const reach = Math.max(...lines.flat().map(([x, y]) => Math.max(Math.abs(x), Math.abs(y))));
      expect(reach, gate).toBeCloseTo(bhupuraExtent(72, gate));
    }
  });
});
