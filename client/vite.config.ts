import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// El alias @shared/* ya esta en tsconfig.json; lo replicamos para el bundler.
// @/* apunta a client/src para los imports de shadcn/ui.
export default defineConfig({
  plugins: [react()],
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
