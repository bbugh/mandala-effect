// Marching squares: traces the zero lines of a function over a rectangle.

export type Point = [number, number];

export interface Domain {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  nx: number;
  ny: number;
  /** Optional filter: cells whose center fails this test are skipped. */
  include?: (x: number, y: number) => boolean;
}

/** Returns polylines (in domain coordinates) where f changes sign. */
export function zeroContour(f: (x: number, y: number) => number, domain: Domain): Point[][] {
  const { x0, x1, y0, y1, nx, ny, include } = domain;
  const dx = (x1 - x0) / nx;
  const dy = (y1 - y0) / ny;
  const values: number[][] = [];
  for (let j = 0; j <= ny; j++) {
    const row: number[] = [];
    for (let i = 0; i <= nx; i++) row.push(f(x0 + i * dx, y0 + j * dy));
    values.push(row);
  }
  const lerp = (a: number, b: number) => a / (a - b);
  const segments: [Point, Point][] = [];

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * dx;
      const y = y0 + j * dy;
      if (include && !include(x + dx / 2, y + dy / 2)) continue;
      const tl = values[j][i];
      const tr = values[j][i + 1];
      const br = values[j + 1][i + 1];
      const bl = values[j + 1][i];
      const index = (tl > 0 ? 8 : 0) | (tr > 0 ? 4 : 0) | (br > 0 ? 2 : 0) | (bl > 0 ? 1 : 0);
      if (index === 0 || index === 15) continue;

      const top: Point = [x + dx * lerp(tl, tr), y];
      const right: Point = [x + dx, y + dy * lerp(tr, br)];
      const bottom: Point = [x + dx * lerp(bl, br), y + dy];
      const left: Point = [x, y + dy * lerp(tl, bl)];
      const centerPositive = (tl + tr + br + bl) / 4 > 0;

      switch (index) {
        case 1: case 14: segments.push([left, bottom]); break;
        case 2: case 13: segments.push([bottom, right]); break;
        case 3: case 12: segments.push([left, right]); break;
        case 4: case 11: segments.push([top, right]); break;
        case 6: case 9: segments.push([top, bottom]); break;
        case 7: case 8: segments.push([left, top]); break;
        case 5:
          if (centerPositive) segments.push([left, top], [bottom, right]);
          else segments.push([left, bottom], [top, right]);
          break;
        case 10:
          if (centerPositive) segments.push([left, bottom], [top, right]);
          else segments.push([left, top], [bottom, right]);
          break;
      }
    }
  }
  return joinSegments(segments);
}

/** Connects segments that share endpoints into longer polylines, which makes the SVG much smaller. */
function joinSegments(segments: [Point, Point][]): Point[][] {
  const key = ([x, y]: Point) => `${Math.round(x * 1e6)},${Math.round(y * 1e6)}`;
  const byEnd = new Map<string, number[]>();
  segments.forEach(([a, b], index) => {
    for (const p of [a, b]) {
      const k = key(p);
      const list = byEnd.get(k);
      if (list) list.push(index);
      else byEnd.set(k, [index]);
    }
  });
  const used = new Uint8Array(segments.length);
  const next = (p: Point): Point | null => {
    for (const index of byEnd.get(key(p)) ?? []) {
      if (used[index]) continue;
      used[index] = 1;
      const [a, b] = segments[index];
      return key(a) === key(p) ? b : a;
    }
    return null;
  };

  const lines: Point[][] = [];
  segments.forEach(([a, b], index) => {
    if (used[index]) return;
    used[index] = 1;
    const line: Point[] = [a, b];
    for (let p = next(b); p; p = next(p)) line.push(p);
    for (let p = next(a); p; p = next(p)) line.unshift(p);
    lines.push(line);
  });
  return lines;
}

const fmt = (n: number) => Number(n.toFixed(2)).toString();

/**
 * Converts polylines into SVG path data. With smooth set, each polyline becomes a
 * Catmull-Rom spline (drawn as cubic Bézier curves), which removes the small
 * corners that marching squares leaves at grid cell edges.
 */
export function linesToPath(lines: Point[][], smooth: boolean): string {
  return lines
    .map((line) => {
      const start = `M${fmt(line[0][0])} ${fmt(line[0][1])}`;
      if (!smooth || line.length < 3) {
        return start + line.slice(1).map(([x, y]) => `L${fmt(x)} ${fmt(y)}`).join("");
      }
      const first = line[0];
      const last = line[line.length - 1];
      const closed = Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-6;
      const at = (i: number): Point => {
        if (closed) return line[(i + line.length - 1) % (line.length - 1)];
        return line[Math.max(0, Math.min(line.length - 1, i))];
      };
      let d = start;
      for (let i = 0; i < line.length - 1; i++) {
        const [p0, p1, p2, p3] = [at(i - 1), line[i], line[i + 1], at(i + 2)];
        const c1x = p1[0] + (p2[0] - p0[0]) / 6;
        const c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6;
        const c2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += `C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p2[0])} ${fmt(p2[1])}`;
      }
      return d;
    })
    .join("");
}
