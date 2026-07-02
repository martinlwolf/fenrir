// Zod schemas de shape compartidos por client/ y server/. SOLO validacion de
// formato (la unica permitida en el frontend, constitution Principio II). Nunca
// reglas de negocio.
import { z } from "zod";
import { DISPLAY_VARIANT } from "../constants/enums";

// Direccion EVM (0x + 40 hex). Se normaliza a lowercase para consistencia del espejo.
export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Direccion EVM invalida")
  .transform((v) => v.toLowerCase());

// Hash de 32 bytes (0x + 64 hex), p.ej. el reportHash on-chain.
export const bytes32Schema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Hash bytes32 invalido");

// Monto en wei como string decimal (entero no negativo). Nunca number.
export const weiStringSchema = z
  .string()
  .regex(/^\d+$/, "Monto en wei invalido (entero decimal en string)");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

// Etiqueta de estado lista para renderizar: el backend elige texto + variante y el
// frontend solo pinta. Es el shape del "display" que viaja embebido en los DTOs.
export const displaySchema = z.object({
  label: z.string(),
  variant: z.enum(DISPLAY_VARIANT),
});
export type Display = z.infer<typeof displaySchema>;

// Permiso de una accion para el viewer que consulta: `allowed` mas un `reason` opcional
// (por que no se puede). El backend decide; el frontend solo habilita/deshabilita la UI.
export const capabilitySchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
});
export type Capability = z.infer<typeof capabilitySchema>;
