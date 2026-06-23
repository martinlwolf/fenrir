// Schemas de shape de venta y reparto, reusados por client/ y server/.
import { z } from "zod";
import { CLAIM_TYPE, OFFER_STATUS } from "../constants/enums";
import { addressSchema, weiStringSchema } from "./common.schema";

export const saleOfferResponseSchema = z.object({
  offerId: z.number().int(),
  buyerWallet: addressSchema,
  amount: weiStringSchema,
  proposalId: z.number().int().nullable(),
  status: z.enum(OFFER_STATUS),
});
export type SaleOfferResponse = z.infer<typeof saleOfferResponseSchema>;

export const distributionShareSchema = z.object({
  investorWallet: addressSchema,
  fdtBalance: weiStringSchema,
  claimable: weiStringSchema,
});

export const distributionResponseSchema = z.object({
  projectAddress: addressSchema,
  salePrice: weiStringSchema.nullable(),
  distributionPool: weiStringSchema,
  shares: z.array(distributionShareSchema),
});
export type DistributionResponse = z.infer<typeof distributionResponseSchema>;

export const claimableItemSchema = z.object({
  projectAddress: addressSchema,
  type: z.enum(CLAIM_TYPE),
  amount: weiStringSchema,
});

export const claimableResponseSchema = z.object({
  wallet: addressSchema,
  items: z.array(claimableItemSchema),
});
export type ClaimableResponse = z.infer<typeof claimableResponseSchema>;
