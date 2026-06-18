import { defineConfig } from "@tanstack/react-start/config";
import { fileURLToPath } from "url";
import path from "path";

export default defineConfig({
  server: {
    preset: "cloudflare-pages",
  },
  vite: {
    resolve: {
      alias: {
        "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./src"),
      },
    },
  },
});
