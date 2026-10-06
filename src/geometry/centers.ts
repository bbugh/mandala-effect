// Central figures. Each fills a circle of radius r0 centered on (0, 0).

import { linesToPath, zeroContour } from "./contour";
import { sriYantra } from "./sriYantra";
import { circle, path, polyline } from "./svg";

export type CenterName = "flowerOfLife" | "seedOfLife" | "phyllotaxis" | "sriYantra" | "chladni" | "cymatics";

export const CENTER_LABELS: Record<CenterName, string> = {
  flowerOfLife: "Flower of Life",
  seedOfLife: "Seed of Life",
  phyllotaxis: "Sunflower spiral",
  sriYantra: "Sri Yantra",
  chladni: "Cymatics: Chladni plate",
  cymatics: "Cymatics: rotated to match symmetry",
};

/** Centers used when a mandala is generated. The others are available in the Custom tab only. */
export const DEFAULT_CENTERS: readonly CenterName[] = ["flowerOfLife", "seedOfLife", "phyllotaxis"];

export interface CenterOptions {
  center: CenterName;
  chladniN: number;
  chladniM: number;
  smooth: boolean;
  symmetry: number;
  bindu: boolean;
}

export interface CenterOutput {
  lines: string;
  /** Filled shapes (the bindu). */
  filled: string;
}

/** The 9 Sri Yantra triangles, drawn in the circle of radius r0. The paper's y axis points up from the bottom of the circle. */
function drawSriYantra(r0: number, bindu: boolean): CenterOutput {
  const yantra = sriYantra(r0 * 2);
  const toSvg = ([x, y]: [number, number]): [number, number] => [x, r0 - y];
  const lines = Object.values(yantra.triangles)
    .map((t) => polyline(t.corners.map(toSvg)))
    .join("");
  const [bx, by] = toSvg(yantra.bindu);
  return { lines, filled: bindu ? circle(bx, by, r0 * 0.012) : "" };
}

/** Circles on a triangular grid with radius equal to their spacing: 7 circles (Seed of Life) or 19 (Flower of Life). */
function hexCircles(r0: number, rings: 1 | 2): CenterOutput {
  const rho = r0 / (rings + 1);
  const parts: string[] = [];
  for (let q = -rings; q <= rings; q++) {
    for (let r = -rings; r <= rings; r++) {
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) > rings) continue;
      const x = rho * (q + r / 2);
      const y = rho * ((r * Math.sqrt(3)) / 2);
      parts.push(circle(y, -x, rho));
    }
  }
  return { lines: `<clipPath id="center-clip">${circle(0, 0, r0)}</clipPath><g clip-path="url(#center-clip)">${parts.join("")}</g>`, filled: "" };
}

/** Vogel's model (1979): seed n at r = c·√n, θ = n × 137.508°. 233 is a Fibonacci number. */
function phyllotaxis(r0: number): CenterOutput {
  const count = 233;
  const c = (r0 * 0.94) / Math.sqrt(count);
  const parts: string[] = [];
  for (let n = 1; n <= count; n++) {
    const radius = c * Math.sqrt(n);
    const theta = (n * 137.508 * Math.PI) / 180;
    parts.push(circle(radius * Math.cos(theta), radius * Math.sin(theta), c * 0.35));
  }
  return { lines: parts.join(""), filled: "" };
}

/**
 * Chladni figure for a square plate of side L constrained at the center (Paul Bourke, 2003):
 * cos(nπx/L)·cos(mπy/L) − cos(mπx/L)·cos(nπy/L) = 0, with x and y measured from the center.
 * Here L = 2 and x, y run from −1 to 1. docs/vendor/paulbourke-chladni.html
 */
function chladni(r0: number, n: number, m: number, smooth: boolean): CenterOutput {
  const plate = (x: number, y: number) =>
    Math.cos((n * Math.PI * x) / 2) * Math.cos((m * Math.PI * y) / 2) - Math.cos((m * Math.PI * x) / 2) * Math.cos((n * Math.PI * y) / 2);
  const size = smooth ? 480 : 280;
  const lines = zeroContour(plate, {
    x0: -1, x1: 1, y0: -1, y1: 1, nx: size, ny: size,
    // Skip cells outside the unit circle; the clip path trims the edge.
    include: (x, y) => Math.hypot(x, y) < 1.02,
  });
  const d = linesToPath(lines.map((line) => line.map(([x, y]): [number, number] => [x * r0, y * r0])), smooth);
  return { lines: `<clipPath id="center-clip">${circle(0, 0, r0)}</clipPath><g clip-path="url(#center-clip)">${path(d)}</g>`, filled: "" };
}

/**
 * The square plate function summed over rotated copies, so the figure repeats with the
 * mandala's symmetry. This is a design choice with no source; no physical plate produces it.
 */
function cymaticsRotated(r0: number, n: number, m: number, symmetry: number, smooth: boolean): CenterOutput {
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
  const size = smooth ? 480 : 280;
  const lines = zeroContour(plate, {
    x0: -1, x1: 1, y0: -1, y1: 1, nx: size, ny: size,
    include: (x, y) => Math.hypot(x, y) < 1.02,
  });
  const d = linesToPath(lines.map((line) => line.map(([x, y]): [number, number] => [x * r0, y * r0])), smooth);
  return { lines: `<clipPath id="center-clip">${circle(0, 0, r0)}</clipPath><g clip-path="url(#center-clip)">${path(d)}</g>`, filled: "" };
}

export function drawCenter(r0: number, options: CenterOptions): CenterOutput {
  switch (options.center) {
    case "sriYantra":
      return drawSriYantra(r0, options.bindu);
    case "seedOfLife":
      return hexCircles(r0, 1);
    case "flowerOfLife":
      return hexCircles(r0, 2);
    case "chladni":
      return chladni(r0, options.chladniN, options.chladniM, options.smooth);
    case "phyllotaxis":
      return phyllotaxis(r0);
    case "cymatics":
      return cymaticsRotated(r0, options.chladniN, options.chladniM, options.symmetry, options.smooth);
  }
}
