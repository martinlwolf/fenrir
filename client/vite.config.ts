import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// El alias @shared/* ya esta en tsconfig.json; lo replicamos para el bundler.
// @/* apunta a client/src para los imports de shadcn/ui.
export default defineConfig({
  plugins: [react()],
  // Las env vars (incluidas las VITE_*) viven en el .env de la raiz del repo, no en client/.
  // Asi hay una unica fuente de verdad compartida con el backend.
  envDir: path.resolve(__dirname, ".."),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
