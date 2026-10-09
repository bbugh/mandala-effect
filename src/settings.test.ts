import { describe, expect, test } from "vitest";
import { DEFAULT_RING_OPTIONS } from "./geometry/motifs";
import { autoRings, type MandalaParams } from "./render";
import { settingsFromText, settingsToLink } from "./settings";

const params: MandalaParams = {
  rotations: 12,
  spacing: "golden",
  center: "flowerOfLife",
  chladniN: 3,
  chladniM: 5,
  seed: 108,
  lineWeight: 1.5,
  borderThickness: 1,
  rings: autoRings(108, 5, "golden"),
  bindu: true,
  borderSpacing: 1,
  smooth: true,
  minDetail: false,
};

describe("settings links", () => {
  test("text that is not settings is rejected", () => {
    expect(settingsFromText("hello", params)).toBeNull();
  });

  test("a link restores every setting", () => {
    const changed: MandalaParams = { ...params, rotations: 9, center: "sriYantra", rings: [{ motif: "flowerBand", count: 37, ...DEFAULT_RING_OPTIONS }], minDetail: false };
    const link = settingsToLink(changed, "http://brianbugh.me/mandala-effect/#old");
    expect(link).toMatch(/^http:\/\/brianbugh\.me\/mandala-effect\/#7[A-Za-z0-9_-]+$/);
    expect(settingsFromText(link, params)).toEqual(changed);
  });

  test("a short code restores every setting at the ends of each range", () => {
    const changed: MandalaParams = {
      ...params,
      rotations: 24,
      spacing: "even",
      center: "cymatics",
      chladniN: 12,
      chladniM: 1,
      seed: 99999,
      lineWeight: 4,
      borderThickness: 2,
      rings: Array.from({ length: 8 }, (_, i) => ({
        motif: i % 2 ? "cymatics" : "lotus",
        count: i % 2 ? 200 : 1,
        petalTip: i % 2 ? "round" : "pointed",
        innerOutline: i % 2 ? 0 : 1,
        dots: i % 2 ? 2 : 0,
        waveDepth: i % 2 ? 0.5 : 0.1,
        cymaticsN: i % 2 ? 12 : 1,
        cymaticsM: i % 2 ? 1 : 12,
      })),
      bindu: false,
      borderSpacing: 2,
      minDetail: true,
    };
    const link = settingsToLink(changed, "http://brianbugh.me/mandala-effect/");
    expect(link.length).toBeLessThan(90);
    expect(settingsFromText(link, params)).toEqual(changed);
  });

  test("a version 1 link opens with its detail setting as inner outline and dots, and symmetry × multiplier copies", () => {
    const link = (code: string) => `http://brianbugh.me/mandala-effect/#${code}`;
    // Symmetry 12 and the multipliers 3, 4, 2, 3, 4.
    // Every ring gets the link's tips (pointed), wave depth (0.36), inner outline, and dots. An inner outline that is on
    // gets 1 − 0.4 × the border thickness (1), and dots that are on get the standard size.
    const opened = (innerOutline: number, dots: number) => ({
      ...params,
      rotations: 12,
      rings: [
        { motif: "scallops", count: 36 },
        { motif: "dots", count: 48 },
        { motif: "scallops", count: 24 },
        { motif: "lattice", count: 36 },
        { motif: "lotus", count: 48 },
      ].map((ring) => ({ ...ring, petalTip: "pointed", waveDepth: 0.36, innerOutline, dots, cymaticsN: 3, cymaticsM: 5 })),
    });
    expect(settingsFromText(link("1YBqAGxFBuhKmRZAw"), params)).toEqual(opened(0, 0));
    expect(settingsFromText(link("1YBqAGxFFuhKmRZAw"), params)).toEqual(opened(0.6, 0));
    expect(settingsFromText(link("1YBqAGxFJuhKmRZAw"), params)).toEqual(opened(0.6, 1));
  });

  test("a version 3 link opens with its shared tips, inner outline, dots, wave depth, and the center's cymatics modes in every ring", () => {
    const shared = { petalTip: "round", innerOutline: 0, dots: 1, waveDepth: 0.2, cymaticsN: 7, cymaticsM: 2 } as const;
    // Version 3 layout: the same fields as version 4, with the shared ring options after the border thickness, and 8 bits per ring count.
    const bits: number[] = [];
    const write = (value: number, count: number) => {
      for (let i = count - 1; i >= 0; i--) bits.push((value >> i) & 1);
    };
    write(12, 5); write(0, 1); write(0, 3); write(7, 4); write(2, 4); write(108, 17); write(4, 4); write(10, 5);
    write(1, 1); write(0, 1); write(1, 1); write(5, 5);
    write(1, 1); write(1, 1); write(0, 1);
    write(1, 3); write(0, 3); write(39, 8); write(3, 3); write(15, 8);
    while (bits.length % 6) bits.push(0);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let code = "3";
    for (let i = 0; i < bits.length; i += 6) code += chars[parseInt(bits.slice(i, i + 6).join(""), 2)];
    expect(settingsFromText(code, params)?.rings).toEqual([
      { motif: "lotus", count: 40, ...shared },
      { motif: "lattice", count: 16, ...shared },
    ]);
  });

  test("a version 5 link opens with each ring's inner outline and dots converted to slider positions", () => {
    const bits: number[] = [];
    const write = (value: number, count: number) => {
      for (let i = count - 1; i >= 0; i--) bits.push((value >> i) & 1);
    };
    // Rotations, spacing, center, n, m, seed, line weight, and border thickness 1.5, then bindu, double borders, and print details.
    write(12, 5); write(0, 1); write(0, 3); write(3, 4); write(5, 4); write(108, 17); write(4, 4); write(15, 5);
    write(1, 1); write(1, 1); write(0, 1);
    // 2 lotus rings with 24 copies: the 1st with an inner outline and no dots, the 2nd with dots and no inner outline.
    write(1, 3);
    write(0, 3); write(23, 8); write(0, 1); write(1, 1); write(0, 1); write(5, 5); write(3, 4); write(5, 4);
    write(0, 3); write(23, 8); write(0, 1); write(0, 1); write(1, 1); write(5, 5); write(3, 4); write(5, 4);
    while (bits.length % 6) bits.push(0);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let code = "5";
    for (let i = 0; i < bits.length; i += 6) code += chars[parseInt(bits.slice(i, i + 6).join(""), 2)];
    // An inner outline that is on gets 1 − 0.4 × 1.5 = 0.4, and dots that are on get the standard size.
    const rings = settingsFromText(code, params)?.rings;
    expect(rings?.map(({ innerOutline, dots }) => [innerOutline, dots])).toEqual([
      [0.4, 0],
      [0, 1],
    ]);
  });

  test("a code with an unknown version is rejected", () => {
    expect(settingsFromText("http://brianbugh.me/mandala-effect/#9AAAA", params)).toBeNull();
  });
});
