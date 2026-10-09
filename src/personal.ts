// Builds a complete mandala from a name and birthdate.

import { legibleCounts } from "./geometry/motifs";
import { ringRadii } from "./geometry/rings";
import {
  type BirthDate,
  chladniModes,
  type NumerologyProfile,
  profile,
  reduce,
  ringsFromBirthday,
  symmetryFromLifePath,
} from "./numerology";
import { autoRings, type MandalaParams, RADIUS } from "./render";
import { hashString } from "./rng";

export function personalMandala(
  name: string,
  birth: BirthDate,
  birthText: string,
  finish: Pick<MandalaParams, "borderThickness" | "borderSpacing" | "smooth" | "minDetail">,
): { params: MandalaParams; numbers: NumerologyProfile } {
  const numbers = profile(name, birth);
  const symmetry = symmetryFromLifePath(numbers.lifePath);
  const ringCount = ringsFromBirthday(numbers.birthday);
  const [chladniN, chladniM] = chladniModes(numbers.soulUrge, numbers.personality);
  const seed = hashString(`${numbers.expression}|${name.toUpperCase()}|${birthText}`) % 100000;
  const rings = autoRings(seed, ringCount, "golden");

  // The Expression number also sets the density of the outermost ring, chosen from the legible options.
  const radii = ringRadii(RADIUS, ringCount, "golden");
  const outer = rings[ringCount - 1];
  const options = legibleCounts(outer.motif, radii[ringCount - 1], radii[ringCount]);
  outer.count = options[(reduce(numbers.expression, false) - 1) % options.length];

  return {
    numbers,
    params: {
      rotations: symmetry,
      spacing: "golden",
      center: "flowerOfLife",
      chladniN,
      chladniM,
      seed,
      lineWeight: 1.5,
      rings,
      bindu: true,
      borderThickness: finish.borderThickness,
      borderSpacing: finish.borderSpacing,
      smooth: finish.smooth,
      minDetail: finish.minDetail,
    },
  };
}
