import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// El alias @shared/* ya esta en tsconfig.json; lo replicamos para el bundler.
// @/* apunta a client/src para los imports de shadcn/ui.
export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, "..");
  // Carga todas las vars (sin filtro de prefijo) para poder re-exponer las vars
  // del backend al cliente sin duplicarlas en .env.
  const env = loadEnv(mode, envDir, "");

  return {
    plugins: [react()],
    // Las env vars viven en el .env de la raiz del repo, no en client/.
    // Asi hay una unica fuente de verdad compartida con el backend.
    envDir,
    define: {
      // Re-expone vars del backend como import.meta.env.VITE_* sin duplicar en .env.
      "import.meta.env.VITE_FENRIR_FACTORY_ADDRESS": JSON.stringify(
        env.FENRIR_FACTORY_ADDRESS
      ),
      "import.meta.env.VITE_SEPOLIA_CHAIN_ID": JSON.stringify(
        env.SEPOLIA_CHAIN_ID ?? "11155111"
      ),
    },
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
  };
});
