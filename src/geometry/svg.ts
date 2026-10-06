// Small helpers for writing SVG markup. Coordinates are centered on (0, 0).

export function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

export function polar(r: number, angle: number): [number, number] {
  return [r * Math.cos(angle), r * Math.sin(angle)];
}

export function pt([x, y]: [number, number]): string {
  return `${fmt(x)} ${fmt(y)}`;
}

export function circle(cx: number, cy: number, r: number): string {
  return `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}"/>`;
}

export function path(d: string): string {
  return `<path d="${d}"/>`;
}

/** Closed polyline through the given points. */
export function polyline(points: [number, number][], closed = true): string {
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${pt(p)}`).join("");
  return path(closed ? `${d}Z` : d);
}

/** Wraps markup in a clip path limited to the ring between r1 and r2. */
export function clipToRing(id: string, r1: number, r2: number, body: string): string {
  const ring = `M${fmt(r2)} 0A${fmt(r2)} ${fmt(r2)} 0 1 0 ${fmt(-r2)} 0A${fmt(r2)} ${fmt(r2)} 0 1 0 ${fmt(r2)} 0Z` +
    `M${fmt(r1)} 0A${fmt(r1)} ${fmt(r1)} 0 1 1 ${fmt(-r1)} 0A${fmt(r1)} ${fmt(r1)} 0 1 1 ${fmt(r1)} 0Z`;
  return `<clipPath id="${id}"><path clip-rule="evenodd" d="${ring}"/></clipPath><g clip-path="url(#${id})">${body}</g>`;
}
