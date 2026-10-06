import { describe, expect, it } from "vitest";
import { sriYantra } from "./sriYantra";

// Expected values: Tables 1 and 2 of the source paper, for d = 360 mm.
// docs/vendor/sri-chakra-geometry-ijsr-2023.txt
const y = sriYantra(360);

describe("Sri Yantra marma points (Table 1)", () => {
  const table: Record<string, [number, number]> = {
    M1: [-68.79, 275.75],
    M3: [-97.98, 240.0],
    M4: [-46.28, 240.0],
    M7: [-31.46, 216.46],
    M9: [-19.93, 198.15],
    M13: [-101.82, 144.0],
    M14: [-45.72, 144.0],
    M17: [-68.3, 96.59],
  };
  for (const [name, [x, yy]] of Object.entries(table)) {
    it(name, () => {
      expect(y.marma[name][0]).toBeCloseTo(x, 1);
      expect(y.marma[name][1]).toBeCloseTo(yy, 1);
    });
  }

  it("M11: Budha side meets the Shukra line within 0.1 mm of the Ketu side (paper: -35.01 and -34.93)", () => {
    const ketu = y.triangles.ketu.corners;
    const ketuX = ketu[0][0] + ((166.5 - ketu[0][1]) * (ketu[2][0] - ketu[0][0])) / (ketu[2][1] - ketu[0][1]);
    expect(Math.abs(y.marma.M11[0] - ketuX)).toBeLessThan(0.1);
  });
});

describe("Sri Yantra triangle corners (Table 2)", () => {
  const table: Record<string, [number, number]> = {
    ravi: [320, 96.66],
    chandra: [275.75, 117.44],
    kuja: [240, 169.71],
    budha: [216.46, 59.9],
    guru: [198.15, 41.18],
    shukra: [166.5, 57.97],
    shani: [144, 176.36],
    rahu: [96.59, 129.25],
    // Table 2 prints 85.93, but the paper's own Ketu line, y = 240 + 2.09962x, and its
    // listed side angle of 64.53° both give 85.73 at y = 60.
    ketu: [60, 85.73],
  };
  for (const [name, [baseY, halfWidth]] of Object.entries(table)) {
    it(name, () => {
      const [, right] = y.triangles[name as keyof typeof y.triangles].corners;
      expect(right[1]).toBeCloseTo(baseY, 1);
      expect(right[0]).toBeCloseTo(halfWidth, 1);
    });
  }

  it("bindu at Shani line + d/8 = 189", () => {
    expect(y.bindu[1]).toBeCloseTo(189, 6);
  });
});
