import "./style.css";
import { CENTER_LABELS, type CenterName } from "./geometry/centers";
import { type Detail, MAX_REPEAT, MOTIF_LABELS, MOTIF_NAMES, type MotifName, type PetalTip } from "./geometry/motifs";
import type { Spacing } from "./geometry/rings";
import { downloadPng, downloadSvg } from "./export";
import { type NumerologyProfile, parseBirthDate } from "./numerology";
import { personalMandala } from "./personal";
import { autoRings, type MandalaParams, renderMandala, type RingSpec } from "./render";

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
  weightHierarchy: true,
  borderSpacing: true,
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

// Tabs

const tabs = [
  { tab: $<HTMLButtonElement>("tab-pattern"), panel: $<HTMLDivElement>("panel-pattern") },
  { tab: $<HTMLButtonElement>("tab-custom"), panel: $<HTMLDivElement>("panel-custom") },
  { tab: $<HTMLButtonElement>("tab-design"), panel: $<HTMLDivElement>("panel-design") },
];
for (const { tab } of tabs) {
  tab.addEventListener("click", () => {
    for (const other of tabs) {
      const selected = other.tab === tab;
      other.tab.setAttribute("aria-selected", String(selected));
      other.panel.hidden = !selected;
    }
  });
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
  const preview = autoRings(params.seed, MAX_RINGS, params.symmetry, params.spacing);
  rows.forEach((row, i) => {
    const active = i < params.rings.length;
    const spec = params.rings[i] ?? stash[i] ?? preview[i];
    row.motif.value = spec.motif;
    row.repeat.value = String(spec.repeat);
    row.motif.disabled = !active;
    row.repeat.disabled = !active;
    Array.from(row.repeat.options).forEach((option, k) => {
      option.textContent = String(params.symmetry * (k + 1));
    });
  });
}

// Line finish checkboxes

const finishFields = ["weightHierarchy", "borderSpacing", "smooth", "minDetail", "bindu"] as const;

for (const field of finishFields) {
  $<HTMLInputElement>(field).addEventListener("change", (event) => {
    params[field] = (event.target as HTMLInputElement).checked;
    draw();
  });
}

// Simple numeric and select controls

const ranges = ["symmetry", "lineWeight", "chladniN", "chladniM", "waveDepth", "seed"] as const;

function syncControls() {
  for (const field of ranges) {
    $<HTMLInputElement>(field).value = String(params[field]);
    const output = document.getElementById(`${field}-value`);
    if (output) output.textContent = String(params[field]);
  }
  $<HTMLInputElement>("ringCount").value = String(params.rings.length);
  $<HTMLOutputElement>("ringCount-value").textContent = String(params.rings.length);
  $<HTMLSelectElement>("spacing").value = params.spacing;
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
  syncControls();
  currentSvg = renderMandala(params);
  view.innerHTML = currentSvg;
}

function reseed(seed: number) {
  params.seed = seed;
  params.rings = autoRings(seed, params.rings.length, params.symmetry, params.spacing);
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
  const filled = autoRings(params.seed, count, params.symmetry, params.spacing);
  params.rings = filled.map((spec, i) => params.rings[i] ?? stash[i] ?? spec);
  draw();
});

$<HTMLSelectElement>("spacing").addEventListener("change", (event) => {
  params.spacing = (event.target as HTMLSelectElement).value as Spacing;
  draw();
});

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

// Pattern tab

const nameInput = $<HTMLInputElement>("name");
const birthInput = $<HTMLInputElement>("birthdate");
const generateButton = $<HTMLButtonElement>("generate");
const numbersList = $<HTMLDListElement>("numbers");

function updateGenerateButton() {
  generateButton.disabled = !nameInput.value.trim() || !parseBirthDate(birthInput.value);
}
nameInput.addEventListener("input", updateGenerateButton);
birthInput.addEventListener("input", updateGenerateButton);

function showNumbers(numbers: NumerologyProfile | null) {
  const outer = params.rings[params.rings.length - 1];
  const rowsData: [string, number | undefined, string][] = [
    ["Life Path", numbers?.lifePath, `${params.symmetry}-fold symmetry`],
    ["Birthday", numbers?.birthday, `${params.rings.length} rings`],
    ["Expression", numbers?.expression, `ring patterns, outer ring ${params.symmetry * outer.repeat} repeats`],
    ["Soul Urge", numbers?.soulUrge, `cymatics n = ${params.chladniN}`],
    ["Personality", numbers?.personality, `cymatics m = ${params.chladniM}`],
  ];
  numbersList.replaceChildren(
    ...rowsData.flatMap(([label, value, effect]) => {
      const term = document.createElement("dt");
      term.textContent = `${label} ${value ?? "–"}`;
      const detail = document.createElement("dd");
      detail.textContent = numbers ? effect : "–";
      return [term, detail];
    }),
  );
}

generateButton.addEventListener("click", () => {
  const birth = parseBirthDate(birthInput.value);
  const name = nameInput.value.trim();
  if (!birth || !name) return;
  const result = personalMandala(name, birth, birthInput.value, params);
  Object.assign(params, result.params);
  stash = [];
  draw();
  showNumbers(result.numbers);
});

// Export

const filename = (extension: string) => `mandala-${params.symmetry}-${params.seed}.${extension}`;

$<HTMLButtonElement>("export-svg").addEventListener("click", () => downloadSvg(currentSvg, filename("svg")));
$<HTMLButtonElement>("export-png").addEventListener("click", () => {
  downloadPng(currentSvg, filename("png")).catch((error) => alert(`PNG export failed: ${error.message}`));
});

showNumbers(null);
draw();
