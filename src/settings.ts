// Settings as a short code in the page link, so a link opens the same mandala.

import { CENTER_LABELS, type CenterName } from "./geometry/centers";
import { DEFAULT_RING_OPTIONS, DOT_STEPS, INNER_OUTLINE_STEPS, MAX_COUNT, MOTIF_NAMES, type MotifName, type RingOptions } from "./geometry/motifs";
import { BORDER_SPACING_STEPS, type MandalaParams, type RingSpec } from "./render";

// Short link code: a version character followed by the settings packed into bits and written in
// URL-safe base64, for example "4hW3Uq0d7xQ5n2aLhA". A new layout gets a new version character,
// and codeToData keeps reading every earlier version.

const CODE_VERSION = "7";
const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Highest variation number a link can store. */
export const MAX_SEED = 99999;

const CENTERS: CenterName[] = ["flowerOfLife", "seedOfLife", "phyllotaxis", "sriYantra", "chladni", "cymatics", "metatron"];
const MOTIFS: MotifName[] = ["lotus", "scallops", "flowerBand", "lattice", "roseBraid", "dots", "cymatics"];

/** Each field of a code version, in order: how to turn the value into a whole number, and how many bits it uses. */
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

/** A field that only earlier versions have: it is read, never written. */
const legacy = (bits: number, set: Field["set"]): Field => ({ bits, get: () => 0, set });
const legacyFlag = (name: "innerOutline" | "dots") => legacy(1, (d, v) => (d[name] = v === 1));

/**
 * Versions 1 and 2 start with the symmetry setting. It set the rotated cymatics center's rotations, and
 * each ring stored a multiplier: the ring had symmetry × multiplier copies.
 */
const SYMMETRY_FIELD = legacy(5, (d, v) => {
  d.symmetry = v;
  d.rotations = v;
});

/** Versions 3 and later start with the rotated cymatics center's rotations. */
const ROTATIONS_FIELD: Field = { bits: 5, get: (p) => p.rotations, set: (d, v) => (d.rotations = v) };

/** Fields shared by every version, after the first field. */
const SHARED_FIELDS: Field[] = [
  { bits: 1, get: (p) => (p.spacing === "even" ? 1 : 0), set: (d, v) => (d.spacing = v ? "even" : "golden") },
  { bits: 3, get: (p) => CENTERS.indexOf(p.center), set: (d, v) => (d.center = CENTERS[v]) },
  { bits: 4, get: (p) => p.chladniN, set: (d, v) => (d.chladniN = v) },
  { bits: 4, get: (p) => p.chladniM, set: (d, v) => (d.chladniM = v) },
  { bits: 17, get: (p) => Math.min(p.seed, MAX_SEED), set: (d, v) => (d.seed = v) },
  { bits: 4, get: (p) => weightSteps.toInt(p.lineWeight), set: (d, v) => (d.lineWeight = weightSteps.fromInt(v)) },
  { bits: 5, get: (p) => contrastSteps.toInt(p.borderThickness), set: (d, v) => (d.borderThickness = contrastSteps.fromInt(v)) },
];

/** Versions 1 to 6 store double borders as on or off; settingsFromText converts it to a border spacing. */
const FINAL_FIELDS: Field[] = [flag("bindu"), flag("borderSpacing"), flag("minDetail")];

/** Version 7 stores the position of the border spacing slider. */
const BORDER_SPACING_FIELD: Field = {
  bits: 5,
  get: (p) => Math.max(0, BORDER_SPACING_STEPS.indexOf(p.borderSpacing)),
  set: (d, v) => (d.borderSpacing = BORDER_SPACING_STEPS[v]),
};

/** Versions 1 to 3 stored the tips, inner outline, dots, and wave depth once for every ring. */
const LEGACY_TIP = legacy(1, (d, v) => (d.petalTip = v ? "round" : "pointed"));
const LEGACY_WAVE = legacy(5, (d, v) => (d.waveDepth = waveSteps.fromInt(v)));

/** Version 1 stored 1 detail setting: 0 outline only, 1 inner outline, 2 inner outline and dots. */
const LEGACY_DETAIL = legacy(2, (d, v) => {
  d.innerOutline = v >= 1;
  d.dots = v === 2;
});

const FIELDS: Record<string, Field[]> = {
  "1": [SYMMETRY_FIELD, ...SHARED_FIELDS, LEGACY_TIP, LEGACY_DETAIL, LEGACY_WAVE, ...FINAL_FIELDS],
  // Version 2 stores inner outline and dots as separate settings.
  "2": [SYMMETRY_FIELD, ...SHARED_FIELDS, LEGACY_TIP, legacyFlag("innerOutline"), legacyFlag("dots"), LEGACY_WAVE, ...FINAL_FIELDS],
  // Version 3 stores the rotations instead of the symmetry, and each ring's copy count directly.
  "3": [ROTATIONS_FIELD, ...SHARED_FIELDS, LEGACY_TIP, legacyFlag("innerOutline"), legacyFlag("dots"), LEGACY_WAVE, ...FINAL_FIELDS],
  // Version 4 stores the tips, inner outline, dots, and wave depth for each ring.
  "4": [ROTATIONS_FIELD, ...SHARED_FIELDS, ...FINAL_FIELDS],
  // Version 5 also stores the cymatics modes for each ring.
  "5": [ROTATIONS_FIELD, ...SHARED_FIELDS, ...FINAL_FIELDS],
  // Version 6 stores each ring's inner outline thickness and dot size instead of on or off.
  "6": [ROTATIONS_FIELD, ...SHARED_FIELDS, ...FINAL_FIELDS],
  // Version 7 stores the border spacing instead of double borders on or off.
  "7": [ROTATIONS_FIELD, ...SHARED_FIELDS, flag("bindu"), BORDER_SPACING_FIELD, flag("minDetail")],
};

/** Each ring field of a code version, after the ring's pattern. */
interface RingField {
  bits: number;
  get: (ring: RingSpec) => number;
  set: (ring: Record<string, unknown>, value: number) => void;
}

/** Versions 1 and 2 stored a multiplier for each ring; ringsFromMultipliers turns it into a copy count. */
const MULTIPLIER: RingField = { bits: 4, get: () => 0, set: (r, v) => (r.repeat = v + 1) };
const COUNT: RingField = { bits: 8, get: (r) => r.count - 1, set: (r, v) => (r.count = v + 1) };

const TIP_FIELD: RingField = { bits: 1, get: (r) => (r.petalTip === "round" ? 1 : 0), set: (r, v) => (r.petalTip = v ? "round" : "pointed") };
const WAVE_FIELD: RingField = { bits: 5, get: (r) => waveSteps.toInt(r.waveDepth), set: (r, v) => (r.waveDepth = waveSteps.fromInt(v)) };

/** Versions 4 and 5 store each ring's inner outline and dots as on or off; detailFlagsToSizes converts them. */
const RING_OPTION_FIELDS: RingField[] = [
  COUNT,
  TIP_FIELD,
  { bits: 1, get: (r) => (r.innerOutline ? 1 : 0), set: (r, v) => (r.innerOutline = v === 1) },
  { bits: 1, get: (r) => (r.dots ? 1 : 0), set: (r, v) => (r.dots = v === 1) },
  WAVE_FIELD,
];

/** A ring field that stores the position of a slider with these steps. */
const stepField = (name: "innerOutline" | "dots", values: readonly number[], bits: number): RingField => ({
  bits,
  get: (r) => Math.max(0, values.indexOf(r[name])),
  set: (r, v) => (r[name] = values[v]),
});

/** The cymatics modes of each ring, stored from version 5. */
const MODE_FIELDS: RingField[] = [
  { bits: 4, get: (r) => r.cymaticsN, set: (r, v) => (r.cymaticsN = v) },
  { bits: 4, get: (r) => r.cymaticsM, set: (r, v) => (r.cymaticsM = v) },
];

const RING_FIELDS: Record<string, RingField[]> = {
  "1": [MULTIPLIER],
  "2": [MULTIPLIER],
  "3": [COUNT],
  "4": RING_OPTION_FIELDS,
  "5": [...RING_OPTION_FIELDS, ...MODE_FIELDS],
  "6": [
    COUNT,
    TIP_FIELD,
    stepField("innerOutline", INNER_OUTLINE_STEPS, 4),
    stepField("dots", DOT_STEPS, 3),
    WAVE_FIELD,
    ...MODE_FIELDS,
  ],
};
RING_FIELDS["7"] = RING_FIELDS["6"];

/** Converts rings stored with a multiplier (versions 1 and 2, and older settings text) into copy counts. */
function ringsFromMultipliers(rings: Record<string, unknown>[], symmetry: number): Record<string, unknown>[] {
  return rings.map(({ repeat, ...ring }) => ({
    ...ring,
    count: typeof repeat === "number" ? Math.min(MAX_COUNT, symmetry * repeat) : repeat,
  }));
}

const RING_OPTION_NAMES = Object.keys(DEFAULT_RING_OPTIONS) as (keyof RingOptions)[];

/** Ring options whose value in earlier settings has a different name. */
const EARLIER_NAMES: Partial<Record<keyof RingOptions, string>> = { cymaticsN: "chladniN", cymaticsM: "chladniM" };

/**
 * Settings from before version 4 have 1 value each for tips, inner outline, dots, and wave depth, and
 * settings from before version 5 have the center's cymatics modes, which cymatics rings also used.
 * Each ring that has no value of its own gets that value, or the default.
 */
function fillRingOptions(input: Record<string, unknown>) {
  if (!Array.isArray(input.rings)) return;
  input.rings = input.rings.map((ring) => {
    if (typeof ring !== "object" || ring === null) return ring;
    const filled: Record<string, unknown> = { ...ring };
    for (const name of RING_OPTION_NAMES) {
      const shared = input[EARLIER_NAMES[name] ?? name];
      if (!(name in filled)) filled[name] = OPTION_CHECKS[name](shared) ? shared : DEFAULT_RING_OPTIONS[name];
    }
    return filled;
  });
}

export function settingsToCode(params: MandalaParams): string {
  const bits: number[] = [];
  const write = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };
  for (const field of FIELDS[CODE_VERSION]) write(field.get(params), field.bits);
  // Rings: the number of rings minus 1, then each ring's pattern and ring fields.
  write(params.rings.length - 1, 3);
  for (const ring of params.rings) {
    write(MOTIFS.indexOf(ring.motif), 3);
    for (const field of RING_FIELDS[CODE_VERSION]) write(field.get(ring), field.bits);
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
  const fields = FIELDS[code[0]];
  const ringFields = RING_FIELDS[code[0]];
  if (!fields || code.length < 2) return null;
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
  for (const field of fields) field.set(data, read(field.bits));
  const ringCount = read(3) + 1;
  const ringBits = 3 + ringFields.reduce((sum, field) => sum + field.bits, 0);
  if (position + ringCount * ringBits > bits.length) return null;
  data.rings = Array.from({ length: ringCount }, () => {
    const ring: Record<string, unknown> = { motif: MOTIFS[read(3)] };
    for (const field of ringFields) field.set(ring, read(field.bits));
    return ring;
  });
  return data;
}

const oneOf = (values: readonly unknown[]) => (value: unknown) => values.includes(value);
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value);
const boolean = (value: unknown) => typeof value === "boolean";

const OPTION_CHECKS: { [K in keyof RingOptions]: (value: unknown) => boolean } = {
  petalTip: oneOf(["pointed", "round"]),
  innerOutline: (value) => INNER_OUTLINE_STEPS.includes(value as never),
  dots: (value) => DOT_STEPS.includes(value as never),
  waveDepth: number,
  cymaticsN: (value) => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 12,
  cymaticsM: (value) => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 12,
};

const CHECKS: { [K in keyof MandalaParams]: (value: unknown) => boolean } = {
  rotations: number,
  spacing: oneOf(["golden", "even"]),
  center: oneOf(Object.keys(CENTER_LABELS)),
  chladniN: number,
  chladniM: number,
  seed: number,
  lineWeight: number,
  borderThickness: number,
  rings: (value) =>
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (ring: RingSpec) =>
        MOTIF_NAMES.includes(ring?.motif) &&
        Number.isInteger(ring?.count) &&
        ring.count >= 1 &&
        ring.count <= MAX_COUNT &&
        RING_OPTION_NAMES.every((name) => OPTION_CHECKS[name](ring[name])),
    ),
  bindu: boolean,
  borderSpacing: (value) => BORDER_SPACING_STEPS.includes(value as number),
  smooth: boolean,
  minDetail: boolean,
};

/**
 * Reads a link or short code made by settingsToLink. Fields that are missing or invalid keep their current values.
 * Returns null when the text is not settings at all.
 */
/**
 * Links from before version 6 store inner outlines and dots as on or off, for every ring or for each ring.
 * An inner outline that is on gets the thickness that the border thickness gave it, 1 − 0.4 × border
 * thickness, at the nearest slider position. Dots that are on get the standard size.
 */
function detailFlagsToSizes(input: Record<string, unknown>) {
  const border = typeof input.borderThickness === "number" ? input.borderThickness : 1;
  const thickness = INNER_OUTLINE_STEPS.slice(1).reduce((best, step) => (Math.abs(step - (1 - 0.4 * border)) < Math.abs(best - (1 - 0.4 * border)) ? step : best));
  const convert = (options: Record<string, unknown>) => {
    if (typeof options.innerOutline === "boolean") options.innerOutline = options.innerOutline ? thickness : 0;
    if (typeof options.dots === "boolean") options.dots = options.dots ? 1 : 0;
  };
  convert(input);
  if (Array.isArray(input.rings)) for (const ring of input.rings) if (typeof ring === "object" && ring !== null) convert(ring);
}

export function settingsFromText(text: string, current: MandalaParams): MandalaParams | null {
  const input = codeToData(text);
  if (!input) return null;
  // Links from before version 2 have 1 detail setting: 0 outline only, 1 inner outline, 2 inner outline and dots.
  if ([0, 1, 2].includes(input.detail as number) && !("innerOutline" in input) && !("dots" in input)) {
    input.innerOutline = (input.detail as number) >= 1;
    input.dots = input.detail === 2;
  }
  // Links from before version 3 have a symmetry setting and a multiplier for each ring.
  if (typeof input.symmetry === "number" && Array.isArray(input.rings) && input.rings.every((ring) => ring && "repeat" in ring)) {
    if (!("rotations" in input)) input.rotations = input.symmetry;
    input.rings = ringsFromMultipliers(input.rings, input.symmetry);
  }
  detailFlagsToSizes(input);
  // Links from before version 7 store double borders as on or off. On is the standard spacing.
  if (typeof input.borderSpacing === "boolean") input.borderSpacing = input.borderSpacing ? 1 : 0;
  fillRingOptions(input);
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
