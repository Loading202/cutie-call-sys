import { defineConfig } from "@tanstack/react-start/config";

export default defineConfig({
  server: {
    preset: "cloudflare-pages",
  },
  vite: {
    resolve: {
      alias: {
        "@": "/opt/buildhome/repo/src",
      },
    },
  },
});
