// Draws line segments with WebGL. Each segment is drawn as a rectangle around it, and the fragment
// shader keeps the pixels within half the line width of the segment, which gives round line ends and
// corners. Each segment also has a ring mask: pixels outside its inner and outer radius are not drawn.

import type { Pen } from "./geometry/pen";
import { INK, type Layer, PAPER } from "./render";

/** Floats per segment: start x, start y, end x, end y, half width, mask inner radius, mask outer radius. */
const FLOATS = 7;

/** Mask radii that do not hide anything. */
const NO_MASK: [number, number] = [-1, 1e9];

/** Distance in pixels that a straight segment may be from the curve it replaces. */
const TOLERANCE = 0.2;

/**
 * A Pen that turns paths into segments. Arcs and curves are divided into straight segments that are at
 * most `tolerance` away from the true curve. The width and mask in effect when a segment is added are
 * stored with it.
 */
class Segments implements Pen {
  data: number[] = [];
  halfWidth = 0.5;
  mask: [number, number] = NO_MASK;
  private x = 0;
  private y = 0;
  private startX = 0;
  private startY = 0;
  /** Whether the current subpath has a segment yet. */
  private drawn = false;

  constructor(private tolerance: number) {}

  private add(ax: number, ay: number, bx: number, by: number, halfWidth: number) {
    this.data.push(ax, ay, bx, by, halfWidth, this.mask[0], this.mask[1]);
  }

  moveTo(x: number, y: number) {
    this.x = this.startX = x;
    this.y = this.startY = y;
    this.drawn = false;
  }

  /**
   * A line to the same point is skipped, except as the first segment of a subpath: SVG draws a dot for
   * a subpath of length 0 with round line ends, and the segment of length 0 draws the same dot here.
   */
  lineTo(x: number, y: number) {
    if (x !== this.x || y !== this.y || !this.drawn) {
      this.add(this.x, this.y, x, y, this.halfWidth);
      this.drawn = true;
    }
    this.x = x;
    this.y = y;
  }

  closePath() {
    this.lineTo(this.startX, this.startY);
  }

  circle(cx: number, cy: number, r: number) {
    this.moveTo(cx + r, cy);
    const step = 2 * Math.acos(Math.max(-1, 1 - this.tolerance / r));
    const n = Math.max(8, Math.ceil((Math.PI * 2) / step));
    for (let i = 1; i <= n; i++) {
      const a = (Math.PI * 2 * i) / n;
      this.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
  }

  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) {
    const x0 = this.x;
    const y0 = this.y;
    // Number of segments that keeps the curve within the tolerance, from the curve's second differences.
    const dd = Math.max(Math.hypot(x0 - 2 * c1x + c2x, y0 - 2 * c1y + c2y), Math.hypot(c1x - 2 * c2x + x, c1y - 2 * c2y + y));
    const n = Math.max(1, Math.ceil(Math.sqrt((3 * dd) / (4 * this.tolerance))));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      this.lineTo(
        u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x,
        u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y,
      );
    }
  }

  /** A filled disk: a segment of length 0 whose half width is the radius. */
  disk(cx: number, cy: number, r: number) {
    this.add(cx, cy, cx, cy, r);
  }
}

/** The segments for a layer's strokes at the given tolerance in drawing units. */
function layerSegments(layer: Layer, tolerance: number): number[] {
  const segments = new Segments(tolerance);
  for (const stroke of layer.strokes) {
    if (stroke.kind === "disks") {
      segments.mask = NO_MASK;
      for (const { cx, cy, r } of stroke.disks) segments.disk(cx, cy, r);
      continue;
    }
    segments.halfWidth = stroke.width / 2;
    // A mask whose inner radius is 0 would fade the pixel at the center, so it starts below 0.
    segments.mask = stroke.mask ? [stroke.mask[0] > 0 ? stroke.mask[0] : -1, stroke.mask[1]] : NO_MASK;
    stroke.path.replay(segments);
  }
  return segments.data;
}

const VERTEX = `#version 300 es
in vec4 segment;
in vec3 widthMask;
uniform float scale;
uniform float pixel;
out vec2 position;
flat out vec4 ends;
flat out vec3 lineMask;
void main() {
  vec2 a = segment.xy;
  vec2 b = segment.zw;
  vec2 d = b - a;
  float len = length(d);
  vec2 t = len > 0.0 ? d / len : vec2(1.0, 0.0);
  vec2 n = vec2(-t.y, t.x);
  float e = widthMask.x + pixel;
  int k = gl_VertexID;
  vec2 corner = vec2(k == 1 || k == 2 || k == 4 ? 1.0 : -1.0, k == 2 || k == 4 || k == 5 ? 1.0 : -1.0);
  position = (corner.x < 0.0 ? a : b) + t * corner.x * e + n * corner.y * e;
  ends = segment;
  lineMask = widthMask;
  gl_Position = vec4(position.x * scale, -position.y * scale, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 position;
flat in vec4 ends;
flat in vec3 lineMask;
uniform float pixel;
uniform vec3 ink;
uniform vec3 paper;
out vec4 color;
void main() {
  vec2 a = ends.xy;
  vec2 ab = ends.zw - a;
  float len2 = dot(ab, ab);
  float h = len2 > 0.0 ? clamp(dot(position - a, ab) / len2, 0.0, 1.0) : 0.0;
  float d = length(position - a - ab * h);
  float r = length(position);
  float cover = clamp((lineMask.x - d) / pixel + 0.5, 0.0, 1.0)
    * clamp((r - lineMask.y) / pixel + 0.5, 0.0, 1.0)
    * clamp((lineMask.z - r) / pixel + 0.5, 0.0, 1.0);
  if (cover <= 0.0) discard;
  color = vec4(mix(paper, ink, cover), 1.0);
}`;

interface Uploaded {
  buffer: WebGLBuffer;
  vao: WebGLVertexArrayObject;
  count: number;
}

export class Renderer {
  private gl: WebGL2RenderingContext;
  private scale!: WebGLUniformLocation;
  private pixel!: WebGLUniformLocation;
  /** Uploaded layers from the previous drawing, so unchanged layers are not rebuilt. */
  private cache = new Map<string, Uploaded>();

  /**
   * When the browser resets the graphics context (for example after a graphics driver reset), the
   * renderer sets up its program again and calls onRestore, which redraws the mandala.
   */
  constructor(canvas: HTMLCanvasElement, preserve = false, onRestore?: () => void) {
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, preserveDrawingBuffer: preserve });
    if (!gl) throw new Error("WebGL 2 is not available");
    this.gl = gl;
    this.setUp();
    // Without preventDefault the browser never restores the context.
    canvas.addEventListener("webglcontextlost", (event) => event.preventDefault());
    canvas.addEventListener("webglcontextrestored", () => {
      // The uploaded layers were in the lost context.
      this.cache = new Map();
      this.setUp();
      onRestore?.();
    });
  }

  private setUp() {
    const gl = this.gl;
    const program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "Shader error");
      gl.attachShader(program, shader);
    }
    gl.bindAttribLocation(program, 0, "segment");
    gl.bindAttribLocation(program, 1, "widthMask");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "Link error");
    gl.useProgram(program);
    this.scale = gl.getUniformLocation(program, "scale")!;
    this.pixel = gl.getUniformLocation(program, "pixel")!;
    gl.uniform3f(gl.getUniformLocation(program, "ink"), INK[0] / 255, INK[1] / 255, INK[2] / 255);
    gl.uniform3f(gl.getUniformLocation(program, "paper"), PAPER[0] / 255, PAPER[1] / 255, PAPER[2] / 255);
    // Each pixel keeps the darkest value drawn on it, so overlapping segments do not darken their edges.
    // This requires an ink color darker than the paper color in every channel.
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.MIN);
  }

  private upload(data: number[]): Uploaded {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, FLOATS * 4, 0);
    gl.vertexAttribDivisor(0, 1);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, FLOATS * 4, 16);
    gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);
    return { buffer, vao, count: data.length / FLOATS };
  }

  /** Draws the layers on a white square. size is the drawing's width in drawing units, centered on (0, 0). */
  draw(layers: Layer[], size: number, pixels: number) {
    const gl = this.gl;
    const tolerance = (TOLERANCE * size) / pixels;
    const next = new Map<string, Uploaded>();
    for (const layer of layers) {
      // The segments depend on the pixel size, so a resized canvas builds them again.
      const key = `${layer.key} ${pixels}`;
      if (next.has(key)) continue;
      next.set(key, this.cache.get(key) ?? this.upload(layerSegments(layer, tolerance)));
    }
    for (const [key, old] of this.cache) {
      if (next.has(key)) continue;
      gl.deleteBuffer(old.buffer);
      gl.deleteVertexArray(old.vao);
    }
    this.cache = next;

    gl.viewport(0, 0, pixels, pixels);
    gl.clearColor(PAPER[0] / 255, PAPER[1] / 255, PAPER[2] / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(this.scale, 2 / size);
    gl.uniform1f(this.pixel, size / pixels);
    for (const { vao, count } of next.values()) {
      if (count === 0) continue;
      gl.bindVertexArray(vao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
    }
    gl.bindVertexArray(null);
  }

  /** Frees the GPU memory. */
  destroy() {
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
