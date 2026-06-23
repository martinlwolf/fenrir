// Schemas de shape de gobernanza, reusados por client/ y server/.
import { z } from "zod";
import {
  PROPOSAL_KIND,
  PROPOSAL_RESULT,
  PROPOSAL_STATUS,
} from "../constants/enums";
import { addressSchema, weiStringSchema } from "./common.schema";

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
});
export type ProposalResponse = z.infer<typeof proposalResponseSchema>;

export const votingPowerResponseSchema = z.object({
  wallet: addressSchema,
  proposalId: z.number().int(),
  snapshotBlock: z.string(),
  votingPower: weiStringSchema,
  hasVoted: z.boolean(),
});
export type VotingPowerResponse = z.infer<typeof votingPowerResponseSchema>;

export const arbiterResponseSchema = z.object({
  projectAddress: addressSchema,
  currentArbiter: addressSchema.nullable(),
  // Hay una eleccion de arbitro activa o esperando resolucion (vacancia/re-eleccion).
  electionInProgress: z.boolean(),
});
export type ArbiterResponse = z.infer<typeof arbiterResponseSchema>;
