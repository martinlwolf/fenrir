// Objeto de negocio Hito. En el backend (espejo), su rol es sostener el estado
// reflejado del hito y producir su DTO de respuesta. Las transiciones de estado las
// decide el contrato; aca no se fuerzan (FR-020).
import type { MilestoneStatusValue } from "@shared/constants/enums";
import type { MilestoneResponse } from "@shared/schemas/project.schema";

export interface MilestoneProps {
  milestoneIndex: number;
  budget: bigint;
  deadline: Date | null;
  status: MilestoneStatusValue;
  retryCount: number;
  trancheReleased: boolean;
  reportHash: string | null;
  reportUrl: string | null;
  proposalId: number | null;
}

export class Milestone {
  constructor(private readonly props: MilestoneProps) {}

  get milestoneIndex(): number {
    return this.props.milestoneIndex;
  }

  toResponse(): MilestoneResponse {
    const p = this.props;
    return {
      milestoneIndex: p.milestoneIndex,
      budget: p.budget.toString(),
      deadline: p.deadline ? p.deadline.toISOString() : null,
      status: p.status,
      retryCount: p.retryCount,
      trancheReleased: p.trancheReleased,
      reportHash: p.reportHash,
      reportUrl: p.reportUrl,
      proposalId: p.proposalId,
    };
  }
}
