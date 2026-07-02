// Objeto de negocio Proyecto (espejo). Sostiene el estado reflejado y produce los
// DTOs de respuesta (resumen y detalle). No decide transiciones: refleja el estado
// que los eventos on-chain comunican (FR-020).
import type { ProjectStatusValue, ProjectTypeValue, VotingModeValue } from "@shared/constants/enums";
import type {
  ProjectDetailResponse,
  ProjectResponse,
} from "@shared/schemas/project.schema";
import type { Milestone, MilestoneResponseBase } from "./Milestone";

// Campos del DTO que NO produce el model: los deriva/compone el ProjectService por wallet
// consultante (fondeo, display, viewer). El model se mantiene puro (FR-020) y devuelve el
// resto; el service completa estos antes de responder.
type ProjectResponseBase = Omit<
  ProjectResponse,
  "fundedBps" | "fundingOpen" | "display" | "viewer"
>;
// El detalle base tampoco lleva los bloques derivados: los hitos van en su forma base (sin
// display/estados/capabilities) y el bloque `maintenance` lo compone el service.
type ProjectDetailResponseBase = Omit<
  ProjectDetailResponse,
  "fundedBps" | "fundingOpen" | "display" | "viewer" | "milestones" | "maintenance"
> & {
  milestones: MilestoneResponseBase[];
};

export interface ProjectProps {
  address: string;
  tokenAddress: string;
  tokenName: string | null;
  tokenSymbol: string | null;
  // Razon social del developer, traida por join al espejar. Identifica al responsable del
  // proyecto en la UI sin un fetch extra.
  developerRazonSocial: string | null;
  // Inversores distintos del proyecto. Lo compone el ProjectService (no es estado del modelo);
  // 0 por defecto cuando no se calculo.
  investorCount?: number;
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

  // Getters de lectura para que el service derive fondeo/viewer sin exponer `props` ni
  // duplicar el shape. No mutan nada: el model sigue siendo puro (FR-020).
  get developerWallet(): string {
    return this.props.developerWallet;
  }

  get currentArbiter(): string | null {
    return this.props.currentArbiter;
  }

  get ff(): bigint {
    return this.props.ff;
  }

  get totalRaised(): bigint {
    return this.props.totalRaised;
  }

  get fundingDeadline(): Date {
    return this.props.fundingDeadline;
  }

  get fmpa(): bigint {
    return this.props.fmpa;
  }

  get currentMilestoneIndex(): number {
    return this.props.currentMilestoneIndex;
  }

  toResponse(): ProjectResponseBase {
    const p = this.props;
    return {
      address: p.address,
      tokenAddress: p.tokenAddress,
      tokenName: p.tokenName,
      tokenSymbol: p.tokenSymbol,
      developerRazonSocial: p.developerRazonSocial,
      investorCount: p.investorCount ?? 0,
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

  toDetailResponse(): ProjectDetailResponseBase {
    return {
      ...this.toResponse(),
      milestones: this.milestones.map((m) => m.toResponse()),
    };
  }
}
