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
  /** 0: every line uses lineWeight. Higher values make borders thicker and details thinner. */
  lineContrast: number;
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
export function autoRings(
  seed: number,
  count: number,
  symmetry: number,
  spacing: Spacing,
  motifs: readonly MotifName[] = DEFAULT_MOTIFS,
): RingSpec[] {
  const rng = createRng(seed);
  const radii = ringRadii(RADIUS, count, spacing);
  const rings: RingSpec[] = [];
  for (let i = 0; i < count; i++) {
    const motif = pick(rng, motifs.filter((name) => name !== rings[i - 1]?.motif));
    const options = legibleRepeats(motif, radii[i], radii[i + 1], symmetry);
    rings.push({ motif, repeat: pick(rng, options.slice(0, 3)) });
  }
  return rings;
}

/** Changes each ring's repeat count to the closest one at which its motif is legible in that ring. */
export function fitRepeats(rings: RingSpec[], symmetry: number, spacing: Spacing): RingSpec[] {
  const radii = ringRadii(RADIUS, rings.length, spacing);
  return rings.map((ring, i) => {
    const options = legibleRepeats(ring.motif, radii[i], radii[i + 1], symmetry);
    if (options.includes(ring.repeat)) return ring;
    const repeat = options.reduce((best, k) => (Math.abs(k - ring.repeat) < Math.abs(best - ring.repeat) ? k : best));
    return { ...ring, repeat };
  });
}

export function renderMandala(params: MandalaParams): string {
  const radii = ringRadii(RADIUS, params.rings.length, params.spacing);
  const weight = params.lineWeight;
  const contrast = params.lineContrast;
  const borderWeight = weight * (1 + 0.8 * contrast);
  const detailWeight = weight * (1 - 0.4 * contrast);
  // Distance between the 2 lines of a double border, and between a border and its pattern.
  const borderGap = params.borderSpacing ? borderWeight * 2 + 3 : 0;
  // The pattern gap is measured between the edges of the strokes, so it stays the same at every line weight.
  const patternGap = params.borderSpacing ? borderGap / 2 + borderWeight / 2 + weight / 2 + 3 : 0;

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
  const outerWeight = weight * (1 + 1.4 * contrast);
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
