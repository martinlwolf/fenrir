// Schemas de shape de venta y reparto, reusados por client/ y server/.
import { z } from "zod";
import { CLAIM_TYPE, OFFER_STATUS } from "../constants/enums";
import { addressSchema, displaySchema, weiStringSchema } from "./common.schema";

export const saleOfferResponseSchema = z.object({
  offerId: z.number().int(),
  buyerWallet: addressSchema,
  amount: weiStringSchema,
  proposalId: z.number().int().nullable(),
  status: z.enum(OFFER_STATUS),
  // Etiqueta lista para renderizar (label + variante); el front solo pinta.
  display: displaySchema,
  // True cuando la oferta esta en votacion y tiene proposalId valido. Reemplaza la logica de
  // OfferRow.tsx: el backend deriva, el frontend solo habilita/deshabilita la accion de voto.
  votable: z.boolean(),
  // Contexto del viewer frente a la oferta: usesDeveloperVote indica que el votante
  // usa castDeveloperSaleVote (true si es developer) vs castVote (inversor). El front
  // decide la funcion de voto sin conocer el rol directamente.
  viewer: z.object({ usesDeveloperVote: z.boolean() }),
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
