import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "path";

export default defineConfig({
  tanstackStart: {
    server: { 
      entry: "src/server.ts" 
    },
    client: {
      entry: "src/start.ts"
    },
    preset: "cloudflare-pages"
  },
  vite: {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    ssr: {
      noExternal: ["@radix-ui/*", "lucide-react"],
    },
    build: {
      minify: true,
    }
  }
});
