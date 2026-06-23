// Schemas de shape de autenticacion por wallet, reusados por client/ y server/.
import { z } from "zod";
import { addressSchema } from "./common.schema";

export const nonceRequestSchema = z.object({
  wallet: addressSchema,
});
export type NonceRequest = z.infer<typeof nonceRequestSchema>;

export const nonceResponseSchema = z.object({
  nonce: z.string(),
  message: z.string(),
});
export type NonceResponse = z.infer<typeof nonceResponseSchema>;

export const verifyRequestSchema = z.object({
  wallet: addressSchema,
  signature: z.string().min(1),
});
export type VerifyRequest = z.infer<typeof verifyRequestSchema>;

export const verifyResponseSchema = z.object({
  wallet: addressSchema,
  valid: z.boolean(),
});
export type VerifyResponse = z.infer<typeof verifyResponseSchema>;
