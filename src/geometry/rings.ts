export const PHI = (1 + Math.sqrt(5)) / 2;

export type Spacing = "golden" | "even";

/**
 * Radii of the ring boundaries, from the center medallion edge to the outer edge.
 * Returns ringCount + 1 values. The medallion radius is R / φ².
 * Golden spacing: boundaries form a geometric sequence, so each ring is wider
 * than the one inside it by the same ratio.
 */
export function ringRadii(outer: number, ringCount: number, spacing: Spacing): number[] {
  const inner = outer / (PHI * PHI);
  const radii: number[] = [];
  for (let i = 0; i <= ringCount; i++) {
    const t = i / ringCount;
    radii.push(spacing === "golden" ? inner * Math.pow(outer / inner, t) : inner + (outer - inner) * t);
  }
  return radii;
}
