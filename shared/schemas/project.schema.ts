// Schemas de shape de proyectos/hitos, reusados por client/ y server/. Solo formato.
import { z } from "zod";
import {
  MILESTONE_STATUS,
  PROJECT_STATUS,
  PROJECT_TYPE,
  VIEWER_ROLE,
  VOTING_MODE,
} from "../constants/enums";
import {
  addressSchema,
  capabilitySchema,
  displaySchema,
  paginationQuerySchema,
  weiStringSchema,
} from "./common.schema";

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
  // Estados derivados del hito (FR-020: los calcula el backend sobre el espejo, sin columnas
  // nuevas). Espejan la logica que antes vivia en client/.../MilestoneList.tsx. Siempre poblados.
  // Etiqueta lista para renderizar (label + variante); el front solo pinta.
  display: displaySchema,
  // Declarado pero la votacion no abrio: totalRaised < presupuesto acumulado hasta este hito.
  pausedForFunds: z.boolean(),
  // Plazo de votacion vencido pero la propuesta sigue Active (aun sin resolver on-chain).
  votingExpired: z.boolean(),
  // Rechazado en ventana de reintento cuyo plazo (2 min) ya paso.
  retryExpired: z.boolean(),
  // Estructural (sin considerar quien consulta): el hito esta en condiciones de declararse.
  declarable: z.boolean(),
  // Presupuesto acumulado hasta este hito inclusive (suma de budgets con indice <=).
  cumulativeBudget: weiStringSchema,
  // Cuanto falta recaudar para abrir la votacion de este hito ("0" si no aplica).
  fundsShortfall: weiStringSchema,
  // Capabilities del viewer sobre el hito: el backend decide, el front habilita/deshabilita.
  viewer: z.object({ canDeclare: capabilitySchema }),
});
export type MilestoneResponse = z.infer<typeof milestoneResponseSchema>;

// Permisos del viewer para las acciones a nivel proyecto. El backend decide `allowed` +
// `reason`; el frontend solo habilita/deshabilita la UI (nunca reimplementa la regla).
export const projectCapabilitiesSchema = z.object({
  invest: capabilitySchema,
  claimCommission: capabilitySchema,
  // Si se puede llamar executeSale(): proyecto en Selling con al menos una oferta Approved.
  canExecuteSale: capabilitySchema,
});
export type ProjectCapabilities = z.infer<typeof projectCapabilitiesSchema>;

// Contexto del viewer (la wallet que consulta) frente al proyecto: su rol derivado, las
// relaciones que mantiene y sus capabilities. Viaja embebido por wallet en cada DTO de
// proyecto; deriva del espejo (FR-020), no otorga permisos on-chain.
export const projectViewerSchema = z.object({
  role: z.enum(VIEWER_ROLE),
  isDeveloper: z.boolean(),
  isArbiter: z.boolean(),
  isInvestor: z.boolean(),
  capabilities: projectCapabilitiesSchema,
});
export type ProjectViewer = z.infer<typeof projectViewerSchema>;

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
  // Estado de fondeo derivado (no columnas nuevas; el backend lo calcula, FR-020).
  // Porcentaje recaudado sobre el objetivo (FF) en basis points, 0..10000.
  fundedBps: z.number().int(),
  // True mientras la ronda de inversion sigue abierta (derivado de status/deadline/montos).
  fundingOpen: z.boolean(),
  // Etiqueta de estado lista para renderizar (label + variante); el front solo pinta.
  display: displaySchema,
  // Contexto del viewer embebido: se puebla siempre (anonimo si no hay wallet consultante).
  viewer: projectViewerSchema,
});
export type ProjectResponse = z.infer<typeof projectResponseSchema>;

export const projectDetailResponseSchema = projectResponseSchema.extend({
  milestones: z.array(milestoneResponseSchema),
  // Estado de mantenimiento derivado (casos borde que destraban el proyecto). Espeja la
  // logica de client/.../MaintenancePanel.tsx. Solo en el detalle (la lista no lo lleva).
  maintenance: z.object({
    // Fondeo vencido sin alcanzar el FMPA: cancelable para habilitar reembolso total.
    fundingExpired: z.boolean(),
    // Hito vigente estancado (vencido sin (re)declarar, o declarado sin fondos para votar).
    stalled: z.object({ active: z.boolean(), reason: z.string().nullable() }),
    // Capability del viewer para cancelar el proyecto estancado (solo inversor con FDT).
    canCancelStalled: capabilitySchema,
  }),
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
