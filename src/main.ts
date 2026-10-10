import "./style.css";
import { CENTER_LABELS, type CenterName } from "./geometry/centers";
import {
  DOT_STEPS,
  INNER_OUTLINE_STEPS,
  MAX_COUNT,
  minCount,
  MOTIF_GROUPS,
  MOTIF_LABELS,
  MOTIF_NAMES,
  MOTIF_OPTIONS,
  type MotifName,
  INTERVAL_NAMES,
  INTERVALS,
  type IntervalName,
  STAR_POINTS,
  STRANDS,
  type PetalTip,
  type RingOptions,
} from "./geometry/motifs";
import { GATE_LABELS, GATE_STYLES, type GateStyle } from "./geometry/bhupura";
import { FRAME_COUNTS, FRAME_LABELS, FRAME_NAMES, type FrameName } from "./geometry/frames";
import { ringRadii, type Spacing } from "./geometry/rings";
import { downloadPng, downloadSvg } from "./export";
import { Renderer } from "./gl";
import { MAX_SEED, settingsFromText, settingsToCode, settingsToLink } from "./settings";
import { autoRings, BORDER_SPACING_STEPS, drawingSize, type MandalaParams, mandalaLayers, RADIUS, type RingSpec } from "./render";

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
  borderSpacing: 1,
  /** Always on; at screen and print size the unsmoothed lines looked the same. */
  smooth: true,
  minDetail: false,
  frame: "none",
  gate: "closed",
  trivalaya: true,
  frameCount: 16,
  frameTip: "pointed",
  frameInnerOutline: 0.6,
  frameDots: 0,
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
const frameSelect = $<HTMLSelectElement>("frame");
for (const name of FRAME_NAMES) frameSelect.add(new Option(FRAME_LABELS[name], name));
const gateSelect = $<HTMLSelectElement>("gate");
for (const name of GATE_STYLES) gateSelect.add(new Option(GATE_LABELS[name], name));
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
for (const group of MOTIF_GROUPS) {
  const optgroup = element("optgroup");
  optgroup.label = group.label;
  for (const name of group.motifs) optgroup.append(new Option(MOTIF_LABELS[name], name));
  motifSelect.append(optgroup);
}

const countInput = element("input");
countInput.type = "range";
countInput.min = "1";
countInput.max = String(MAX_COUNT);
countInput.step = "1";
const countValue = element("output");
const copies = element("label", "copies");
copies.append("Spokes ", countValue, countInput);

const tipField = element("fieldset", "radios");
const tipLegend = element("legend");
tipLegend.textContent = "Tips";
tipField.append(tipLegend);
const tipRadios = (["pointed", "round"] as const).map((tip) => {
  const radio = element("input");
  radio.type = "radio";
  radio.name = "petalTip";
  radio.value = tip;
  const label = element("label", "check");
  label.append(radio, tip === "pointed" ? " Pointed" : " Round");
  tipField.append(label);
  return radio;
});
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
const modeN = modeSlider("Wave 1");
const modeM = modeSlider("Wave 2");
const intervalSelect = element("select");
for (const name of INTERVAL_NAMES) intervalSelect.add(new Option(INTERVALS[name].label, name));
intervalSelect.setAttribute("aria-label", "Interval");
const intervalLabel = element("label", "interval");
intervalLabel.append(intervalSelect);
const strandsInput = element("input");
strandsInput.type = "range";
strandsInput.min = String(STRANDS.min);
strandsInput.max = String(STRANDS.max);
strandsInput.step = "1";
const strandsValue = element("output");
const strandsLabel = element("label", "mode");
strandsLabel.append("Strands ", strandsValue, strandsInput);
const starPointsInput = element("input");
starPointsInput.type = "range";
starPointsInput.min = String(STAR_POINTS.min);
starPointsInput.max = String(STAR_POINTS.max);
starPointsInput.step = "1";
const starPointsValue = element("output");
const starPointsLabel = element("label", "mode");
starPointsLabel.append("Points ", starPointsValue, starPointsInput);
/** The label around each option's control, hidden when the option does not change the ring's pattern. */
const optionLabels: Record<keyof RingOptions, HTMLElement> = {
  petalTip: tipField,
  innerOutline: innerOutlineSlider.label,
  dots: dotsSlider.label,
  waveDepth: waveLabel,
  cymaticsN: modeN.label,
  cymaticsM: modeM.label,
  interval: intervalLabel,
  strands: strandsLabel,
  starPoints: starPointsLabel,
};
const options = element("div", "options");
options.append(tipField, intervalLabel, strandsLabel, starPointsLabel, innerOutlineSlider.label, dotsSlider.label, waveLabel, modeN.label, modeM.label);

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
for (const radio of tipRadios) radio.addEventListener("change", () => updateRing({ petalTip: radio.value as PetalTip }));
innerOutlineSlider.input.addEventListener("input", () => updateRing({ innerOutline: innerOutlineSlider.read() }));
dotsSlider.input.addEventListener("input", () => updateRing({ dots: dotsSlider.read() }));
waveInput.addEventListener("input", () => updateRing({ waveDepth: Number(waveInput.value) }));
modeN.input.addEventListener("input", () => updateRing({ cymaticsN: Number(modeN.input.value) }));
modeM.input.addEventListener("input", () => updateRing({ cymaticsM: Number(modeM.input.value) }));
intervalSelect.addEventListener("change", () => updateRing({ interval: intervalSelect.value as IntervalName }));
strandsInput.addEventListener("input", () => updateRing({ strands: Number(strandsInput.value) }));
starPointsInput.addEventListener("input", () => updateRing({ starPoints: Number(starPointsInput.value) }));

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
  for (const radio of tipRadios) radio.checked = radio.value === spec.petalTip;
  intervalSelect.value = spec.interval;
  strandsInput.value = String(spec.strands);
  strandsValue.textContent = String(spec.strands);
  starPointsInput.value = String(spec.starPoints);
  starPointsValue.textContent = String(spec.starPoints);
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
  const x = ((event.clientX - box.left) / box.width - 0.5) * drawingSize(params);
  const y = ((event.clientY - box.top) / box.height - 0.5) * drawingSize(params);
  const distance = Math.hypot(x, y);
  const radii = ringRadii(RADIUS, params.rings.length, params.spacing);
  const ring = radii.findIndex((r, i) => i < params.rings.length && distance >= r && distance < radii[i + 1]);
  if (ring < 0) return;
  selected = ring;
  draw();
});

// Line finish checkboxes

const finishFields = ["minDetail", "bindu", "trivalaya"] as const;

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
  frameSelect.value = params.frame;
  gateSelect.value = params.gate;
  // The gate and trivalaya settings belong to the bhupura frame only.
  gateSelect.closest("label")!.toggleAttribute("hidden", params.frame !== "bhupura");
  $<HTMLInputElement>("trivalaya").closest("label")!.toggleAttribute("hidden", params.frame !== "bhupura");
  syncFrameOptions();
  for (const field of finishFields) $<HTMLInputElement>(field).checked = params[field];
  borderSpacingInput.value = String(Math.max(0, BORDER_SPACING_STEPS.indexOf(params.borderSpacing)));
  $<HTMLOutputElement>("borderSpacing-value").textContent = params.borderSpacing ? String(params.borderSpacing) : "Off";

  const usesCymatics = params.center === "chladni" || params.center === "cymatics";
  // Settings that the selected center does not use are hidden.
  $<HTMLInputElement>("chladniN").closest(".pair")!.toggleAttribute("hidden", !usesCymatics);
  $<HTMLInputElement>("bindu").closest("label")!.toggleAttribute("hidden", params.center !== "sriYantra");
  $<HTMLInputElement>("rotations").closest("label")!.toggleAttribute("hidden", params.center !== "cymatics");
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
  renderer?.draw(mandalaLayers(params), drawingSize(params), pixels);
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

// The border spacing slider has 1 position for each of BORDER_SPACING_STEPS.
const borderSpacingInput = $<HTMLInputElement>("borderSpacing");
borderSpacingInput.max = String(BORDER_SPACING_STEPS.length - 1);
borderSpacingInput.addEventListener("input", () => {
  params.borderSpacing = BORDER_SPACING_STEPS[Number(borderSpacingInput.value)];
  draw();
});

const spacingRadios = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="spacing"]'));
for (const radio of spacingRadios) {
  radio.addEventListener("change", () => {
    params.spacing = radio.value as Spacing;
    draw();
  });
}

gateSelect.addEventListener("change", () => {
  params.gate = gateSelect.value as GateStyle;
  draw();
});

frameSelect.addEventListener("change", () => {
  params.frame = frameSelect.value as FrameName;
  // Each frame with a count starts at its own starting count.
  const range = FRAME_COUNTS[params.frame];
  if (range) params.frameCount = range.start;
  draw();
});

// The lotus petal and flame frames' settings: the count, and the lotus petals' tips, inner outlines, and dots,
// the same as the Lotus petals ring's settings.

const frameCountInput = $<HTMLInputElement>("frameCount");
const frameTipRadios = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="frameTip"]'));
const frameInnerOutlineInput = $<HTMLInputElement>("frameInnerOutline");
const frameDotsInput = $<HTMLInputElement>("frameDots");
frameInnerOutlineInput.max = String(INNER_OUTLINE_STEPS.length - 1);
frameDotsInput.max = String(DOT_STEPS.length - 1);

function syncFrameOptions() {
  const range = FRAME_COUNTS[params.frame];
  $("frameCount-label").toggleAttribute("hidden", !range);
  if (range) {
    $("frameCount-name").textContent = range.label;
    frameCountInput.min = String(range.min);
    frameCountInput.max = String(range.max);
    frameCountInput.value = String(params.frameCount);
    $("frameCount-value").textContent = String(params.frameCount);
  }
  for (const id of ["frameTip-label", "frameInnerOutline-label", "frameDots-label"]) $(id).toggleAttribute("hidden", params.frame !== "lotus");
  for (const radio of frameTipRadios) radio.checked = radio.value === params.frameTip;
  frameInnerOutlineInput.value = String(Math.max(0, (INNER_OUTLINE_STEPS as readonly number[]).indexOf(params.frameInnerOutline)));
  $("frameInnerOutline-value").textContent = params.frameInnerOutline === 0 ? "Off" : String(params.frameInnerOutline);
  frameDotsInput.value = String(Math.max(0, (DOT_STEPS as readonly number[]).indexOf(params.frameDots)));
  $("frameDots-value").textContent = params.frameDots === 0 ? "Off" : String(params.frameDots);
}

frameCountInput.addEventListener("input", () => {
  params.frameCount = Number(frameCountInput.value);
  draw();
});
for (const radio of frameTipRadios) {
  radio.addEventListener("change", () => {
    params.frameTip = radio.value as PetalTip;
    draw();
  });
}
frameInnerOutlineInput.addEventListener("input", () => {
  params.frameInnerOutline = INNER_OUTLINE_STEPS[Number(frameInnerOutlineInput.value)];
  draw();
});
frameDotsInput.addEventListener("input", () => {
  params.frameDots = DOT_STEPS[Number(frameDotsInput.value)];
  draw();
});

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
  params.spacing = randomItem(["golden", "even"] as const);
  // Single borders half of the time, and otherwise a random spacing.
  params.borderSpacing = randomItem([true, false]) ? randomItem(BORDER_SPACING_STEPS.slice(1)) : 0;
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
 * Picks the number of rings, and every ring's settings. The seed
 * also chooses the settings of rings added later with the Number of rings slider.
 */
function shuffleRings() {
  params.seed = randomInt(0, MAX_SEED);
  params.rings = autoRings(params.seed, randomSlider("ringCount"), params.spacing, MOTIF_NAMES, true);
  stash = [];
}

function shuffleFrame() {
  // Always a different frame from the current one. "None" is one of the choices.
  params.frame = randomItem(FRAME_NAMES.filter((name) => name !== params.frame));
  if (params.frame === "bhupura") {
    params.gate = randomItem(GATE_STYLES);
    params.trivalaya = randomItem([true, false]);
  }
  const range = FRAME_COUNTS[params.frame];
  if (range) params.frameCount = randomInt(range.min, range.max);
  if (params.frame === "lotus") {
    params.frameTip = randomItem(["pointed", "round"] as const);
    params.frameInnerOutline = randomItem(INNER_OUTLINE_STEPS);
    params.frameDots = randomItem(DOT_STEPS);
  }
}

const shuffles = { lines: shuffleLines, center: shuffleCenter, rings: shuffleRings, frame: shuffleFrame };
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
  shuffleFrame();
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

$<HTMLButtonElement>("export-svg").addEventListener("click", () => downloadSvg(mandalaLayers(params), drawingSize(params), filename("svg")));
$<HTMLButtonElement>("export-png").addEventListener("click", () => {
  downloadPng(mandalaLayers(params), drawingSize(params), filename("png")).catch((error) => alert(`PNG export failed: ${error.message}`));
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
