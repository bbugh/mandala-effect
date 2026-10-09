import "./style.css";
import { CENTER_LABELS, type CenterName } from "./geometry/centers";
import {
  DOT_STEPS,
  INNER_OUTLINE_STEPS,
  MAX_COUNT,
  minCount,
  MOTIF_LABELS,
  MOTIF_NAMES,
  MOTIF_OPTIONS,
  type MotifName,
  type PetalTip,
  type RingOptions,
} from "./geometry/motifs";
import { ringRadii, type Spacing } from "./geometry/rings";
import { downloadPng, downloadSvg } from "./export";
import { Renderer } from "./gl";
import { MAX_SEED, settingsFromText, settingsToCode, settingsToLink } from "./settings";
import { autoRings, DRAWING_SIZE, type MandalaParams, mandalaLayers, RADIUS, type RingSpec } from "./render";

const MAX_RINGS = 8;

const params: MandalaParams = {
  rotations: 12,
  spacing: "golden",
  center: "flowerOfLife",
  chladniN: 3,
  chladniM: 5,
  seed: 108,
  lineWeight: 1.5,
  rings: autoRings(108, 5, "golden"),
  bindu: true,
  borderThickness: 1,
  borderSpacing: true,
  /** Always on; at screen and print size the unsmoothed lines looked the same. */
  smooth: true,
  minDetail: false,
};

/** Ring settings beyond the current ring count, kept so that adding rings back restores them. */
let stash: RingSpec[] = [];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const view = $<HTMLDivElement>("mandala");
const canvas = document.createElement("canvas");
view.append(canvas);
/** Null when the browser has no WebGL 2; the drawing area then shows a message instead. */
let renderer: Renderer | null = null;
try {
  renderer = new Renderer(canvas, false, () => paint());
} catch {
  const message = document.createElement("p");
  message.className = "no-webgl";
  message.textContent = "This browser cannot draw the mandala.";
  view.replaceChildren(message);
}
const centerSelect = $<HTMLSelectElement>("center");
const ringRows = $<HTMLDivElement>("ring-rows");

for (const [value, label] of Object.entries(CENTER_LABELS)) {
  centerSelect.add(new Option(label, value));
}

// Rings: a list with 1 item per ring. The selected ring's item opens in place to show its editor: the ring's
// pattern, its copies, and only the options that change its pattern. Clicking a ring in the drawing selects it.

/** Index of the ring that the editor changes. */
let selected = 0;

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className = "") => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
};

const ringList = element("div", "ring-list");
const ringItems = Array.from({ length: MAX_RINGS }, (_, i) => {
  const item = element("div", "ring-item");
  const node = element("button", "ring-button");
  node.type = "button";
  node.addEventListener("click", () => {
    selected = i;
    draw();
  });
  item.append(node);
  ringList.append(item);
  return { item, button: node };
});

/** The editor is moved into the selected ring's item. */
const editor = element("div", "ring-editor");

const motifSelect = element("select");
motifSelect.setAttribute("aria-label", "Pattern");
for (const name of MOTIF_NAMES) motifSelect.add(new Option(MOTIF_LABELS[name], name));

const countInput = element("input");
countInput.type = "range";
countInput.min = "1";
countInput.max = String(MAX_COUNT);
countInput.step = "1";
const countValue = element("output");
const copies = element("label", "copies");
copies.append("Spokes ", countValue, countInput);

const tipSelect = element("select");
tipSelect.add(new Option("Pointed tips", "pointed"));
tipSelect.add(new Option("Round tips", "round"));
tipSelect.setAttribute("aria-label", "Tips");
const tipLabel = element("label", "tip");
tipLabel.append(tipSelect);
/** A slider whose leftmost position turns an option off and whose other positions set its size. */
function stepSlider(name: string, values: readonly number[]) {
  const input = element("input");
  input.type = "range";
  input.min = "0";
  input.max = String(values.length - 1);
  input.step = "1";
  const value = element("output");
  const label = element("label", "steps");
  label.append(`${name} `, value, input);
  const show = (current: number) => {
    input.value = String(Math.max(0, values.indexOf(current)));
    value.textContent = current === 0 ? "Off" : String(current);
  };
  return { input, label, show, read: () => values[Number(input.value)] };
}
const innerOutlineSlider = stepSlider("Inner outlines", INNER_OUTLINE_STEPS);
const dotsSlider = stepSlider("Dots", DOT_STEPS);
const waveInput = element("input");
waveInput.type = "range";
waveInput.min = "0.1";
waveInput.max = "0.5";
waveInput.step = "0.02";
const waveValue = element("output");
const waveLabel = element("label", "wave");
waveLabel.append("Wave depth ", waveValue, waveInput);

/** A slider for a cymatics ring mode, 1 to 12. */
function modeSlider(name: string) {
  const input = element("input");
  input.type = "range";
  input.min = "1";
  input.max = "12";
  input.step = "1";
  const value = element("output");
  const label = element("label", "mode");
  label.append(`${name} `, value, input);
  return { input, value, label };
}
const modeN = modeSlider("Cymatics n");
const modeM = modeSlider("Cymatics m");
/** The label around each option's control, hidden when the option does not change the ring's pattern. */
const optionLabels: Record<keyof RingOptions, HTMLLabelElement> = {
  petalTip: tipLabel,
  innerOutline: innerOutlineSlider.label,
  dots: dotsSlider.label,
  waveDepth: waveLabel,
  cymaticsN: modeN.label,
  cymaticsM: modeM.label,
};
const options = element("div", "options");
options.append(tipLabel, innerOutlineSlider.label, dotsSlider.label, waveLabel, modeN.label, modeM.label);

editor.append(motifSelect, copies, options);
ringRows.append(ringList);

function updateRing(changes: Partial<RingSpec>) {
  const spec = { ...params.rings[selected], ...changes };
  spec.count = Math.min(MAX_COUNT, Math.max(minCount(spec.motif), Math.round(spec.count)));
  params.rings[selected] = spec;
  draw();
}

motifSelect.addEventListener("change", () => updateRing({ motif: motifSelect.value as MotifName }));
countInput.addEventListener("input", () => updateRing({ count: Number(countInput.value) }));
tipSelect.addEventListener("change", () => updateRing({ petalTip: tipSelect.value as PetalTip }));
innerOutlineSlider.input.addEventListener("input", () => updateRing({ innerOutline: innerOutlineSlider.read() }));
dotsSlider.input.addEventListener("input", () => updateRing({ dots: dotsSlider.read() }));
waveInput.addEventListener("input", () => updateRing({ waveDepth: Number(waveInput.value) }));
modeN.input.addEventListener("input", () => updateRing({ cymaticsN: Number(modeN.input.value) }));
modeM.input.addEventListener("input", () => updateRing({ cymaticsM: Number(modeM.input.value) }));

function syncRingRows() {
  selected = Math.min(selected, params.rings.length - 1);
  ringItems.forEach(({ item, button: node }, i) => {
    const spec = params.rings[i];
    item.hidden = !spec;
    if (!spec) return;
    node.textContent = `${i + 1}  ${MOTIF_LABELS[spec.motif]} × ${spec.count}`;
    node.setAttribute("aria-expanded", String(i === selected));
    item.classList.toggle("selected", i === selected);
  });
  // Moving the editor ends a slider drag on iPhone Safari, so it moves only when the selected ring changes.
  if (editor.parentElement !== ringItems[selected].item) ringItems[selected].item.append(editor);
  const spec = params.rings[selected];
  motifSelect.value = spec.motif;
  countInput.min = String(minCount(spec.motif));
  countInput.value = String(spec.count);
  countValue.textContent = String(spec.count);
  tipSelect.value = spec.petalTip;
  innerOutlineSlider.show(spec.innerOutline);
  dotsSlider.show(spec.dots);
  waveInput.value = String(spec.waveDepth);
  waveValue.textContent = String(spec.waveDepth);
  for (const [mode, value] of [[modeN, spec.cymaticsN], [modeM, spec.cymaticsM]] as const) {
    mode.input.value = String(value);
    mode.value.textContent = String(value);
  }
  const shown = MOTIF_OPTIONS[spec.motif];
  for (const [name, label] of Object.entries(optionLabels)) label.hidden = !shown.includes(name as keyof RingOptions);
  options.hidden = shown.length === 0;
}

// Clicking a ring in the drawing selects it in the ring editor.
canvas.addEventListener("click", (event) => {
  const box = canvas.getBoundingClientRect();
  const x = ((event.clientX - box.left) / box.width - 0.5) * DRAWING_SIZE;
  const y = ((event.clientY - box.top) / box.height - 0.5) * DRAWING_SIZE;
  const distance = Math.hypot(x, y);
  const radii = ringRadii(RADIUS, params.rings.length, params.spacing);
  const ring = radii.findIndex((r, i) => i < params.rings.length && distance >= r && distance < radii[i + 1]);
  if (ring < 0) return;
  selected = ring;
  draw();
});

// Line finish checkboxes

const finishFields = ["borderSpacing", "minDetail", "bindu"] as const;

for (const field of finishFields) {
  $<HTMLInputElement>(field).addEventListener("change", (event) => {
    params[field] = (event.target as HTMLInputElement).checked;
    draw();
  });
}

// Simple numeric and select controls

const ranges = ["rotations", "lineWeight", "borderThickness", "chladniN", "chladniM"] as const;

function syncControls() {
  for (const field of ranges) {
    $<HTMLInputElement>(field).value = String(params[field]);
    const output = document.getElementById(`${field}-value`);
    if (output) output.textContent = String(params[field]);
  }
  $<HTMLInputElement>("ringCount").value = String(params.rings.length);
  $<HTMLOutputElement>("ringCount-value").textContent = String(params.rings.length);
  for (const radio of spacingRadios) radio.checked = radio.value === params.spacing;
  centerSelect.value = params.center;
  for (const field of finishFields) $<HTMLInputElement>(field).checked = params[field];

  const usesCymatics = params.center === "chladni" || params.center === "cymatics";
  $<HTMLInputElement>("chladniN").disabled = !usesCymatics;
  $<HTMLInputElement>("chladniM").disabled = !usesCymatics;
  $<HTMLInputElement>("bindu").disabled = params.center !== "sriYantra";
  $<HTMLInputElement>("rotations").disabled = params.center !== "cymatics";
  syncRingRows();
}


// The address bar always shows the link to the current design. The first redraw of a change adds a
// browser history entry, and later redraws until the change finishes (a slider is released, a menu
// choice or checkbox change is made, or a button is clicked) replace that entry. Back then returns
// to the design before each finished change.
let changing = false;
for (const type of ["change", "click"]) document.addEventListener(type, () => (changing = false));

/** Draws the mandala at the canvas's displayed size and the screen's pixel density. */
function paint() {
  const pixels = Math.round(canvas.clientWidth * window.devicePixelRatio);
  if (canvas.width !== pixels) {
    canvas.width = pixels;
    canvas.height = pixels;
  }
  renderer?.draw(mandalaLayers(params), DRAWING_SIZE, pixels);
}
new ResizeObserver(paint).observe(canvas);

function draw() {
  syncControls();
  paint();
  const link = settingsToLink(params, location.href);
  if (link === location.href) return;
  if (changing) history.replaceState(null, "", link);
  else history.pushState(null, "", link);
  changing = true;
}

for (const field of ranges) {
  $<HTMLInputElement>(field).addEventListener("input", (event) => {
    const value = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    params[field] = value;
    draw();
  });
}

$<HTMLInputElement>("ringCount").addEventListener("input", (event) => {
  const count = Number((event.target as HTMLInputElement).value);
  params.rings.forEach((spec, i) => (stash[i] = spec));
  const filled = autoRings(params.seed, count, params.spacing, MOTIF_NAMES, true);
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

centerSelect.addEventListener("change", () => {
  params.center = centerSelect.value as CenterName;
  draw();
});

/** Random whole number from min to max, inclusive. */
const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const randomItem = <T>(items: readonly T[]): T => items[randomInt(0, items.length - 1)];

/** Random value from a slider's range, in its steps. */
const randomSlider = (id: string) => {
  const input = $<HTMLInputElement>(id);
  const [min, max, step] = [Number(input.min), Number(input.max), Number(input.step)];
  return Number((min + randomInt(0, Math.round((max - min) / step)) * step).toFixed(2));
};

function shuffleLines() {
  params.lineWeight = randomSlider("lineWeight");
  params.borderThickness = randomSlider("borderThickness");
}

function shuffleCenter() {
  // Always a different center from the current one.
  params.center = randomItem((Object.keys(CENTER_LABELS) as CenterName[]).filter((name) => name !== params.center));
  // Settings that the chosen center does not use keep their values.
  if (params.center === "sriYantra") params.bindu = randomItem([true, false]);
  if (params.center === "cymatics") params.rotations = randomSlider("rotations");
  if (params.center === "chladni" || params.center === "cymatics") {
    params.chladniN = randomSlider("chladniN");
    // n = m = 1 is the only pair with no lines on the Chladni plate center.
    do params.chladniM = randomSlider("chladniM");
    while (params.center === "chladni" && params.chladniN === 1 && params.chladniM === 1);
  }
}

/**
 * Picks the ring spacing, the double borders, the number of rings, and every ring's settings. The seed
 * also chooses the settings of rings added later with the Number of rings slider.
 */
function shuffleRings() {
  params.spacing = randomItem(["golden", "even"] as const);
  params.borderSpacing = randomItem([true, false]);
  params.seed = randomInt(0, MAX_SEED);
  params.rings = autoRings(params.seed, randomSlider("ringCount"), params.spacing, MOTIF_NAMES, true);
  stash = [];
}

const shuffles = { lines: shuffleLines, center: shuffleCenter, rings: shuffleRings };
for (const [section, shuffle] of Object.entries(shuffles)) {
  $<HTMLButtonElement>(`shuffle-${section}`).addEventListener("click", () => {
    shuffle();
    draw();
  });
}

// Picks every design setting at random. The "Hide difficult to print details" checkbox changes only when the user clicks it.
$<HTMLButtonElement>("shuffle-all").addEventListener("click", () => {
  shuffleLines();
  shuffleCenter();
  shuffleRings();
  draw();
});

// Share puts the link to the current design on the clipboard and shows a checkmark for a moment.

const shareButton = $<HTMLButtonElement>("share");
const [shareIcon, copiedIcon] = shareButton.querySelectorAll("svg");
let shareTimer = 0;

function showCopied(copied: boolean) {
  shareIcon.toggleAttribute("hidden", copied);
  copiedIcon.toggleAttribute("hidden", !copied);
  shareButton.setAttribute("aria-label", copied ? "Link copied" : "Share");
}

shareButton.addEventListener("click", () => {
  navigator.clipboard.writeText(settingsToLink(params, location.href));
  showCopied(true);
  clearTimeout(shareTimer);
  shareTimer = window.setTimeout(() => showCopied(false), 1200);
});

// Export

const filename = (extension: string) => `mandala-${settingsToCode(params)}.${extension}`;

$<HTMLButtonElement>("export-svg").addEventListener("click", () => downloadSvg(mandalaLayers(params), filename("svg")));
$<HTMLButtonElement>("export-png").addEventListener("click", () => {
  downloadPng(mandalaLayers(params), filename("png")).catch((error) => alert(`PNG export failed: ${error.message}`));
});

// A link opens the page with its settings. Back, Forward, and a link pasted into the address bar while
// the page is open change only the part after "#", so the page also listens for that change. Drawing a
// design from the address bar replaces the current entry and adds none.
function applyLink() {
  const linked = location.hash ? settingsFromText(location.href, params) : null;
  if (linked) {
    Object.assign(params, linked);
    stash = [];
  }
  changing = true;
  draw();
  changing = false;
}
window.addEventListener("popstate", applyLink);
applyLink();
