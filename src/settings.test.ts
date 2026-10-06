import { describe, expect, test } from "vitest";
import { autoRings, type MandalaParams } from "./render";
import { settingsFromText, settingsToText } from "./settings";

const params: MandalaParams = {
  symmetry: 12,
  spacing: "golden",
  center: "flowerOfLife",
  chladniN: 3,
  chladniM: 5,
  seed: 108,
  lineWeight: 1.5,
  lineContrast: 1,
  rings: autoRings(108, 5, 12, "golden"),
  petalTip: "pointed",
  detail: 1,
  waveDepth: 0.36,
  bindu: true,
  borderSpacing: true,
  smooth: true,
  minDetail: false,
};

describe("settings text", () => {
  test("copying and pasting restores every setting", () => {
    const changed: MandalaParams = { ...params, symmetry: 9, spacing: "even", center: "seedOfLife", detail: 2 };
    expect(settingsFromText(settingsToText(changed), params)).toEqual(changed);
  });

  test("text that is not settings is rejected", () => {
    expect(settingsFromText("hello", params)).toBeNull();
    expect(settingsFromText("[1, 2]", params)).toBeNull();
    expect(settingsFromText('{"color": "red"}', params)).toBeNull();
  });

  test("invalid fields keep their current values", () => {
    const result = settingsFromText('{"symmetry": 8, "center": "square", "rings": [{"motif": "lotus", "repeat": 99}]}', params);
    expect(result?.symmetry).toBe(8);
    expect(result?.center).toBe("flowerOfLife");
    expect(result?.rings).toEqual(params.rings);
  });
});
