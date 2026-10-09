import { describe, expect, test } from "vitest";
import { legibleCounts, MOTIF_NAMES } from "./geometry/motifs";
import { ringRadii } from "./geometry/rings";
import { autoRings, RADIUS } from "./render";

describe("autoRings", () => {
  test("random rings from every motif pick legible copy counts", () => {
    for (let seed = 0; seed < 50; seed++) {
      const rings = autoRings(seed, 6, "golden", MOTIF_NAMES);
      const radii = ringRadii(RADIUS, 6, "golden");
      rings.forEach((ring, i) => expect(legibleCounts(ring.motif, radii[i], radii[i + 1])).toContain(ring.count));
    }
  });
});
