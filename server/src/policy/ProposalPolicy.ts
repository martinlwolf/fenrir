// Funciones puras de derivacion de estados y capabilities para propuestas de gobernanza.
// Centraliza la logica que antes vivia en el frontend (VotePanel.tsx:52-58, VoteProgress.tsx:40-57).
// No consulta repos ni decide nada on-chain: recibe valores primitivos y deriva sobre el espejo
// (FR-020). No importa el model Proposal para no crear acoplamiento a persistence.
import type { Capability, Display } from "@shared/schemas/common.schema";
import type { ProjectStatusValue, ProposalStatusValue } from "@shared/constants/enums";
import { proposalDisplay } from "./display";
import type { ViewerContext } from "./Viewer";

// Input minimo de una propuesta en valores primitivos. No depende del model Proposal.
export interface ProposalPolicyInput {
  status: ProposalStatusValue;
  deadline: Date;
  votesFor: bigint;
  votesAgainst: bigint;
  weightVoted: bigint;
  totalPowerAtSnapshot: bigint;
  quorumBps: number;
  approvalThresholdBps: number;
  quorumReached: boolean;
}

// Resultado de la derivacion: todos los campos calculados de una sola vez.
export interface ProposalDerived {
  active: boolean;
  expired: boolean;
  canResolve: boolean;
  awaitingArbiter: boolean;
  display: Display;
  lead: "none" | "for" | "against" | "tie";
  passing: boolean;
  /** En bigint para que el service formatee a string wei */
  quorumRemainingWei: bigint;
}

/**
 * Calcula todos los estados derivados de una propuesta en una sola pasada.
 * @param p             - Datos escalares de la propuesta (no el model).
 * @param projectStatus - Estado actual del proyecto dueño de la propuesta. Una propuesta
 *                        puede seguir "Active" en el espejo (nadie llamo resolve() todavia)
 *                        aun despues de que el proyecto se cancelo o se completo: el gobierno
 *                        del FenrirGovernor no se entera de la cancelacion (no hay
 *                        acoplamiento on-chain entre ambos contratos), asi que sin este chequeo
 *                        el front seguia mostrando "votar"/"finalizar" sobre un proyecto muerto.
 * @param now           - Momento de referencia para expirar; por defecto `new Date()`.
 */
export function proposalDerived(
  p: ProposalPolicyInput,
  projectStatus: ProjectStatusValue,
  now: Date = new Date(),
): ProposalDerived {
  const projectClosed = projectStatus === "Cancelled" || projectStatus === "Completed";
  const active = p.status === "Active" && !projectClosed;
  const expired = p.deadline < now;
  const canResolve = active && expired;
  const awaitingArbiter = p.status === "AwaitingArbiter" && !projectClosed;

  // Hacia donde se inclina la balanza.
  const voted = p.votesFor + p.votesAgainst;
  const lead: ProposalDerived["lead"] =
    voted === 0n
      ? "none"
      : p.votesFor > p.votesAgainst
        ? "for"
        : p.votesAgainst > p.votesFor
          ? "against"
          : "tie";

  // Si con los votos actuales aprobaría: porcentaje a favor >= umbral y quorum alcanzado.
  const forBps = voted > 0n ? Number((p.votesFor * 10000n) / voted) : 0;
  const passing = forBps >= p.approvalThresholdBps && p.quorumReached;

  // Poder de voto que falta para alcanzar quorum ("0" si ya se alcanzo).
  const quorumTarget = (p.totalPowerAtSnapshot * BigInt(p.quorumBps)) / 10000n;
  const quorumRemainingWei = quorumTarget > p.weightVoted ? quorumTarget - p.weightVoted : 0n;

  const display = proposalDisplay({ active, expired, awaitingArbiter, projectClosed });

  return { active, expired, canResolve, awaitingArbiter, display, lead, passing, quorumRemainingWei };
}

// Capabilities del viewer para una propuesta ya derivada.
export function proposalCapabilities(
  derived: ProposalDerived,
  viewer: ViewerContext,
): { canBreakTie: Capability } {
  if (!derived.awaitingArbiter) {
    return {
      canBreakTie: { allowed: false, reason: "La propuesta no está esperando desempate" },
    };
  }
  if (!viewer.isArbiter) {
    return {
      canBreakTie: { allowed: false, reason: "Solo el árbitro puede desempatar" },
    };
  }
  return { canBreakTie: { allowed: true } };
}
