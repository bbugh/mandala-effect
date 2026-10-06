import { describe, expect, it } from "vitest";
import {
  chladniModes,
  expressionNumber,
  letterValue,
  lifePath,
  personalityNumber,
  reduce,
  ringsFromBirthday,
  soulUrgeNumber,
  symmetryFromLifePath,
} from "./numerology";

describe("letterValue", () => {
  it("cycles 1 to 9 through the alphabet", () => {
    expect(letterValue("A")).toBe(1);
    expect(letterValue("I")).toBe(9);
    expect(letterValue("J")).toBe(1);
    expect(letterValue("R")).toBe(9);
    expect(letterValue("S")).toBe(1);
    expect(letterValue("Z")).toBe(8);
    expect(letterValue("z")).toBe(8);
  });
});

describe("reduce", () => {
  it("keeps master numbers", () => {
    expect(reduce(29)).toBe(11);
    expect(reduce(22)).toBe(22);
    expect(reduce(33)).toBe(33);
  });

  it("reduces master numbers when asked", () => {
    expect(reduce(22, false)).toBe(4);
  });

  it("reduces to one digit", () => {
    expect(reduce(1987)).toBe(7);
  });
});

describe("lifePath", () => {
  it("reduces month, day, and year separately", () => {
    // 1987-12-25: 12 → 3, 25 → 7, 1987 → 25 → 7; 3 + 7 + 7 = 17 → 8
    expect(lifePath({ year: 1987, month: 12, day: 25 })).toBe(8);
  });

  it("can produce a master number", () => {
    // 1990-11-09: 11, 9, 1990 → 19 → 10 → 1; 11 + 9 + 1 = 21 → 3
    expect(lifePath({ year: 1990, month: 11, day: 9 })).toBe(3);
    // 1975-05-04: 5, 4, 1975 → 22; 5 + 4 + 22 = 31 → 4
    expect(lifePath({ year: 1975, month: 5, day: 4 })).toBe(4);
    // 2000-02-07: 2, 7, 2; 2 + 7 + 2 = 11
    expect(lifePath({ year: 2000, month: 2, day: 7 })).toBe(11);
  });
});

describe("name numbers", () => {
  // ADA LOVELACE: vowels A A O E A E = 1+1+6+5+1+5 = 19 → 1
  // consonants D L V L C = 4+3+4+3+3 = 17 → 8
  it("splits vowels and consonants", () => {
    expect(soulUrgeNumber("Ada Lovelace")).toBe(1);
    expect(personalityNumber("Ada Lovelace")).toBe(8);
    expect(expressionNumber("Ada Lovelace")).toBe(9);
  });

  it("ignores spaces, punctuation, and accents", () => {
    expect(expressionNumber("Zoë O'Brien")).toBe(expressionNumber("Zoe OBrien"));
  });
});

describe("parameter mapping", () => {
  it("maps life path to symmetry", () => {
    expect(symmetryFromLifePath(1)).toBe(6);
    expect(symmetryFromLifePath(4)).toBe(8);
    expect(symmetryFromLifePath(11)).toBe(22);
    expect(symmetryFromLifePath(33)).toBe(24);
  });

  it("maps birthday to 3 to 7 rings", () => {
    expect(ringsFromBirthday(1)).toBe(3);
    expect(ringsFromBirthday(5)).toBe(7);
    expect(ringsFromBirthday(6)).toBe(3);
    expect(ringsFromBirthday(22)).toBe(4);
  });

  it("never returns equal chladni modes", () => {
    expect(chladniModes(3, 3)).toEqual([3, 4]);
    expect(chladniModes(11, 2)).toEqual([2, 3]);
  });
});
