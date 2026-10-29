import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function stripModuleType(): Plugin {
  return {
    name: "strip-module-type",
    writeBundle(options) {
      const dir = options.dir ?? resolve(process.cwd(), "dist");
      const file = resolve(dir, "index.html");
      let html = readFileSync(file, "utf-8");
      html = html
        .replace(/<script type="module"([^>]*)>/g, "<script$1>")
        .replace(/\scrossorigin/g, "")
        .replace(/<link rel="modulepreload"[^>]*>/g, "");
      writeFileSync(file, html, "utf-8");
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile(), stripModuleType()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome96",
    modulePreload: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: "iife",
        inlineDynamicImports: true
      }
    }
  }
});
