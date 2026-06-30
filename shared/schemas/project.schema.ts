// Schemas de shape de proyectos/hitos, reusados por client/ y server/. Solo formato.
import { z } from "zod";
import {
  MILESTONE_STATUS,
  PROJECT_STATUS,
  PROJECT_TYPE,
  VOTING_MODE,
} from "../constants/enums";
import { addressSchema, paginationQuerySchema, weiStringSchema } from "./common.schema";

// Query del catalogo: filtros opcionales por tipo y estado + paginacion.
export const projectListQuerySchema = paginationQuerySchema.extend({
  type: z.enum(PROJECT_TYPE).optional(),
  status: z.enum(PROJECT_STATUS).optional(),
});
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;

export const milestoneResponseSchema = z.object({
  milestoneIndex: z.number().int(),
  budget: weiStringSchema,
  deadline: z.string().datetime().nullable(),
  status: z.enum(MILESTONE_STATUS),
  retryCount: z.number().int(),
  trancheReleased: z.boolean(),
  reportHash: z.string().nullable(),
  reportUrl: z.string().nullable(),
  proposalId: z.number().int().nullable(),
});
export type MilestoneResponse = z.infer<typeof milestoneResponseSchema>;

export const projectResponseSchema = z.object({
  address: addressSchema,
  tokenAddress: addressSchema,
  governorAddress: addressSchema,
  developerWallet: addressSchema,
  projectType: z.enum(PROJECT_TYPE),
  votingMode: z.enum(VOTING_MODE),
  status: z.enum(PROJECT_STATUS),
  fmpa: weiStringSchema,
  ff: weiStringSchema,
  totalRaised: weiStringSchema,
  totalReleasedToDeveloper: weiStringSchema,
  estimatedSalePrice: weiStringSchema,
  salePrice: weiStringSchema.nullable(),
  fundingDeadline: z.string().datetime(),
  penaltyAccumulatedBps: z.number().int(),
  currentArbiter: addressSchema.nullable(),
  currentMilestoneIndex: z.number().int(),
});
export type ProjectResponse = z.infer<typeof projectResponseSchema>;

export const projectDetailResponseSchema = projectResponseSchema.extend({
  milestones: z.array(milestoneResponseSchema),
});
export type ProjectDetailResponse = z.infer<typeof projectDetailResponseSchema>;

export const investmentResponseSchema = z.object({
  projectAddress: addressSchema,
  investorWallet: addressSchema,
  amount: weiStringSchema,
  txHash: z.string(),
  block: z.string(),
});
export type InvestmentResponse = z.infer<typeof investmentResponseSchema>;

// Wallets distintas que invirtieron en un proyecto. Son los candidatos validos al rol
// de arbitro (hito 0): cualquier inversor del proyecto (business_rules/ciclo-de-hitos.md).
export const projectInvestorsResponseSchema = z.array(addressSchema);
export type ProjectInvestorsResponse = z.infer<typeof projectInvestorsResponseSchema>;
