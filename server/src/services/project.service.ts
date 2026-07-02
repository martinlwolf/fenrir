// Servicio de lectura de proyectos. Orquesta repositorios y devuelve DTOs ya formateados,
// enriquecidos por wallet consultante (fondeo derivado, display y capabilities del viewer).
import type {
  MilestoneResponse,
  ProjectDetailResponse,
  ProjectListQuery,
  ProjectResponse,
  ProjectViewer,
} from "@shared/schemas/project.schema";
import type { Paginated } from "@shared/types/api";
import { NotFoundException } from "../exceptions/common.exception";
import { ProjectRepository, projectRepository } from "../persistence/repositories/project.repository";
import { InvestmentRepository, investmentRepository } from "../persistence/repositories/investment.repository";
import { ProposalRepository, proposalRepository } from "../persistence/repositories/proposal.repository";
import { SaleOfferRepository, saleOfferRepository } from "../persistence/repositories/saleOffer.repository";
import { projectDisplay } from "../policy/display";
import { fundedBps, fundingOpen, projectCapabilities } from "../policy/ProjectPolicy";
import {
  enrichMilestones,
  projectMaintenance,
  type MilestoneInput,
  type MilestoneProjectInput,
} from "../policy/MilestonePolicy";
import { buildViewer, type InvestorLookup, type ViewerContext } from "../policy/Viewer";
import type { SaleContext } from "../policy/ProjectPolicy";
import type { Project } from "../models/Project";
import type { Milestone } from "../models/Milestone";

// Bloques derivados que el service agrega a toResponse()/toDetailResponse() por wallet
// consultante. Son exactamente los campos nuevos de projectResponseSchema (FR-020: todo
// derivado, sin columnas nuevas).
type ProjectEnrichment = Pick<
  ProjectResponse,
  "fundedBps" | "fundingOpen" | "display" | "viewer"
>;

export class ProjectService {
  constructor(
    private readonly projects: ProjectRepository = projectRepository,
    private readonly investments: InvestmentRepository = investmentRepository,
    private readonly proposals: ProposalRepository = proposalRepository,
    private readonly offers: SaleOfferRepository = saleOfferRepository,
  ) { }

  async list(
    query: ProjectListQuery,
    viewerWallet: string | null,
  ): Promise<Paginated<ProjectResponse>> {
    const { items, total } = await this.projects.list({
      type: query.type,
      status: query.status,
      developer: query.developer,
      page: query.page,
      pageSize: query.pageSize,
    });
    return {
      items: await this.toResponses(items, viewerWallet),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  // Vista de comprador: solo proyectos en etapa de venta (FR-004, SC-003).
  async listBuyerView(
    page: number,
    pageSize: number,
    viewerWallet: string | null,
  ): Promise<Paginated<ProjectResponse>> {
    const { items, total } = await this.projects.listSelling(page, pageSize);
    return {
      items: await this.toResponses(items, viewerWallet),
      page,
      pageSize,
      total,
    };
  }

  async getDetail(
    address: string,
    viewerWallet: string | null,
  ): Promise<ProjectDetailResponse> {
    const project = await this.projects.findByAddress(address);
    if (!project) throw new NotFoundException("Project not found");
    const counts = await this.investments.countDistinctInvestorsByProjects([address]);
    // Un solo proyecto: el hasInvested directo (una query) esta bien; no precomputamos set.
    const viewer = await this.buildViewerFor(project, viewerWallet);
    // En el detalle cargamos si hay oferta aprobada para derivar canExecuteSale correctamente.
    const hasApprovedOffer = await this.offers.hasApprovedOffer(address);
    const enrichment = this.enrich(project, viewer, { hasApprovedOffer });

    // Estados derivados de los hitos (display, pausado por fondos, votacion vencida, etc.) y
    // bloque de mantenimiento del proyecto: espejan client/.../MilestoneList + MaintenancePanel.
    const deadlines = await this.proposalDeadlines(address);
    const projectInput = this.toMilestoneProjectInput(project);
    const milestoneInputs = project.milestones.map((m) => this.toMilestoneInput(m));
    const extras = enrichMilestones(projectInput, milestoneInputs, deadlines, viewer);
    const base = project.toDetailResponse();
    const milestones = base.milestones.map((m, i) => ({ ...m, ...extras[i] }));
    const maintenance = projectMaintenance(projectInput, milestoneInputs, viewer);

    return {
      ...base,
      milestones,
      maintenance,
      investorCount: counts.get(address.toLowerCase()) ?? 0,
      ...enrichment,
    };
  }

  // Mapea un lote de proyectos a respuestas enriquecidas: investorCount + bloques derivados.
  // Optimizacion de la lista: en vez de una query hasInvested por item, precomputamos UNA
  // sola vez el set de proyectos donde invirtio el viewer (listProjectsByInvestor) y lo
  // inyectamos como `isInvestor` ya resuelto a enrich(). Asi la derivacion del rol/viewer no
  // dispara N queries.
  private async toResponses(
    items: Project[],
    viewerWallet: string | null,
  ): Promise<ProjectResponse[]> {
    const counts = await this.investments.countDistinctInvestorsByProjects(
      items.map((p) => p.address),
    );
    const investedIn =
      viewerWallet != null
        ? new Set(await this.investments.listProjectsByInvestor(viewerWallet))
        : null;

    return Promise.all(
      items.map(async (project) => {
        const isInvestor = investedIn?.has(project.address.toLowerCase()) ?? false;
        const viewer = await this.buildViewerFor(project, viewerWallet, isInvestor);
        const enrichment = this.enrich(project, viewer);
        return {
          ...project.toResponse(),
          investorCount: counts.get(project.address) ?? 0,
          ...enrichment,
        };
      }),
    );
  }

  // Construye el ViewerContext del proyecto para la wallet consultante. `isInvestor` opcional:
  // si viene resuelto (caso lista, ya precomputado), se inyecta en memoria y buildViewer no
  // consulta el repo; si no, buildViewer hace el hasInvested directo (caso detalle, un solo
  // proyecto). Se expone separado de enrich() para reusar el mismo viewer en la derivacion de
  // hitos y del bloque de mantenimiento.
  private async buildViewerFor(
    project: Project,
    viewerWallet: string | null,
    isInvestor?: boolean,
  ): Promise<ViewerContext> {
    const deps =
      isInvestor === undefined
        ? undefined
        : { investments: { hasInvested: async () => isInvestor } satisfies InvestorLookup };

    return buildViewer(
      {
        address: project.address,
        developerWallet: project.developerWallet,
        currentArbiter: project.currentArbiter,
        status: project.status,
      },
      viewerWallet,
      deps,
    );
  }

  // Deriva los bloques que viajan embebidos por wallet consultante: viewer (rol + relaciones
  // + capabilities), fondeo (fundedBps/fundingOpen) y display. Recibe el viewer ya construido.
  // saleContext es opcional: lo pasa getDetail (donde ya consultamos hasApprovedOffer);
  // en la lista se omite para no incurrir en N queries extra.
  private enrich(project: Project, viewer: ViewerContext, saleContext?: SaleContext): ProjectEnrichment {
    const open = fundingOpen({
      status: project.status,
      totalRaised: project.totalRaised,
      ff: project.ff,
      fundingDeadline: project.fundingDeadline,
    });
    const capabilities = projectCapabilities(
      { status: project.status, fundingOpen: open },
      viewer,
      saleContext,
    );

    const viewerDto: ProjectViewer = {
      role: viewer.role,
      isDeveloper: viewer.isDeveloper,
      isArbiter: viewer.isArbiter,
      isInvestor: viewer.isInvestor,
      capabilities,
    };

    return {
      fundedBps: fundedBps(project.totalRaised, project.ff),
      fundingOpen: open,
      display: projectDisplay(project.status),
      viewer: viewerDto,
    };
  }

  // Mapa governorProposalId -> deadline de las propuestas del proyecto. Lo usa la derivacion de
  // hitos para marcar "votacion vencida" cuando el plazo paso pero la propuesta sigue Active.
  // Espeja el deadlineByProposalId de MilestoneList.tsx (que arma el hook useProposals).
  private async proposalDeadlines(
    projectAddress: string,
  ): Promise<Map<number, Date | null>> {
    const proposals = await this.proposals.listByProject(projectAddress);
    return new Map(proposals.map((p) => [p.governorProposalId, p.deadline]));
  }

  // Adaptadores del model al shape minimo que espera la MilestonePolicy (no acopla la policy a
  // persistence). El repo ya devuelve los hitos ordenados por milestoneIndex, requisito para que
  // la secuencialidad (slice(0, i)) sea correcta.
  private toMilestoneProjectInput(project: Project): MilestoneProjectInput {
    return {
      status: project.status,
      currentArbiter: project.currentArbiter,
      totalRaised: project.totalRaised,
      fmpa: project.fmpa,
      fundingDeadline: project.fundingDeadline,
      currentMilestoneIndex: project.currentMilestoneIndex,
    };
  }

  private toMilestoneInput(m: Milestone): MilestoneInput {
    return {
      milestoneIndex: m.milestoneIndex,
      status: m.status,
      budget: m.budget,
      deadline: m.deadline,
      retryCount: m.retryCount,
      proposalId: m.proposalId,
    };
  }

  async getMilestones(
    address: string,
    viewerWallet: string | null,
  ): Promise<MilestoneResponse[]> {
    const project = await this.projects.findByAddress(address);
    if (!project) throw new NotFoundException("Project not found");
    const viewer = await this.buildViewerFor(project, viewerWallet);
    const deadlines = await this.proposalDeadlines(address);
    const projectInput = this.toMilestoneProjectInput(project);
    const milestoneInputs = project.milestones.map((m) => this.toMilestoneInput(m));
    const extras = enrichMilestones(projectInput, milestoneInputs, deadlines, viewer);
    return project.milestones.map((m, i) => ({ ...m.toResponse(), ...extras[i] }));
  }

  // Inversores distintos del proyecto = candidatos validos al rol de arbitro (hito 0).
  async getInvestors(address: string): Promise<string[]> {
    const project = await this.projects.findByAddress(address);
    if (!project) throw new NotFoundException("Project not found");
    return this.investments.listInvestorsByProject(address);
  }
}

export const projectService = new ProjectService();
