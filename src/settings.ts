// Settings as text, so a mandala can be copied to the clipboard and pasted back later.

import { CENTER_LABELS } from "./geometry/centers";
import { MAX_REPEAT, MOTIF_NAMES } from "./geometry/motifs";
import type { MandalaParams, RingSpec } from "./render";

export function settingsToText(params: MandalaParams): string {
  return JSON.stringify(params);
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
 * Reads settings text. Fields that are missing or invalid keep their current values.
 * Returns null when the text is not settings at all.
 */
export function settingsFromText(text: string, current: MandalaParams): MandalaParams | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
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
