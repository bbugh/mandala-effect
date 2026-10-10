import { Renderer } from "./gl";
import type { Layer } from "./render";
import { mandalaSvg } from "./svg";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** size is the drawing's width in drawing units, centered on (0, 0). */
export function downloadSvg(layers: Layer[], size: number, filename: string) {
  download(new Blob([mandalaSvg(layers, size)], { type: "image/svg+xml" }), filename);
}

/** Draws the layers, drawingSize drawing units wide, with WebGL on a canvas of size × size pixels and saves it as a PNG. */
export async function downloadPng(layers: Layer[], drawingSize: number, filename: string, size = 3000) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const renderer = new Renderer(canvas, true);
  try {
    renderer.draw(layers, drawingSize, size);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("PNG encoding failed");
    download(blob, filename);
  } finally {
    renderer.destroy();
  }
}
