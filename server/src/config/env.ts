// Lectura y validacion de variables de entorno con Zod (fail-fast). Ninguna otra
// parte del codigo lee process.env directamente (constitution Principio V).
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL requerida"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL requerida"),

  SEPOLIA_RPC_URL: z.string().url("SEPOLIA_RPC_URL debe ser una URL valida"),
  SEPOLIA_CHAIN_ID: z.coerce.number().int().positive().default(11155111),
  FENRIR_FACTORY_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "FENRIR_FACTORY_ADDRESS invalida"),
  INGESTION_START_BLOCK: z.coerce.number().int().min(0).default(0),
  INGESTION_CONFIRMATIONS: z.coerce.number().int().min(0).default(5),
  INGESTION_BACKFILL_BATCH: z.coerce.number().int().positive().default(2000),

  REPORT_STORAGE_DRIVER: z.enum(["local"]).default("local"),
  REPORT_STORAGE_LOCAL_DIR: z.string().default("./.data/reports"),
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:4000"),

  AUTH_NONCE_TTL_MINUTES: z.coerce.number().int().positive().default(10),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    // Fail-fast: sin configuracion valida el backend no debe arrancar.
    throw new Error(`Variables de entorno invalidas:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();
