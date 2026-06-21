// Schemas de shape de developer/reputacion, reusados por client/ y server/.
import { z } from "zod";
import { CERTIFICATE_TYPE } from "../constants/enums";
import { addressSchema } from "./common.schema";

export const developerResponseSchema = z.object({
  wallet: addressSchema,
  razonSocial: z.string(),
  cuit: z.string(),
  verificationDocsUrl: z.string().nullable(),
});
export type DeveloperResponse = z.infer<typeof developerResponseSchema>;

export const certificateResponseSchema = z.object({
  type: z.enum(CERTIFICATE_TYPE),
  tokenId: z.number().int(),
  projectAddress: addressSchema,
  mintedAtBlock: z.string(),
});
export type CertificateResponse = z.infer<typeof certificateResponseSchema>;

export const reputationResponseSchema = z.object({
  wallet: addressSchema,
  completed: z.number().int(),
  failed: z.number().int(),
  certificates: z.array(certificateResponseSchema),
});
export type ReputationResponse = z.infer<typeof reputationResponseSchema>;
