// Center medallions. Each fills a circle of radius r0.

import { linesToPath, zeroContour } from "./contour";
import { PHI } from "./rings";
import { circle, path } from "./svg";

export type CenterName = "chladni" | "cymatics" | "seedOfLife" | "flowerOfLife" | "phyllotaxis";

export const CENTER_LABELS: Record<CenterName, string> = {
  chladni: "Cymatics: Chladni plate",
  cymatics: "Cymatics: rotated to match symmetry",
  seedOfLife: "Seed of Life",
  flowerOfLife: "Flower of Life",
  phyllotaxis: "Phyllotaxis (golden angle)",
};

/** Hexagonal grid of circles: 7 circles for the Seed of Life, 19 for the Flower of Life. */
function hexCircles(r0: number, rings: 1 | 2): string {
  const rho = r0 / (rings + 1);
  const parts: string[] = [];
  for (let q = -rings; q <= rings; q++) {
    for (let r = -rings; r <= rings; r++) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) > rings) continue;
      const x = rho * (q + r / 2);
      const y = rho * ((r * Math.sqrt(3)) / 2);
      parts.push(circle(y, -x, rho));
    }
  }
  return `<clipPath id="center-clip">${circle(0, 0, r0)}</clipPath><g clip-path="url(#center-clip)">${parts.join("")}</g>`;
}

const GOLDEN_ANGLE = Math.PI * 2 * (1 - 1 / PHI);

/** Seeds placed at the golden angle, as in a sunflower head. 233 is a Fibonacci number. */
function phyllotaxis(r0: number): string {
  const count = 233;
  const c = (r0 * 0.94) / Math.sqrt(count);
  const parts: string[] = [];
  for (let i = 1; i <= count; i++) {
    const radius = c * Math.sqrt(i);
    const theta = i * GOLDEN_ANGLE;
    const size = c * 0.42 * (0.55 + 0.45 * Math.sqrt(i / count));
    parts.push(circle(radius * Math.cos(theta), radius * Math.sin(theta), size));
  }
  return parts.join("");
}

/**
 * Chladni figure: the nodal lines (where the plate does not move) of a vibrating
 * square plate in modes n and m. With symmetry above 1, the mode is summed over
 * rotated copies so the figure repeats with the mandala's symmetry.
 */
function cymatics(r0: number, n: number, m: number, symmetry: number, smooth: boolean): string {
  const rotations = Array.from({ length: symmetry }, (_, k) => {
    const a = (k * Math.PI * 2) / symmetry;
    return [Math.cos(a), Math.sin(a)] as const;
  });
  const plate = (x: number, y: number) => {
    let sum = 0;
    for (const [c, s] of rotations) {
      const u = x * c - y * s;
      const v = x * s + y * c;
      sum += Math.cos(n * Math.PI * u) * Math.cos(m * Math.PI * v) + Math.cos(m * Math.PI * u) * Math.cos(n * Math.PI * v);
    }
    return sum;
  };
  const lines = zeroContour(plate, {
    x0: -1, x1: 1, y0: -1, y1: 1, nx: smooth ? 480 : 280, ny: smooth ? 480 : 280,
    // Skip cells outside the unit circle; the clip path trims the edge.
    include: (x, y) => Math.hypot(x, y) < 1.02,
  });
  const d = linesToPath(lines.map((line) => line.map(([x, y]): [number, number] => [x * r0, y * r0])), smooth);
  return `<clipPath id="center-clip">${circle(0, 0, r0)}</clipPath><g clip-path="url(#center-clip)">${path(d)}</g>`;
}

export interface CenterOptions {
  center: CenterName;
  chladniN: number;
  chladniM: number;
  symmetry: number;
  smooth: boolean;
}

export function drawCenter(r0: number, options: CenterOptions): string {
  switch (options.center) {
    case "chladni":
      return cymatics(r0, options.chladniN, options.chladniM, 1, options.smooth);
    case "cymatics":
      return cymatics(r0, options.chladniN, options.chladniM, options.symmetry, options.smooth);
    case "seedOfLife":
      return hexCircles(r0, 1);
    case "flowerOfLife":
      return hexCircles(r0, 2);
    case "phyllotaxis":
      return phyllotaxis(r0);
  }
}
