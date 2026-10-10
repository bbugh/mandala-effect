// Drawing tests: each design's SVG file is compared to a saved copy in src/__drawings__, which can be
// opened in a browser. After an intended drawing change, `pnpm exec vitest run -u` saves the new copies.

import { describe, expect, test } from "vitest";
import { CENTER_LABELS, type CenterName } from "./geometry/centers";
import { DEFAULT_RING_OPTIONS, MOTIF_NAMES } from "./geometry/motifs";
import { autoRings, drawingSize, type MandalaParams, mandalaLayers, type RingSpec } from "./render";
import { mandalaSvg } from "./svg";

/** The design the page shows on load. */
const base: MandalaParams = {
  rotations: 12,
  spacing: "golden",
  center: "flowerOfLife",
  chladniN: 3,
  chladniM: 5,
  seed: 108,
  lineWeight: 1.5,
  rings: autoRings(108, 5, "golden"),
  bindu: true,
  borderThickness: 1,
  borderSpacing: 1,
  smooth: true,
  minDetail: false,
  frame: "none",
  gate: "closed",
  trivalaya: true,
  frameCount: 16,
  frameTip: "pointed",
  frameInnerOutline: 0.6,
  frameDots: 0,
};

/** 1 ring of every pattern, with the options that pattern uses turned on. */
const everyMotif = (options: Partial<RingSpec>): RingSpec[] =>
  MOTIF_NAMES.map((motif) => ({ ...DEFAULT_RING_OPTIONS, motif, count: motif === "cymatics" ? 6 : 16, ...options }));

const drawing = (params: MandalaParams) => mandalaSvg(mandalaLayers(params), drawingSize(params));

describe("drawings", () => {
  test("the design shown on page load", async () => {
    await expect(drawing(base)).toMatchFileSnapshot("__drawings__/page-load.svg");
  });

  for (const center of Object.keys(CENTER_LABELS) as CenterName[]) {
    test(`the ${center} center`, async () => {
      await expect(drawing({ ...base, center, rings: base.rings.slice(0, 2) })).toMatchFileSnapshot(`__drawings__/center-${center}.svg`);
    });
  }

  test("every ring pattern with round tips, inner outlines, and dots", async () => {
    const rings = everyMotif({ petalTip: "round", innerOutline: 0.6, dots: 1 });
    await expect(drawing({ ...base, rings })).toMatchFileSnapshot("__drawings__/rings-round.svg");
  });

  test("every ring pattern with pointed tips, large dots, single borders, and uniform spacing", async () => {
    const rings = everyMotif({ petalTip: "pointed", innerOutline: 0, dots: 2, waveDepth: 0.5, cymaticsN: 2, cymaticsM: 7 });
    const params: MandalaParams = { ...base, rings, spacing: "even", borderSpacing: 0, borderThickness: 2, lineWeight: 3 };
    await expect(drawing(params)).toMatchFileSnapshot("__drawings__/rings-pointed.svg");
  });

  test("wide border spacing and hidden print details", async () => {
    const rings = everyMotif({ innerOutline: 0.2, dots: 0.5 });
    await expect(drawing({ ...base, rings, borderSpacing: 2, borderThickness: 0, minDetail: true })).toMatchFileSnapshot("__drawings__/print-details.svg");
  });
});
