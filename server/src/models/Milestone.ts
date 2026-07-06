// Objeto de negocio Hito. En el backend (espejo), su rol es sostener el estado
// reflejado del hito y producir su DTO de respuesta. Las transiciones de estado las
// decide el contrato; aca no se fuerzan (FR-020).
import type { MilestoneStatusValue } from "@shared/constants/enums";
import type { MilestoneResponse } from "@shared/schemas/project.schema";

// Campos del DTO que NO produce el model: los deriva la MilestonePolicy por wallet consultante
// (display, estados y capabilities del hito). El model se mantiene puro (FR-020) y devuelve el
// resto; el service completa estos antes de responder.
export type MilestoneResponseBase = Omit<
  MilestoneResponse,
  | "display"
  | "pausedForFunds"
  | "votingExpired"
  | "retryExpired"
  | "declarable"
  | "cumulativeBudget"
  | "fundsShortfall"
  | "viewer"
>;

export interface MilestoneProps {
  milestoneIndex: number;
  description: string;
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

  // Getters de lectura para que la policy derive estados/capabilities sin exponer `props` ni
  // duplicar el shape. No mutan nada: el model sigue siendo puro (FR-020).
  get status(): MilestoneStatusValue {
    return this.props.status;
  }

  get budget(): bigint {
    return this.props.budget;
  }

  get deadline(): Date | null {
    return this.props.deadline;
  }

  get retryCount(): number {
    return this.props.retryCount;
  }

  get proposalId(): number | null {
    return this.props.proposalId;
  }

  toResponse(): MilestoneResponseBase {
    const p = this.props;
    return {
      milestoneIndex: p.milestoneIndex,
      description: p.description ?? "",
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
