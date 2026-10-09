import { Renderer } from "./gl";
import { DRAWING_SIZE, type Layer } from "./render";
import { mandalaSvg } from "./svg";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadSvg(layers: Layer[], filename: string) {
  download(new Blob([mandalaSvg(layers, DRAWING_SIZE)], { type: "image/svg+xml" }), filename);
}

/** Draws the layers with WebGL on a canvas of size × size pixels and saves it as a PNG. */
export async function downloadPng(layers: Layer[], filename: string, size = 3000) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const renderer = new Renderer(canvas, true);
  try {
    renderer.draw(layers, DRAWING_SIZE, size);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("PNG encoding failed");
    download(blob, filename);
  } finally {
    renderer.destroy();
  }
}
