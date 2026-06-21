// Schemas Zod internos del server (no compartidos con el frontend) para validar
// params/query de las rutas.
import { z } from "zod";
import { addressSchema } from "@shared/schemas/common.schema";

export const addressParamSchema = z.object({
  address: addressSchema,
});

export const walletParamSchema = z.object({
  wallet: addressSchema,
});

export const milestoneParamsSchema = z.object({
  address: addressSchema,
  index: z.coerce.number().int().min(0),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().min(1),
});

export const proposalParamsSchema = z.object({
  address: addressSchema,
  proposalId: z.coerce.number().int().min(1),
});
