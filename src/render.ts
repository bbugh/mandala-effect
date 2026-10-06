import { type CenterName, drawCenter } from "./geometry/centers";
import { DEFAULT_MOTIFS, type Detail, legibleRepeats, MOTIFS, type MotifName, type PetalTip } from "./geometry/motifs";
import { ringRadii, type Spacing } from "./geometry/rings";
import { circle } from "./geometry/svg";
import { createRng, pick } from "./rng";

export interface RingSpec {
  motif: MotifName;
  /** The motif repeats symmetry × repeat times around the ring. */
  repeat: number;
}

export interface MandalaParams {
  symmetry: number;
  spacing: Spacing;
  center: CenterName;
  chladniN: number;
  chladniM: number;
  seed: number;
  lineWeight: number;
  rings: RingSpec[];
  petalTip: PetalTip;
  detail: Detail;
  waveDepth: number;
  /** Sri Yantra center point. */
  bindu: boolean;
  /** Thicker ring borders and thinner details. */
  weightHierarchy: boolean;
  /** Double-line ring borders with a space between each border and its pattern. */
  borderSpacing: boolean;
  /** Smooth cymatics lines into curves on a finer grid. */
  smooth: boolean;
  /** Leave out details smaller than MIN_DETAIL. */
  minDetail: boolean;
}

export const RADIUS = 500;
const MARGIN = 24;

/**
 * Chooses a motif and a legible repeat count for each ring from the variation seed.
 * A ring never repeats the motif of the ring directly inside it.
 */
export function autoRings(seed: number, count: number, symmetry: number, spacing: Spacing): RingSpec[] {
  const rng = createRng(seed);
  const radii = ringRadii(RADIUS, count, spacing);
  const rings: RingSpec[] = [];
  for (let i = 0; i < count; i++) {
    const motif = pick(rng, DEFAULT_MOTIFS.filter((name) => name !== rings[i - 1]?.motif));
    const options = legibleRepeats(motif, radii[i], radii[i + 1], symmetry);
    rings.push({ motif, repeat: pick(rng, options.slice(0, 3)) });
  }
  return rings;
}

export function renderMandala(params: MandalaParams): string {
  const radii = ringRadii(RADIUS, params.rings.length, params.spacing);
  const weight = params.lineWeight;
  const borderWeight = params.weightHierarchy ? weight * 1.8 : weight;
  const detailWeight = params.weightHierarchy ? weight * 0.6 : weight;
  // Distance between the 2 lines of a double border, and between a border and its pattern.
  const borderGap = params.borderSpacing ? borderWeight * 2 + 3 : 0;
  const patternGap = params.borderSpacing ? borderGap / 2 + 4 : 0;

  const main: string[] = [];
  const detail: string[] = [];
  const borders: string[] = [];

  const border = (r: number) => {
    if (params.borderSpacing) borders.push(circle(0, 0, r - borderGap / 2), circle(0, 0, r + borderGap / 2));
    else borders.push(circle(0, 0, r));
  };

  const center = drawCenter(radii[0] - patternGap, params);
  main.push(center.lines);
  border(radii[0]);

  params.rings.forEach((spec, i) => {
    const output = MOTIFS[spec.motif]({
      r1: radii[i] + patternGap,
      r2: radii[i + 1] - patternGap,
      count: params.symmetry * spec.repeat,
      offset: i % 2 === 1,
      clip: [radii[i] + borderGap / 2, radii[i + 1] - borderGap / 2],
      id: `ring-${i}`,
      style: params,
    });
    main.push(output.main);
    detail.push(output.detail);
    border(radii[i + 1]);
  });

  const size = RADIUS + MARGIN;
  const outerWeight = params.weightHierarchy ? weight * 2.4 : weight;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-size} ${-size} ${size * 2} ${size * 2}" width="${size * 2}" height="${size * 2}">`,
    `<rect x="${-size}" y="${-size}" width="${size * 2}" height="${size * 2}" fill="#fff"/>`,
    `<g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">`,
    `<g stroke-width="${detailWeight}">${detail.join("")}</g>`,
    `<g stroke-width="${weight}">${main.join("")}</g>`,
    `<g stroke-width="${borderWeight}">${borders.join("")}</g>`,
    `<g stroke-width="${outerWeight}">${circle(0, 0, RADIUS + 12)}</g>`,
    `</g>`,
    `<g fill="#000" stroke="none">${center.filled}</g>`,
    `</svg>`,
  ].join("");
}
