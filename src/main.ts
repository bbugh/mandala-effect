import "./style.css";
import { CENTER_LABELS, type CenterName } from "./geometry/centers";
import { type Detail, legibleRepeats, MAX_REPEAT, MOTIF_LABELS, MOTIF_NAMES, type MotifName, type PetalTip } from "./geometry/motifs";
import { ringRadii } from "./geometry/rings";
import type { Spacing } from "./geometry/rings";
import { downloadPng, downloadSvg } from "./export";
import { settingsFromText, settingsToText } from "./settings";
import { autoRings, fitRepeats, type MandalaParams, RADIUS, renderMandala, type RingSpec } from "./render";

const MAX_RINGS = 8;

const params: MandalaParams = {
  symmetry: 12,
  spacing: "golden",
  center: "flowerOfLife",
  chladniN: 3,
  chladniM: 5,
  seed: 108,
  lineWeight: 1.5,
  rings: autoRings(108, 5, 12, "golden"),
  petalTip: "pointed",
  detail: 1,
  waveDepth: 0.36,
  bindu: true,
  lineContrast: 1,
  borderSpacing: true,
  /** Always on; at screen and print size the unsmoothed lines looked the same. */
  smooth: true,
  minDetail: false,
};

/** Ring settings beyond the current ring count, kept so that adding rings back restores them. */
let stash: RingSpec[] = [];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const view = $<HTMLDivElement>("mandala");
const centerSelect = $<HTMLSelectElement>("center");
const ringRows = $<HTMLTableSectionElement>("ring-rows");

for (const [value, label] of Object.entries(CENTER_LABELS)) {
  centerSelect.add(new Option(label, value));
}

// Ring table: always MAX_RINGS rows; rows beyond the ring count are disabled.

interface RingRow {
  motif: HTMLSelectElement;
  repeat: HTMLSelectElement;
}

const rows: RingRow[] = Array.from({ length: MAX_RINGS }, (_, i) => {
  const tr = document.createElement("tr");
  const label = document.createElement("th");
  label.scope = "row";
  label.textContent = i === 0 ? "1 (inner)" : String(i + 1);
  const motif = document.createElement("select");
  motif.setAttribute("aria-label", `Ring ${i + 1} pattern`);
  for (const name of MOTIF_NAMES) motif.add(new Option(MOTIF_LABELS[name], name));
  const repeat = document.createElement("select");
  repeat.setAttribute("aria-label", `Ring ${i + 1} repeats`);
  for (let k = 1; k <= MAX_REPEAT; k++) repeat.add(new Option("", String(k)));

  const onChange = () => {
    if (i >= params.rings.length) return;
    params.rings[i] = { motif: motif.value as MotifName, repeat: Number(repeat.value) };
    draw();
  };
  motif.addEventListener("change", onChange);
  repeat.addEventListener("change", onChange);

  const motifCell = document.createElement("td");
  motifCell.append(motif);
  const repeatCell = document.createElement("td");
  repeatCell.append(repeat);
  tr.append(label, motifCell, repeatCell);
  ringRows.append(tr);
  return { motif, repeat };
});

function syncRingRows() {
  const preview = autoRings(params.seed, MAX_RINGS, params.symmetry, params.spacing, MOTIF_NAMES);
  const radii = ringRadii(RADIUS, params.rings.length, params.spacing);
  rows.forEach((row, i) => {
    const active = i < params.rings.length;
    const spec = params.rings[i] ?? stash[i] ?? preview[i];
    row.motif.value = spec.motif;
    row.repeat.value = String(spec.repeat);
    row.motif.disabled = !active;
    row.repeat.disabled = !active;
    // Repeat counts at which the motif would not be legible in this ring are disabled.
    const legible = active ? legibleRepeats(spec.motif, radii[i], radii[i + 1], params.symmetry) : [];
    Array.from(row.repeat.options).forEach((option, k) => {
      option.textContent = String(params.symmetry * (k + 1));
      option.disabled = active && !legible.includes(k + 1);
    });
  });
}

// Line finish checkboxes

const finishFields = ["borderSpacing", "minDetail", "bindu"] as const;

for (const field of finishFields) {
  $<HTMLInputElement>(field).addEventListener("change", (event) => {
    params[field] = (event.target as HTMLInputElement).checked;
    draw();
  });
}

// Simple numeric and select controls

const ranges = ["symmetry", "lineWeight", "lineContrast", "chladniN", "chladniM", "waveDepth", "seed"] as const;

function syncControls() {
  for (const field of ranges) {
    $<HTMLInputElement>(field).value = String(params[field]);
    const output = document.getElementById(`${field}-value`);
    if (output) output.textContent = String(params[field]);
  }
  $<HTMLInputElement>("ringCount").value = String(params.rings.length);
  $<HTMLOutputElement>("ringCount-value").textContent = String(params.rings.length);
  for (const radio of spacingRadios) radio.checked = radio.value === params.spacing;
  $<HTMLSelectElement>("petalTip").value = params.petalTip;
  $<HTMLSelectElement>("detail").value = String(params.detail);
  centerSelect.value = params.center;
  for (const field of finishFields) $<HTMLInputElement>(field).checked = params[field];

  const usesCymatics =
    params.center === "chladni" || params.center === "cymatics" || params.rings.some((r) => r.motif === "cymatics");
  $<HTMLInputElement>("chladniN").disabled = !usesCymatics;
  $<HTMLInputElement>("chladniM").disabled = !usesCymatics;
  $<HTMLInputElement>("bindu").disabled = params.center !== "sriYantra";
  $<HTMLInputElement>("waveDepth").disabled = !params.rings.some((r) => r.motif === "roseBraid");
  syncRingRows();
}

let currentSvg = "";

function draw() {
  params.rings = fitRepeats(params.rings, params.symmetry, params.spacing);
  syncControls();
  currentSvg = renderMandala(params);
  view.innerHTML = currentSvg;
}

function reseed(seed: number) {
  params.seed = seed;
  params.rings = autoRings(seed, params.rings.length, params.symmetry, params.spacing, MOTIF_NAMES);
  stash = [];
  draw();
}

for (const field of ranges) {
  $<HTMLInputElement>(field).addEventListener("input", (event) => {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    if (field === "seed") return reseed(Math.max(0, Math.floor(value)));
    params[field] = value;
    draw();
  });
}

$<HTMLInputElement>("ringCount").addEventListener("input", (event) => {
  const count = Number((event.target as HTMLInputElement).value);
  params.rings.forEach((spec, i) => (stash[i] = spec));
  const filled = autoRings(params.seed, count, params.symmetry, params.spacing, MOTIF_NAMES);
  params.rings = filled.map((spec, i) => params.rings[i] ?? stash[i] ?? spec);
  draw();
});

const spacingRadios = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="spacing"]'));
for (const radio of spacingRadios) {
  radio.addEventListener("change", () => {
    params.spacing = radio.value as Spacing;
    draw();
  });
}

$<HTMLSelectElement>("petalTip").addEventListener("change", (event) => {
  params.petalTip = (event.target as HTMLSelectElement).value as PetalTip;
  draw();
});

$<HTMLSelectElement>("detail").addEventListener("change", (event) => {
  params.detail = Number((event.target as HTMLSelectElement).value) as Detail;
  draw();
});

centerSelect.addEventListener("change", () => {
  params.center = centerSelect.value as CenterName;
  draw();
});

$<HTMLButtonElement>("shuffle").addEventListener("click", () => reseed(Math.floor(Math.random() * 100000)));

/** Random whole number from min to max, inclusive. */
const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const randomItem = <T>(items: readonly T[]): T => items[randomInt(0, items.length - 1)];

/** Random value from a slider's range, in its steps. */
const randomSlider = (id: string) => {
  const input = $<HTMLInputElement>(id);
  const [min, max, step] = [Number(input.min), Number(input.max), Number(input.step)];
  return Number((min + randomInt(0, Math.round((max - min) / step)) * step).toFixed(2));
};

// Picks every setting at random: every center, every ring pattern, every slider, and every checkbox.
$<HTMLButtonElement>("shuffle-all").addEventListener("click", () => {
  params.symmetry = randomSlider("symmetry");
  params.spacing = randomItem(["golden", "even"] as const);
  params.lineWeight = randomSlider("lineWeight");
  params.lineContrast = randomSlider("lineContrast");
  params.minDetail = randomItem([true, false]);
  params.center = randomItem(Object.keys(CENTER_LABELS) as CenterName[]);
  params.bindu = randomItem([true, false]);
  params.chladniN = randomSlider("chladniN");
  // Equal modes produce a blank Chladni plate.
  do params.chladniM = randomSlider("chladniM");
  while (params.chladniM === params.chladniN);
  params.petalTip = randomItem(["pointed", "round"] as const);
  params.detail = randomItem([0, 1, 2] as const);
  params.waveDepth = randomSlider("waveDepth");
  params.borderSpacing = randomItem([true, false]);
  params.seed = randomInt(0, 99999);
  params.rings = autoRings(params.seed, randomSlider("ringCount"), params.symmetry, params.spacing, MOTIF_NAMES);
  stash = [];
  draw();
});

// Settings copy and paste

const settingsStatus = $<HTMLParagraphElement>("settings-status");

const copyButton = $<HTMLButtonElement>("copy-settings");
let copyTimer = 0;

copyButton.addEventListener("click", () => {
  settingsStatus.textContent = "";
  navigator.clipboard.writeText(settingsToText(params));
  copyButton.textContent = "Copied";
  clearTimeout(copyTimer);
  copyTimer = window.setTimeout(() => (copyButton.textContent = "Copy"), 1200);
});

$<HTMLButtonElement>("paste-settings").addEventListener("click", async () => {
  let text: string | null;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    text = prompt("Paste the settings text:");
  }
  settingsStatus.textContent = "";
  if (text === null) return;
  const pasted = settingsFromText(text, params);
  if (!pasted) {
    settingsStatus.textContent = "The clipboard does not contain mandala settings.";
    return;
  }
  Object.assign(params, pasted);
  stash = [];
  draw();
});

// Export

const filename = (extension: string) => `mandala-${params.symmetry}-${params.seed}.${extension}`;

$<HTMLButtonElement>("export-svg").addEventListener("click", () => downloadSvg(currentSvg, filename("svg")));
$<HTMLButtonElement>("export-png").addEventListener("click", () => {
  downloadPng(currentSvg, filename("png")).catch((error) => alert(`PNG export failed: ${error.message}`));
});

draw();
