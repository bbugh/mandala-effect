import { describe, expect, test } from "vitest";
import { autoRings, type MandalaParams } from "./render";
import { settingsFromText, settingsToLink, settingsToText } from "./settings";

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
  innerOutline: true,
  dots: false,
  waveDepth: 0.36,
  bindu: true,
  borderSpacing: true,
  smooth: true,
  minDetail: false,
};

describe("settings text", () => {
  test("copying and pasting restores every setting", () => {
    const changed: MandalaParams = { ...params, symmetry: 9, spacing: "even", center: "seedOfLife", innerOutline: false, dots: true };
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

  test("a link restores every setting", () => {
    const changed: MandalaParams = { ...params, symmetry: 9, center: "sriYantra", rings: [{ motif: "flowerBand", repeat: 4 }], minDetail: false };
    const link = settingsToLink(changed, "http://brianbugh.me/mandala-effect/#old");
    expect(link).toMatch(/^http:\/\/brianbugh\.me\/mandala-effect\/#2[A-Za-z0-9_-]+$/);
    expect(settingsFromText(link, params)).toEqual(changed);
  });

  test("a short code restores every setting at the ends of each range", () => {
    const changed: MandalaParams = {
      ...params,
      symmetry: 24,
      spacing: "even",
      center: "cymatics",
      chladniN: 12,
      chladniM: 1,
      seed: 99999,
      lineWeight: 4,
      lineContrast: 2,
      rings: Array.from({ length: 8 }, (_, i) => ({ motif: i % 2 ? "cymatics" : "lotus", repeat: i % 2 ? 12 : 1 })),
      petalTip: "round",
      innerOutline: false,
      dots: true,
      waveDepth: 0.5,
      bindu: false,
      borderSpacing: false,
      minDetail: true,
    };
    const link = settingsToLink(changed, "http://brianbugh.me/mandala-effect/");
    expect(link.length).toBeLessThan(70);
    expect(settingsFromText(link, params)).toEqual(changed);
  });

  test("a version 1 link opens with its detail setting as inner outline and dots", () => {
    const link = (code: string) => `http://brianbugh.me/mandala-effect/#${code}`;
    expect(settingsFromText(link("1YBqAGxFBuhKmRZAw"), params)).toEqual({ ...params, innerOutline: false, dots: false });
    expect(settingsFromText(link("1YBqAGxFFuhKmRZAw"), params)).toEqual({ ...params, innerOutline: true, dots: false });
    expect(settingsFromText(link("1YBqAGxFJuhKmRZAw"), params)).toEqual({ ...params, innerOutline: true, dots: true });
  });

  test("settings text from before version 2 opens with its detail setting as inner outline and dots", () => {
    expect(settingsFromText('{"detail": 0}', params)).toMatchObject({ innerOutline: false, dots: false });
    expect(settingsFromText('{"detail": 1}', { ...params, innerOutline: false })).toMatchObject({ innerOutline: true, dots: false });
    expect(settingsFromText('{"detail": 2}', params)).toMatchObject({ innerOutline: true, dots: true });
  });

  test("a code with an unknown version is rejected", () => {
    expect(settingsFromText("http://brianbugh.me/mandala-effect/#9AAAA", params)).toBeNull();
  });
});
