// Schemas de shape de reportes de hito, reusados por client/ y server/.
import { z } from "zod";
import { addressSchema, bytes32Schema } from "./common.schema";

// El texto del reporte viaja como campo de formulario multipart; los archivos como
// adjuntos. Este schema valida el campo de texto.
export const createReportBodySchema = z.object({
  text: z.string().default(""),
});
export type CreateReportBody = z.infer<typeof createReportBodySchema>;

export const createReportResponseSchema = z.object({
  reportId: z.number().int(),
  reportUrl: z.string().url(),
  reportHash: bytes32Schema,
});
export type CreateReportResponse = z.infer<typeof createReportResponseSchema>;

export const reportResponseSchema = z.object({
  id: z.number().int().optional(),
  projectAddress: addressSchema,
  milestoneIndex: z.number().int(),
  text: z.string(),
  mediaUrls: z.array(z.string()),
  documentUrls: z.array(z.string()),
  reportHash: z.string(),
  // CID del manifest en IPFS (null con storage local). Permite ver/recuperar el reporte
  // directo desde un gateway aunque el frontend este caido.
  cid: z.string().nullable(),
  // URL del manifest en el gateway configurado (el mismo que sirve las imagenes/docs).
  // Null con storage local. Se usa para el link "Ver en IPFS".
  manifestUrl: z.string().nullable(),
  // Verificacion del hash on-chain vs. contenido almacenado (null si aun no se observo
  // la declaracion on-chain).
  onChainHash: z.string().nullable(),
  hashMatch: z.boolean().nullable(),
});
export type ReportResponse = z.infer<typeof reportResponseSchema>;

export const reportVerificationSchema = z.object({
  computedHash: z.string(),
  onChainHash: z.string().nullable(),
  hashMatch: z.boolean().nullable(),
});
export type ReportVerification = z.infer<typeof reportVerificationSchema>;
