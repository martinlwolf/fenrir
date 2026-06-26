// Lectura centralizada de las variables de entorno del frontend (constitution Principio
// V: env desde .env, nunca hardcode). Un unico modulo las expone tipadas.

function required(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) {
    // En dev avisamos fuerte; en runtime las acciones que dependan de ella fallaran claro.
    console.warn(`[env] Falta la variable ${name}`);
  }
  return value ?? "";
}

export const env = {
  apiUrl: required("VITE_API_URL"),
  sepoliaChainId: Number(import.meta.env.VITE_SEPOLIA_CHAIN_ID ?? "11155111"),
  factoryAddress: required("VITE_FENRIR_FACTORY_ADDRESS"),
  useMock: (import.meta.env.VITE_USE_MOCK ?? "false") === "true",
} as const;
