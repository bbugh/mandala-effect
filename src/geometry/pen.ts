// Drawing calls that the geometry code makes. Coordinates are centered on (0, 0).

/** The drawing calls that the geometry code makes. Each output (the WebGL drawing and the SVG file) implements them. */
export interface Pen {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  closePath(): void;
  /** A full circle, as its own subpath. */
  circle(cx: number, cy: number, r: number): void;
}

export type Point = [number, number];

/** A filled circle. */
export interface Disk {
  cx: number;
  cy: number;
  r: number;
}

export function polar(r: number, angle: number): Point {
  return [r * Math.cos(angle), r * Math.sin(angle)];
}

const MOVE = 0;
const LINE = 1;
const CURVE = 2;
const CLOSE = 3;
const CIRCLE = 4;

/** A Pen that records its calls, so the same drawing can be sent to more than 1 output. */
export class Path implements Pen {
  private ops: number[] = [];

  moveTo(x: number, y: number) {
    this.ops.push(MOVE, x, y);
  }

  lineTo(x: number, y: number) {
    this.ops.push(LINE, x, y);
  }

  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) {
    this.ops.push(CURVE, c1x, c1y, c2x, c2y, x, y);
  }

  closePath() {
    this.ops.push(CLOSE);
  }

  circle(cx: number, cy: number, r: number) {
    this.ops.push(CIRCLE, cx, cy, r);
  }

  get empty() {
    return this.ops.length === 0;
  }

  /** Makes the recorded calls on another pen. */
  replay(pen: Pen) {
    const o = this.ops;
    for (let i = 0; i < o.length; ) {
      switch (o[i]) {
        case MOVE: pen.moveTo(o[i + 1], o[i + 2]); i += 3; break;
        case LINE: pen.lineTo(o[i + 1], o[i + 2]); i += 3; break;
        case CURVE: pen.bezierCurveTo(o[i + 1], o[i + 2], o[i + 3], o[i + 4], o[i + 5], o[i + 6]); i += 7; break;
        case CLOSE: pen.closePath(); i += 1; break;
        case CIRCLE: pen.circle(o[i + 1], o[i + 2], o[i + 3]); i += 4; break;
        default: throw new Error(`Unknown path operation ${o[i]}`);
      }
    }
  }
}

/** Polyline through the given points, closed unless closed is false. */
export function polyline(pen: Pen, points: Point[], closed = true) {
  pen.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) pen.lineTo(...points[i]);
  if (closed) pen.closePath();
}
