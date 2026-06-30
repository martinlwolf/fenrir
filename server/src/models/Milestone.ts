// Objeto de negocio Hito. En el backend (espejo), su rol es sostener el estado
// reflejado del hito y producir su DTO de respuesta. Las transiciones de estado las
// decide el contrato; aca no se fuerzan (FR-020).
import type { MilestoneStatusValue } from "@shared/constants/enums";
import type { MilestoneResponse } from "@shared/schemas/project.schema";

export interface MilestoneProps {
  milestoneIndex: number;
  budget: bigint;
  durationSeconds: bigint | null;
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
      // `!= null` (no `!== null`) para cubrir tambien `undefined` (p.ej. Prisma Client
      // desactualizado o filas sin la columna): el schema admite null.
      durationSeconds: p.durationSeconds != null ? p.durationSeconds.toString() : null,
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
