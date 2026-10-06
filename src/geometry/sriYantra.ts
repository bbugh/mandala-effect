// Sri Yantra (Sri Chakra) by the Marma Sthana method.
// Source: "Understanding the geometry of Sri Chakra", International Journal of Sanskrit
// Research 2023; 9(6): 242-248. docs/vendor/sri-chakra-geometry-ijsr-2023.txt
//
// Coordinates follow the paper: the circle has diameter d, x = 0 is the vertical
// diameter, and y runs from 0 (bottom of the circle) to d (top).

export type Point = [number, number];

export type TriangleName = "ravi" | "chandra" | "kuja" | "budha" | "guru" | "shukra" | "shani" | "rahu" | "ketu";

export interface Triangle {
  /** Left base corner, right base corner, apex. */
  corners: [Point, Point, Point];
}

export interface SriYantra {
  triangles: Record<TriangleName, Triangle>;
  bindu: Point;
  /** The 18 points where 3 lines meet, M1 to M18. */
  marma: Record<string, Point>;
}

/** x on the line through a and b at height y. */
function xAt(a: Point, b: Point, y: number): number {
  return a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
}

/** Intersection of the line through a, b and the line through c, d. */
function intersect(a: Point, b: Point, c: Point, d: Point): Point {
  const den = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0]);
  const t = ((a[0] - c[0]) * (c[1] - d[1]) - (a[1] - c[1]) * (c[0] - d[0])) / den;
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}

/** Isosceles triangle from its apex and the height of its base, with sides through a given point. */
function triangleThrough(apex: Point, through: Point, baseY: number): Triangle {
  const x = Math.abs(xAt(apex, through, baseY));
  return { corners: [[-x, baseY], [x, baseY], apex] };
}

/** Isosceles triangle whose base corners lie on the sides of another triangle. */
function triangleWithin(apex: Point, baseY: number, outer: Triangle): Triangle {
  const [left, , outerApex] = outer.corners;
  const x = Math.abs(xAt(left, outerApex, baseY));
  return { corners: [[-x, baseY], [x, baseY], apex] };
}

const leftSide = (t: Triangle): [Point, Point] => [t.corners[0], t.corners[2]];

export function sriYantra(d: number): SriYantra {
  // Parameters (paper, "Parameters" and Appendix).
  const raviY = (8 * d) / 9;
  const kujaY = (2 * d) / 3;
  const shaniY = (2 * d) / 5;
  const ketuY = d / 6;
  const binduY = shaniY + d / 8;
  const shukraY = (binduY + shaniY) / 2;
  const r = d / 2;
  const circleX = (y: number) => Math.sqrt(r * r - (y - r) * (y - r));

  // Steps 2 and 3: Kuja (down) and Shani (up) triangles touch the circle at all 3 corners.
  const kuja: Triangle = { corners: [[-circleX(kujaY), kujaY], [circleX(kujaY), kujaY], [0, 0]] };
  const shani: Triangle = { corners: [[-circleX(shaniY), shaniY], [circleX(shaniY), shaniY], [0, d]] };

  // Step 5: Chandra sides from the centre of the Ketu line through M3 (Kuja line × Shani triangle).
  const m3: Point = [xAt(...leftSide(shani), kujaY), kujaY];
  const chandraApex: Point = [0, ketuY];

  // Step 6: Rahu sides from the centre of the Ravi line through M13 (Shani line × Kuja triangle).
  const m13: Point = [xAt(...leftSide(kuja), shaniY), shaniY];
  const rahuApex: Point = [0, raviY];

  // Step 7: Ketu sides from the centre of the Kuja line through M14 (Shani line × Chandra sides).
  const m14: Point = [xAt(chandraApex, m3, shaniY), shaniY];
  const ketu = triangleThrough([0, kujaY], m14, ketuY);

  // Step 8: Rahu base line through M17 (Kuja × Ketu).
  const m17 = intersect(...leftSide(kuja), ...leftSide(ketu));
  const rahu = triangleThrough(rahuApex, m13, m17[1]);

  // Steps 9 to 11: Ravi sides from the Shukra point through M4 (Kuja line × Rahu sides).
  const m4: Point = [xAt(...leftSide(rahu), kujaY), kujaY];
  const ravi = triangleThrough([0, shukraY], m4, raviY);

  // Step 12: Chandra base line through M1 (Ravi × Shani).
  const m1 = intersect(...leftSide(ravi), ...leftSide(shani));
  const chandra = triangleThrough(chandraApex, m3, m1[1]);

  // Step 13: Shukra base on the Shukra line, reaching the Chandra sides; apex at the Chandra point.
  const shukra = triangleWithin([0, m1[1]], shukraY, chandra);

  // Step 14: Guru base line through M9 (Ravi × Ketu), reaching the Shukra sides; apex at the Shani point.
  const m9 = intersect(...leftSide(ravi), ...leftSide(ketu));
  const guru = triangleWithin([0, shaniY], m9[1], shukra);

  // Steps 15 and 16: Budha base line through M7 (Ravi × Shukra), reaching the Rahu sides; apex at the Rahu point.
  const m7 = intersect(...leftSide(ravi), ...leftSide(shukra));
  const budha = triangleWithin([0, m17[1]], m7[1], rahu);

  // Check points M11 and M12: Budha × Shukra line, which the paper says should meet the Ketu sides.
  const m11: Point = [xAt(...leftSide(budha), shukraY), shukraY];

  const mirror = ([x, y]: Point): Point => [-x, y];
  const m5 = mirror(m4);
  return {
    triangles: { ravi, chandra, kuja, budha, guru, shukra, shani, rahu, ketu },
    bindu: [0, binduY],
    marma: {
      M1: m1, M2: mirror(m1),
      M3: m3, M4: m4, M5: m5, M6: mirror(m3),
      M7: m7, M8: mirror(m7),
      M9: m9, M10: mirror(m9),
      M11: m11, M12: mirror(m11),
      M13: m13, M14: m14, M15: mirror(m14), M16: mirror(m13),
      M17: m17, M18: mirror(m17),
    },
  };
}
