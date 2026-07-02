// Schemas de shape de gobernanza, reusados por client/ y server/.
import { z } from "zod";
import {
  PROPOSAL_KIND,
  PROPOSAL_RESULT,
  PROPOSAL_STATUS,
} from "../constants/enums";
import { addressSchema, capabilitySchema, displaySchema, weiStringSchema } from "./common.schema";

export const proposalResponseSchema = z.object({
  governorProposalId: z.number().int(),
  kind: z.enum(PROPOSAL_KIND),
  refId: z.number().int(),
  snapshotBlock: z.string(),
  totalPowerAtSnapshot: weiStringSchema,
  deadline: z.string().datetime(),
  extended: z.boolean(),
  votesFor: weiStringSchema,
  votesAgainst: weiStringSchema,
  weightVoted: weiStringSchema,
  // Quorum/umbral fijos del sistema (51%): se exponen como ayuda de lectura, no como
  // decision -- el contrato es quien los aplica.
  quorumBps: z.number().int(),
  approvalThresholdBps: z.number().int(),
  quorumReached: z.boolean(),
  status: z.enum(PROPOSAL_STATUS),
  result: z.enum(PROPOSAL_RESULT),
  electedArbiter: addressSchema.nullable(),
  // ── Campos derivados (backend-driven, FR-020) ──────────────────────────────
  // El service los puebla siempre; el frontend los consume sin recalcular.
  /** true si status === "Active" */
  active: z.boolean(),
  /** true si deadline < now (server-time) */
  expired: z.boolean(),
  /** true si active && expired: cualquiera puede cerrar la propuesta */
  canResolve: z.boolean(),
  /** true si status === "AwaitingArbiter": necesita desempate del arbitro */
  awaitingArbiter: z.boolean(),
  /** Label + variante lista para renderizar en el badge de estado */
  display: displaySchema,
  /** Hacia donde se inclina la balanza segun los votos actuales */
  lead: z.enum(["none", "for", "against", "tie"]),
  /** Si con los votos actuales aprobaría (forPct >= thresholdPct && quorumReached) */
  passing: z.boolean(),
  /** Poder de voto que falta para alcanzar quorum ("0" si ya alcanzado) */
  quorumRemainingWei: weiStringSchema,
  /** Capabilities del viewer para esta propuesta */
  viewer: z.object({
    canBreakTie: capabilitySchema,
  }),
});
export type ProposalResponse = z.infer<typeof proposalResponseSchema>;

export const votingPowerResponseSchema = z.object({
  wallet: addressSchema,
  proposalId: z.number().int(),
  snapshotBlock: z.string(),
  votingPower: weiStringSchema,
  hasVoted: z.boolean(),
  /** true si esta wallet puede emitir su voto: tiene poder, no voto y la propuesta sigue activa */
  canVote: z.boolean(),
});
export type VotingPowerResponse = z.infer<typeof votingPowerResponseSchema>;

export const arbiterResponseSchema = z.object({
  projectAddress: addressSchema,
  currentArbiter: addressSchema.nullable(),
  // Hay una eleccion de arbitro activa o esperando resolucion (vacancia/re-eleccion).
  electionInProgress: z.boolean(),
  /** true si hay que llamar openArbiterElection(): Building, sin arbitro y sin eleccion en curso */
  needsOpening: z.boolean(),
});
export type ArbiterResponse = z.infer<typeof arbiterResponseSchema>;
