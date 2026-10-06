import { describe, expect, test } from "vitest";
import { legibleRepeats, MOTIF_NAMES } from "./geometry/motifs";
import { ringRadii } from "./geometry/rings";
import { autoRings, fitRepeats, RADIUS } from "./render";

describe("fitRepeats", () => {
  test("a Flower of Life band with too few repeats for its ring is changed to a legible count", () => {
    // Ring 4 of a pasted mandala: 20 circles of radius 118 in a ring 72 units wide.
    const rings = [
      { motif: "dots" as const, repeat: 3 },
      { motif: "lotus" as const, repeat: 2 },
      { motif: "scallops" as const, repeat: 3 },
      { motif: "flowerBand" as const, repeat: 2 },
      { motif: "dots" as const, repeat: 3 },
    ];
    const fitted = fitRepeats(rings, 10, "golden");
    expect(fitted[3]).toEqual({ motif: "flowerBand", repeat: 7 });
    expect(fitted[0]).toBe(rings[0]);
  });

  test("random rings from every motif are already legible", () => {
    for (let seed = 0; seed < 50; seed++) {
      const rings = autoRings(seed, 6, 12, "golden", MOTIF_NAMES);
      expect(fitRepeats(rings, 12, "golden")).toEqual(rings);
      const radii = ringRadii(RADIUS, 6, "golden");
      rings.forEach((ring, i) => expect(legibleRepeats(ring.motif, radii[i], radii[i + 1], 12)).toContain(ring.repeat));
    }
  });
});
