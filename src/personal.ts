// Builds a complete mandala from a name and birthdate.

import { legibleRepeats } from "./geometry/motifs";
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
  finish: Pick<MandalaParams, "lineContrast" | "borderSpacing" | "smooth" | "minDetail">,
): { params: MandalaParams; numbers: NumerologyProfile } {
  const numbers = profile(name, birth);
  const symmetry = symmetryFromLifePath(numbers.lifePath);
  const ringCount = ringsFromBirthday(numbers.birthday);
  const [chladniN, chladniM] = chladniModes(numbers.soulUrge, numbers.personality);
  const seed = hashString(`${numbers.expression}|${name.toUpperCase()}|${birthText}`) % 100000;
  const rings = autoRings(seed, ringCount, symmetry, "golden");

  // The Expression number also sets the density of the outermost ring, chosen from the legible options.
  const radii = ringRadii(RADIUS, ringCount, "golden");
  const outer = rings[ringCount - 1];
  const options = legibleRepeats(outer.motif, radii[ringCount - 1], radii[ringCount], symmetry);
  outer.repeat = options[(reduce(numbers.expression, false) - 1) % options.length];

  return {
    numbers,
    params: {
      symmetry,
      spacing: "golden",
      center: "flowerOfLife",
      chladniN,
      chladniM,
      seed,
      lineWeight: 1.5,
      rings,
      petalTip: "pointed",
      innerOutline: true,
      dots: false,
      waveDepth: 0.36,
      bindu: true,
      lineContrast: finish.lineContrast,
      borderSpacing: finish.borderSpacing,
      smooth: finish.smooth,
      minDetail: finish.minDetail,
    },
  };
}
