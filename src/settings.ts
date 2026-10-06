// Settings as text, so a mandala can be copied to the clipboard and pasted back later.

import { CENTER_LABELS, type CenterName } from "./geometry/centers";
import { MAX_REPEAT, MOTIF_NAMES, type MotifName } from "./geometry/motifs";
import type { MandalaParams, RingSpec } from "./render";

export function settingsToText(params: MandalaParams): string {
  return JSON.stringify(params);
}

// Short link code: a version character followed by the settings packed into bits and written in
// URL-safe base64, for example "1hW3Uq0d7xQ5n2aLhA". A new layout gets a new version character,
// and codeToData keeps reading every earlier version.

const CODE_VERSION = "1";
const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Highest variation number a link can store. */
export const MAX_SEED = 99999;

const CENTERS: CenterName[] = ["flowerOfLife", "seedOfLife", "phyllotaxis", "sriYantra", "chladni", "cymatics"];
const MOTIFS: MotifName[] = ["lotus", "scallops", "flowerBand", "lattice", "roseBraid", "dots", "cymatics"];

/** Each field of version 1, in order: how to turn the value into a whole number, and how many bits it uses. */
interface Field {
  bits: number;
  get: (params: MandalaParams) => number;
  set: (data: Record<string, unknown>, value: number) => void;
}

const steps = (min: number, step: number) => ({
  toInt: (value: number) => Math.round((value - min) / step),
  fromInt: (value: number) => Number((min + value * step).toFixed(2)),
});
const weightSteps = steps(0.5, 0.25);
const contrastSteps = steps(0, 0.1);
const waveSteps = steps(0.1, 0.02);

const flag = (name: "bindu" | "borderSpacing" | "minDetail"): Field => ({
  bits: 1,
  get: (p) => (p[name] ? 1 : 0),
  set: (d, v) => (d[name] = v === 1),
});

const V1_FIELDS: Field[] = [
  { bits: 5, get: (p) => p.symmetry, set: (d, v) => (d.symmetry = v) },
  { bits: 1, get: (p) => (p.spacing === "even" ? 1 : 0), set: (d, v) => (d.spacing = v ? "even" : "golden") },
  { bits: 3, get: (p) => CENTERS.indexOf(p.center), set: (d, v) => (d.center = CENTERS[v]) },
  { bits: 4, get: (p) => p.chladniN, set: (d, v) => (d.chladniN = v) },
  { bits: 4, get: (p) => p.chladniM, set: (d, v) => (d.chladniM = v) },
  { bits: 17, get: (p) => Math.min(p.seed, MAX_SEED), set: (d, v) => (d.seed = v) },
  { bits: 4, get: (p) => weightSteps.toInt(p.lineWeight), set: (d, v) => (d.lineWeight = weightSteps.fromInt(v)) },
  { bits: 5, get: (p) => contrastSteps.toInt(p.lineContrast), set: (d, v) => (d.lineContrast = contrastSteps.fromInt(v)) },
  { bits: 1, get: (p) => (p.petalTip === "round" ? 1 : 0), set: (d, v) => (d.petalTip = v ? "round" : "pointed") },
  { bits: 2, get: (p) => p.detail, set: (d, v) => (d.detail = v) },
  { bits: 5, get: (p) => waveSteps.toInt(p.waveDepth), set: (d, v) => (d.waveDepth = waveSteps.fromInt(v)) },
  flag("bindu"),
  flag("borderSpacing"),
  flag("minDetail"),
];

export function settingsToCode(params: MandalaParams): string {
  const bits: number[] = [];
  const write = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };
  for (const field of V1_FIELDS) write(field.get(params), field.bits);
  // Rings: the count minus 1, then each ring's pattern and repeat minus 1.
  write(params.rings.length - 1, 3);
  for (const ring of params.rings) {
    write(MOTIFS.indexOf(ring.motif), 3);
    write(ring.repeat - 1, 4);
  }
  while (bits.length % 6 !== 0) bits.push(0);
  let code = CODE_VERSION;
  for (let i = 0; i < bits.length; i += 6) code += BASE64URL[parseInt(bits.slice(i, i + 6).join(""), 2)];
  return code;
}

/** A link to the page that opens with these settings. The short code follows "#". */
export function settingsToLink(params: MandalaParams, pageUrl: string): string {
  const url = new URL(pageUrl);
  url.hash = settingsToCode(params);
  return url.toString();
}

/** Reads a short code, or a link that ends with one, into a settings object for checking. */
function codeToData(text: string): Record<string, unknown> | null {
  const code = (text.includes("#") ? text.slice(text.lastIndexOf("#") + 1) : text).trim();
  if (code[0] !== CODE_VERSION || code.length < 2) return null;
  const bits: number[] = [];
  for (const char of code.slice(1)) {
    const value = BASE64URL.indexOf(char);
    if (value < 0) return null;
    for (let i = 5; i >= 0; i--) bits.push((value >> i) & 1);
  }
  let position = 0;
  const read = (count: number) => {
    let value = 0;
    for (let i = 0; i < count; i++) value = value * 2 + (bits[position++] ?? 0);
    return value;
  };
  const data: Record<string, unknown> = {};
  for (const field of V1_FIELDS) field.set(data, read(field.bits));
  const ringCount = read(3) + 1;
  if (position + ringCount * 7 > bits.length) return null;
  data.rings = Array.from({ length: ringCount }, () => ({ motif: MOTIFS[read(3)], repeat: read(4) + 1 }));
  return data;
}

const oneOf = (values: readonly unknown[]) => (value: unknown) => values.includes(value);
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value);
const boolean = (value: unknown) => typeof value === "boolean";

const CHECKS: { [K in keyof MandalaParams]: (value: unknown) => boolean } = {
  symmetry: number,
  spacing: oneOf(["golden", "even"]),
  center: oneOf(Object.keys(CENTER_LABELS)),
  chladniN: number,
  chladniM: number,
  seed: number,
  lineWeight: number,
  lineContrast: number,
  rings: (value) =>
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (ring: RingSpec) =>
        MOTIF_NAMES.includes(ring?.motif) && Number.isInteger(ring?.repeat) && ring.repeat >= 1 && ring.repeat <= MAX_REPEAT,
    ),
  petalTip: oneOf(["pointed", "round"]),
  detail: oneOf([0, 1, 2]),
  waveDepth: number,
  bindu: boolean,
  borderSpacing: boolean,
  smooth: boolean,
  minDetail: boolean,
};

/**
 * Reads a link or short code made by settingsToLink, or settings text from earlier copies. Fields that are missing or invalid keep their current values.
 * Returns null when the text is not settings at all.
 */
export function settingsFromText(text: string, current: MandalaParams): MandalaParams | null {
  let data: unknown = codeToData(text);
  if (!data) {
    try {
      data = JSON.parse(text);
    } catch {
      return null;
    }
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const input = data as Record<string, unknown>;
  const result = { ...current, rings: current.rings.map((ring) => ({ ...ring })) };
  let found = 0;
  for (const key of Object.keys(CHECKS) as (keyof MandalaParams)[]) {
    if (key in input && CHECKS[key](input[key])) {
      (result as Record<string, unknown>)[key] = structuredClone(input[key]);
      found++;
    }
  }
  return found > 0 ? result : null;
}
