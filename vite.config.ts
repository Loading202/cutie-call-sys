import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
