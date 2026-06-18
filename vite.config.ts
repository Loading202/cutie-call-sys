import { defineConfig } from "@lovable.dev/vite-tanstack-config";


export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    preset: "cloudflare-pages"
  },
  vite: {
    ssr: {
      // Opcional: dependendo de como as libs são carregadas
      noExternal: ["@radix-ui/*"], 
    },
    build: {
      // Deixe o Nitro cuidar do build, não force o Output Directory na Vercel
    }
  }
});
