// Pythagorean numerology and the mapping from numerology numbers to drawing parameters.

const MASTER_NUMBERS = new Set([11, 22, 33]);
const VOWELS = new Set(["A", "E", "I", "O", "U"]);

export function letterValue(letter: string): number {
  const code = letter.toUpperCase().charCodeAt(0) - 65;
  if (code < 0 || code > 25) return 0;
  return (code % 9) + 1;
}

function digitSum(n: number): number {
  return String(n)
    .split("")
    .reduce((sum, d) => sum + Number(d), 0);
}

/** Add digits until a single digit remains, stopping at master numbers. */
export function reduce(n: number, keepMasters = true): number {
  while (n > 9 && !(keepMasters && MASTER_NUMBERS.has(n))) {
    n = digitSum(n);
  }
  return n;
}

function letters(name: string): string[] {
  return name
    .normalize("NFD")
    .toUpperCase()
    .split("")
    .filter((c) => c >= "A" && c <= "Z");
}

function sumLetters(name: string, include: (c: string) => boolean): number {
  return letters(name)
    .filter(include)
    .reduce((sum, c) => sum + letterValue(c), 0);
}

export interface BirthDate {
  year: number;
  month: number;
  day: number;
}

export function parseBirthDate(value: string): BirthDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** Reduce month, day, and year separately, then add and reduce the sum. */
export function lifePath({ year, month, day }: BirthDate): number {
  return reduce(reduce(month) + reduce(day) + reduce(year));
}

export function birthdayNumber({ day }: BirthDate): number {
  return reduce(day);
}

export function expressionNumber(name: string): number {
  return reduce(sumLetters(name, () => true));
}

export function soulUrgeNumber(name: string): number {
  return reduce(sumLetters(name, (c) => VOWELS.has(c)));
}

export function personalityNumber(name: string): number {
  return reduce(sumLetters(name, (c) => !VOWELS.has(c)));
}

export interface NumerologyProfile {
  lifePath: number;
  birthday: number;
  expression: number;
  soulUrge: number;
  personality: number;
}

export function profile(name: string, birth: BirthDate): NumerologyProfile {
  return {
    lifePath: lifePath(birth),
    birthday: birthdayNumber(birth),
    expression: expressionNumber(name),
    soulUrge: soulUrgeNumber(name),
    personality: personalityNumber(name),
  };
}

export function symmetryFromLifePath(n: number): number {
  if (n === 1) return 6;
  if (n === 2) return 12;
  if (n === 11) return 22;
  if (n >= 22) return 24;
  return n * 2;
}

export function ringsFromBirthday(n: number): number {
  return 3 + ((n - 1) % 5);
}

/** Chladni modes need distinct values; equal modes produce a blank plate. */
export function chladniModes(soulUrge: number, personality: number): [number, number] {
  const n = Math.max(1, reduce(soulUrge, false));
  let m = Math.max(1, reduce(personality, false));
  if (m === n) m = n + 1;
  return [n, m];
}
