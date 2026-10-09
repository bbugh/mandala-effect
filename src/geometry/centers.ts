// Central figures. Each fills a circle of radius r0 centered on (0, 0).

import { drawLines, zeroContour } from "./contour";
import { type Disk, type Pen, polyline } from "./pen";
import { sriYantra } from "./sriYantra";

export type CenterName = "flowerOfLife" | "seedOfLife" | "phyllotaxis" | "sriYantra" | "chladni" | "cymatics";

export const CENTER_LABELS: Record<CenterName, string> = {
  flowerOfLife: "Flower of Life",
  seedOfLife: "Seed of Life",
  phyllotaxis: "Sunflower spiral",
  sriYantra: "Sri Yantra",
  chladni: "Cymatics: Chladni plate",
  cymatics: "Cymatics: rotated",
};

export interface CenterOptions {
  center: CenterName;
  chladniN: number;
  chladniM: number;
  smooth: boolean;
  /** Number of rotated copies in the rotated cymatics center. */
  rotations: number;
  bindu: boolean;
}

/** Where a center draws: lines are stroked, and filled circles (the bindu) are added to disks. */
export interface CenterPens {
  lines: Pen;
  disks: Disk[];
}

/** Whether the center's lines must be masked to its circle. */
export interface CenterOutput {
  clip: boolean;
}

/** The 9 Sri Yantra triangles, drawn in the circle of radius r0. The paper's y axis points up from the bottom of the circle. */
function drawSriYantra(pens: CenterPens, r0: number, bindu: boolean): CenterOutput {
  const yantra = sriYantra(r0 * 2);
  const toScreen = ([x, y]: [number, number]): [number, number] => [x, r0 - y];
  for (const t of Object.values(yantra.triangles)) polyline(pens.lines, t.corners.map(toScreen));
  if (bindu) {
    const [cx, cy] = toScreen(yantra.bindu);
    pens.disks.push({ cx, cy, r: r0 * 0.012 });
  }
  return { clip: false };
}

/** Circles on a triangular grid with radius equal to their spacing: 7 circles (Seed of Life) or 19 (Flower of Life). */
function hexCircles(pen: Pen, r0: number, rings: 1 | 2): CenterOutput {
  const rho = r0 / (rings + 1);
  for (let q = -rings; q <= rings; q++) {
    for (let r = -rings; r <= rings; r++) {
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) > rings) continue;
      const x = rho * (q + r / 2);
      const y = rho * ((r * Math.sqrt(3)) / 2);
      pen.circle(y, -x, rho);
    }
  }
  return { clip: true };
}

/** Vogel's model (1979): seed n at r = c·√n, θ = n × 137.508°. 233 is a Fibonacci number. */
function phyllotaxis(pen: Pen, r0: number): CenterOutput {
  const count = 233;
  const c = (r0 * 0.94) / Math.sqrt(count);
  for (let n = 1; n <= count; n++) {
    const radius = c * Math.sqrt(n);
    const theta = (n * 137.508 * Math.PI) / 180;
    pen.circle(radius * Math.cos(theta), radius * Math.sin(theta), c * 0.35);
  }
  return { clip: false };
}

/**
 * Chladni figure for a square plate of side L constrained at the center (Paul Bourke, 2003):
 * cos(nπx/L)·cos(mπy/L) − cos(mπx/L)·cos(nπy/L) = 0, with x and y measured from the center.
 * Here L = 2 and x, y run from −1 to 1. docs/vendor/paulbourke-chladni.html
 */
function chladni(pen: Pen, r0: number, n: number, m: number, smooth: boolean): CenterOutput {
  // With n equal to m the "−" formula is 0 everywhere and has no lines, so equal modes use "+",
  // which draws a grid of straight lines. With n = m = 1 those lines are the plate's edges, which are
  // outside the circle, so that pair still draws nothing.
  const sign = n === m ? 1 : -1;
  const plate = (x: number, y: number) =>
    Math.cos((n * Math.PI * x) / 2) * Math.cos((m * Math.PI * y) / 2) +
    sign * Math.cos((m * Math.PI * x) / 2) * Math.cos((n * Math.PI * y) / 2);
  const size = smooth ? 480 : 280;
  const lines = zeroContour(plate, {
    x0: -1, x1: 1, y0: -1, y1: 1, nx: size, ny: size,
    // Skip cells outside the unit circle; the clip path trims the edge.
    include: (x, y) => Math.hypot(x, y) < 1.02,
  });
  drawLines(pen, lines.map((line) => line.map(([x, y]): [number, number] => [x * r0, y * r0])), smooth);
  return { clip: true };
}

/**
 * The square plate function summed over a number of rotated copies, so the figure repeats
 * that many times around the center. This is a design choice with no source; no physical plate produces it.
 */
function cymaticsRotated(pen: Pen, r0: number, n: number, m: number, copies: number, smooth: boolean): CenterOutput {
  const size = smooth ? 480 : 280;
  const step = 2 / size;
  // Each copy adds cos(nπu)·cos(mπv) + cos(mπu)·cos(nπv), with u = x·c − y·s and v = x·s + y·c.
  // cos(a·u) = cos(a·c·x)·cos(a·s·y) + sin(a·c·x)·sin(a·s·y) and cos(a·v) = cos(a·s·x)·cos(a·c·y) − sin(a·s·x)·sin(a·c·y),
  // so the sines and cosines are calculated once per grid column and once per grid row, and each grid point
  // needs only multiplications.
  const points = size + 1;
  const values = new Float64Array(points * points);
  const xs = new Float64Array(points * 8);
  const ys = new Float64Array(points * 8);
  for (let k = 0; k < copies; k++) {
    const angle = (k * Math.PI * 2) / copies;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    for (let i = 0; i < points; i++) {
      const t = -1 + i * step;
      const o = i * 8;
      // Columns use x, rows use y. Order: nπc, mπs, mπc, nπs for columns; nπs, mπc, mπs, nπc for rows.
      const column = [n * c, m * s, m * c, n * s];
      const row = [n * s, m * c, m * s, n * c];
      for (let f = 0; f < 4; f++) {
        xs[o + f * 2] = Math.cos(column[f] * Math.PI * t);
        xs[o + f * 2 + 1] = Math.sin(column[f] * Math.PI * t);
        ys[o + f * 2] = Math.cos(row[f] * Math.PI * t);
        ys[o + f * 2 + 1] = Math.sin(row[f] * Math.PI * t);
      }
    }
    for (let j = 0; j < points; j++) {
      const y = j * 8;
      for (let i = 0; i < points; i++) {
        const x = i * 8;
        const cosNU = xs[x] * ys[y] + xs[x + 1] * ys[y + 1];
        const cosMV = xs[x + 2] * ys[y + 2] - xs[x + 3] * ys[y + 3];
        const cosMU = xs[x + 4] * ys[y + 4] + xs[x + 5] * ys[y + 5];
        const cosNV = xs[x + 6] * ys[y + 6] - xs[x + 7] * ys[y + 7];
        values[j * points + i] += cosNU * cosMV + cosMU * cosNV;
      }
    }
  }
  const plate = (x: number, y: number) => values[Math.round((y + 1) / step) * points + Math.round((x + 1) / step)];
  const lines = zeroContour(plate, {
    x0: -1, x1: 1, y0: -1, y1: 1, nx: size, ny: size,
    include: (x, y) => Math.hypot(x, y) < 1.02,
  });
  drawLines(pen, lines.map((line) => line.map(([x, y]): [number, number] => [x * r0, y * r0])), smooth);
  return { clip: true };
}

export function drawCenter(pens: CenterPens, r0: number, options: CenterOptions): CenterOutput {
  switch (options.center) {
    case "sriYantra":
      return drawSriYantra(pens, r0, options.bindu);
    case "seedOfLife":
      return hexCircles(pens.lines, r0, 1);
    case "flowerOfLife":
      return hexCircles(pens.lines, r0, 2);
    case "chladni":
      return chladni(pens.lines, r0, options.chladniN, options.chladniM, options.smooth);
    case "phyllotaxis":
      return phyllotaxis(pens.lines, r0);
    case "cymatics":
      return cymaticsRotated(pens.lines, r0, options.chladniN, options.chladniM, options.rotations, options.smooth);
  }
}
