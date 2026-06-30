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

  private quorumReached(): boolean {
    const p = this.props;
    return (
      p.totalPowerAtSnapshot > 0n &&
      p.weightVoted * BPS_DENOMINATOR >= BigInt(QUORUM_BPS) * p.totalPowerAtSnapshot
    );
  }

  toResponse(): ProposalResponse {
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
      quorumReached: this.quorumReached(),
      status: p.status,
      result: p.result,
      electedArbiter: p.electedArbiter,
    };
  }
}
