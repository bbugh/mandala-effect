// Writes the mandala's layers as an SVG file. Each stroke becomes a <path>, and masked strokes use a
// clip path shaped like their ring.

import type { Pen } from "./geometry/pen";
import { INK, type Layer, PAPER } from "./render";

function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

/** A Pen that writes SVG path data. */
class PathData implements Pen {
  text = "";

  moveTo(x: number, y: number) {
    this.text += `M${fmt(x)} ${fmt(y)}`;
  }

  lineTo(x: number, y: number) {
    this.text += `L${fmt(x)} ${fmt(y)}`;
  }

  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) {
    this.text += `C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(x)} ${fmt(y)}`;
  }

  closePath() {
    this.text += "Z";
  }

  /** 2 half-circle arcs, because 1 SVG arc cannot end where it starts. */
  circle(cx: number, cy: number, r: number) {
    const a = `A${fmt(r)} ${fmt(r)} 0 1 1 `;
    this.text += `M${fmt(cx + r)} ${fmt(cy)}${a}${fmt(cx - r)} ${fmt(cy)}${a}${fmt(cx + r)} ${fmt(cy)}Z`;
  }
}

/** The SVG file for the layers. size is the drawing's width in drawing units, centered on (0, 0). */
export function mandalaSvg(layers: Layer[], size: number): string {
  const half = size / 2;
  const clips = new Map<string, string>();
  const defs: string[] = [];
  const clipId = ([r1, r2]: [number, number]) => {
    const key = `${fmt(r1)} ${fmt(r2)}`;
    let id = clips.get(key);
    if (!id) {
      id = `ring-${clips.size}`;
      clips.set(key, id);
      const ring = new PathData();
      ring.circle(0, 0, r2);
      if (r1 > 0) ring.circle(0, 0, r1);
      defs.push(`<clipPath id="${id}"><path clip-rule="evenodd" d="${ring.text}"/></clipPath>`);
    }
    return id;
  };

  const ink = `rgb(${INK.join(",")})`;
  const body: string[] = [];
  for (const layer of layers) {
    for (const stroke of layer.strokes) {
      if (stroke.kind === "disks") {
        for (const { cx, cy, r } of stroke.disks) body.push(`<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="${ink}" stroke="none"/>`);
        continue;
      }
      const data = new PathData();
      stroke.path.replay(data);
      const clip = stroke.mask ? ` clip-path="url(#${clipId(stroke.mask)})"` : "";
      body.push(`<path d="${data.text}" stroke-width="${fmt(stroke.width)}"${clip}/>`);
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-half} ${-half} ${size} ${size}" width="${size}" height="${size}">`,
    `<defs>${defs.join("")}</defs>`,
    `<rect x="${-half}" y="${-half}" width="${size}" height="${size}" fill="rgb(${PAPER.join(",")})"/>`,
    `<g fill="none" stroke="${ink}" stroke-linecap="round" stroke-linejoin="round">${body.join("")}</g>`,
    `</svg>`,
  ].join("");
}
