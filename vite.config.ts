import { defineConfig } from "vite";

// Relative asset paths, so the built page works at https://<user>.github.io/mandala-effect/ as well as locally.
export default defineConfig({
  base: "./",
});
