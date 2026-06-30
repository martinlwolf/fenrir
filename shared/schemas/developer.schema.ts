// Schemas de shape de developer/reputacion, reusados por client/ y server/.
import { z } from "zod";
import { CERTIFICATE_TYPE } from "../constants/enums";
import { addressSchema, paginationQuerySchema } from "./common.schema";

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

// --- Directorio de developers (listado ordenable / filtrable por su historico) ---

// Criterios de orden del directorio. `completed`/`failed` ordenan por cantidad de certificados
// de finalizacion / proyecto fallido; `razonSocial` alfabetico.
export const DEVELOPER_SORT = ["completed", "failed", "razonSocial"] as const;
export type DeveloperSort = (typeof DEVELOPER_SORT)[number];

// Filtro por historico: solo con proyectos completados, solo con fallidos, o todos.
export const DEVELOPER_FILTER = ["all", "withCompleted", "withFailed"] as const;
export type DeveloperFilter = (typeof DEVELOPER_FILTER)[number];

export const developerListQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(DEVELOPER_SORT).default("completed"),
  order: z.enum(["asc", "desc"]).default("desc"),
  filter: z.enum(DEVELOPER_FILTER).default("all"),
});
export type DeveloperListQuery = z.infer<typeof developerListQuerySchema>;

// Una fila del directorio: identidad + conteo de su historico de reputacion.
export const developerListItemSchema = z.object({
  wallet: addressSchema,
  razonSocial: z.string(),
  cuit: z.string(),
  completed: z.number().int(),
  failed: z.number().int(),
});
export type DeveloperListItem = z.infer<typeof developerListItemSchema>;

export const developerListResponseSchema = z.object({
  items: z.array(developerListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type DeveloperListResponse = z.infer<typeof developerListResponseSchema>;
