// Objeto de negocio Proyecto (espejo). Sostiene el estado reflejado y produce los
// DTOs de respuesta (resumen y detalle). No decide transiciones: refleja el estado
// que los eventos on-chain comunican (FR-020).
import type { ProjectStatusValue, ProjectTypeValue, VotingModeValue } from "@shared/constants/enums";
import type {
  ProjectDetailResponse,
  ProjectResponse,
} from "@shared/schemas/project.schema";
import type { Milestone } from "./Milestone";

export interface ProjectProps {
  address: string;
  tokenAddress: string;
  governorAddress: string;
  developerWallet: string;
  projectType: ProjectTypeValue;
  votingMode: VotingModeValue;
  status: ProjectStatusValue;
  fmpa: bigint;
  ff: bigint;
  totalRaised: bigint;
  totalReleasedToDeveloper: bigint;
  estimatedSalePrice: bigint;
  salePrice: bigint | null;
  fundingDeadline: Date;
  penaltyAccumulatedBps: number;
  currentArbiter: string | null;
  currentMilestoneIndex: number;
}

export class Project {
  constructor(
    private readonly props: ProjectProps,
    public readonly milestones: Milestone[] = [],
  ) {}

  get address(): string {
    return this.props.address;
  }

  get status(): ProjectStatusValue {
    return this.props.status;
  }

  toResponse(): ProjectResponse {
    const p = this.props;
    return {
      address: p.address,
      tokenAddress: p.tokenAddress,
      governorAddress: p.governorAddress,
      developerWallet: p.developerWallet,
      projectType: p.projectType,
      votingMode: p.votingMode,
      status: p.status,
      fmpa: p.fmpa.toString(),
      ff: p.ff.toString(),
      totalRaised: p.totalRaised.toString(),
      totalReleasedToDeveloper: p.totalReleasedToDeveloper.toString(),
      estimatedSalePrice: p.estimatedSalePrice.toString(),
      salePrice: p.salePrice !== null ? p.salePrice.toString() : null,
      fundingDeadline: p.fundingDeadline.toISOString(),
      penaltyAccumulatedBps: p.penaltyAccumulatedBps,
      currentArbiter: p.currentArbiter,
      currentMilestoneIndex: p.currentMilestoneIndex,
    };
  }

  toDetailResponse(): ProjectDetailResponse {
    return {
      ...this.toResponse(),
      milestones: this.milestones.map((m) => m.toResponse()),
    };
  }
}
