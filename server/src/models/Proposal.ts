// Objeto de negocio Propuesta (espejo de una propuesta del FenrirGovernor). Expone el
// estado reflejado y un par de ayudas de lectura (quorum alcanzado) que reproducen los
// parametros fijos del sistema (51%) SOLO para mostrarlos -- la decision de
// aprobar/rechazar la toma el contrato y llega via el campo result (FR-020).
import type {
  ProposalKindValue,
  ProposalResultValue,
  ProposalStatusValue,
} from "@shared/constants/enums";
import type { ProposalResponse } from "@shared/schemas/proposal.schema";

import { QUORUM_BPS, APPROVAL_THRESHOLD_BPS, BPS_DENOMINATOR as _BPS_DENOM } from "../config/constants";
export { QUORUM_BPS, APPROVAL_THRESHOLD_BPS };
const BPS_DENOMINATOR = BigInt(_BPS_DENOM);

export interface ProposalProps {
  governorProposalId: number;
  kind: ProposalKindValue;
  refId: number;
  snapshotBlock: bigint;
  totalPowerAtSnapshot: bigint;
  deadline: Date;
  extended: boolean;
  votesFor: bigint;
  votesAgainst: bigint;
  weightVoted: bigint;
  status: ProposalStatusValue;
  result: ProposalResultValue;
  electedArbiter: string | null;
}

export class Proposal {
  constructor(private readonly props: ProposalProps) {}

  // Getters de lectura para que la policy y el service accedan a los campos necesarios
  // sin exponer `props` ni pasar por toResponse(). No mutan nada (FR-020).
  get governorProposalId(): number {
    return this.props.governorProposalId;
  }

  get deadline(): Date {
    return this.props.deadline;
  }

  get status(): ProposalStatusValue {
    return this.props.status;
  }

  get votesFor(): bigint {
    return this.props.votesFor;
  }

  get votesAgainst(): bigint {
    return this.props.votesAgainst;
  }

  get weightVoted(): bigint {
    return this.props.weightVoted;
  }

  get totalPowerAtSnapshot(): bigint {
    return this.props.totalPowerAtSnapshot;
  }

  // Derivacion del quorum: true si el peso votado supera el umbral del 51% del total en snapshot.
  // Se expone como getter publico para que ProposalPolicy pueda usarlo sin duplicar la formula.
  get quorumReached(): boolean {
    const p = this.props;
    return (
      p.totalPowerAtSnapshot > 0n &&
      p.weightVoted * BPS_DENOMINATOR >= BigInt(QUORUM_BPS) * p.totalPowerAtSnapshot
    );
  }

  toResponse(): ProposalResponse {
    // toResponse() NO rellena los campos derivados de Fase 3 (active, expired, display, etc.):
    // esos los compone GovernanceService via proposalDerived() + proposalCapabilities(). El
    // model devuelve solo los campos que puede calcular sin necesitar el viewer ni el reloj
    // del server. El service completa el DTO antes de responder.
    const p = this.props;
    return {
      governorProposalId: p.governorProposalId,
      kind: p.kind,
      refId: p.refId,
      snapshotBlock: p.snapshotBlock.toString(),
      totalPowerAtSnapshot: p.totalPowerAtSnapshot.toString(),
      deadline: p.deadline.toISOString(),
      extended: p.extended,
      votesFor: p.votesFor.toString(),
      votesAgainst: p.votesAgainst.toString(),
      weightVoted: p.weightVoted.toString(),
      quorumBps: QUORUM_BPS,
      approvalThresholdBps: APPROVAL_THRESHOLD_BPS,
      quorumReached: this.quorumReached,
      status: p.status,
      result: p.result,
      electedArbiter: p.electedArbiter,
      // Campos derivados: el service los sobreescribe; aqui solo placeholders para satisfacer
      // el tipo antes de que el service los rellene con los valores reales.
      active: false,
      expired: false,
      canResolve: false,
      awaitingArbiter: false,
      display: { label: "", variant: "outline" as const },
      lead: "none" as const,
      passing: false,
      quorumRemainingWei: "0",
      viewer: { canBreakTie: { allowed: false } },
    };
  }
}
