import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function checklistFormatAssets(): Plugin {
  const assets = [
    ["checklist-format.md", "../docs/checklist-format.md", "text/plain"],
    [
      "checklist.schema.json",
      "../docs/checklist.schema.json",
      "application/json",
    ],
    [
      "checklist-template.json",
      "../backend/data/examples/minimal.json",
      "application/json",
    ],
    [
      "checklist-todo.json",
      "../backend/data/examples/todo.json",
      "application/json",
    ],
    [
      "checklist-learning.json",
      "../backend/data/examples/learning.json",
      "application/json",
    ],
    [
      "checklist-ocr-reference.json",
      "../backend/data/examples/ocr-reference.json",
      "application/json",
    ],
  ].map(([fileName, sourcePath, contentType]) => ({
    fileName,
    sourcePath: fileURLToPath(new URL(sourcePath, import.meta.url)),
    contentType,
  }));
  return {
    name: "checklist-format-assets",
    generateBundle() {
      for (const asset of assets) {
        this.emitFile({
          type: "asset",
          fileName: asset.fileName,
          source: readFileSync(asset.sourcePath),
        });
      }
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = request.url?.split("?")[0];
        const asset = assets.find((entry) => path === `/${entry.fileName}`);
        if (!asset) return next();
        try {
          response.setHeader(
            "Content-Type",
            `${asset.contentType}; charset=utf-8`,
          );
          response.end(readFileSync(asset.sourcePath));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), checklistFormatAssets()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
