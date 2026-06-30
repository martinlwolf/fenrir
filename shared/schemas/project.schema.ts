// Schemas de shape de proyectos/hitos, reusados por client/ y server/. Solo formato.
import { z } from "zod";
import {
  MILESTONE_STATUS,
  PROJECT_STATUS,
  PROJECT_TYPE,
  VOTING_MODE,
} from "../constants/enums";
import { addressSchema, paginationQuerySchema, weiStringSchema } from "./common.schema";

// Query del catalogo: filtros opcionales por tipo, estado y developer + paginacion.
export const projectListQuerySchema = paginationQuerySchema.extend({
  type: z.enum(PROJECT_TYPE).optional(),
  status: z.enum(PROJECT_STATUS).optional(),
  developer: addressSchema.optional(),
});
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;

export const milestoneResponseSchema = z.object({
  milestoneIndex: z.number().int(),
  // Promesa inmutable de lo que el developer se compromete a entregar en este hito, fijada al
  // crear el proyecto. Es el patron contra el que el DAO vota si el hito se cumplio segun lo
  // pactado (a diferencia de reportHash/reportUrl, que son la prueba de cumplimiento que sube
  // el developer al declararlo). Se lee on-chain de Milestone.description.
  description: z.string(),
  budget: weiStringSchema,
  // Plazo del hito en segundos (string, como los montos). Se conoce desde la creacion;
  // `deadline` (fecha absoluta) recien aparece cuando el hito se activa.
  durationSeconds: z.string().nullable(),
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
  // Nombre y simbolo del FDT (elegidos por el developer al crear el proyecto): identificador
  // legible del proyecto en la UI. null si todavia no se espejaron desde on-chain.
  tokenName: z.string().nullable(),
  tokenSymbol: z.string().nullable(),
  // Razon social del developer responsable; null si aun no se espejo su identidad.
  developerRazonSocial: z.string().nullable(),
  // Inversores distintos del proyecto.
  investorCount: z.number().int(),
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
