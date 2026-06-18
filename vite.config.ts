import { defineConfig } from "vite";
import { tanstackBuildConfig } from "@tanstack/react-start/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    tanstackBuildConfig({
      server: {
        entry: "./src/server.ts",
      },
      client: {
        entry: "./src/start.ts",
      },
      preset: "cloudflare-pages",
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  ssr: {
    noExternal: ["@radix-ui/*", "lucide-react"],
  },
});
