// Servicio de lectura de proyectos. Orquesta DAOs y devuelve DTOs ya formateados.
import type {
  MilestoneResponse,
  ProjectDetailResponse,
  ProjectListQuery,
  ProjectResponse,
} from "@shared/schemas/project.schema";
import type { Paginated } from "@shared/types/api";
import { NotFoundException } from "../exceptions/common.exception";
import { ProjectRepository, projectRepository } from "../persistence/repositories/project.repository";
import { InvestmentRepository, investmentRepository } from "../persistence/repositories/investment.repository";

export class ProjectService {
  constructor(
    private readonly projects: ProjectRepository = projectRepository,
    private readonly investments: InvestmentRepository = investmentRepository,
  ) { }

  async list(query: ProjectListQuery): Promise<Paginated<ProjectResponse>> {
    const { items, total } = await this.projects.list({
      type: query.type,
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
    });
    return {
      items: await this.withInvestorCount(items.map((p) => p.toResponse())),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  // Vista de comprador: solo proyectos en etapa de venta (FR-004, SC-003).
  async listBuyerView(page: number, pageSize: number): Promise<Paginated<ProjectResponse>> {
    const { items, total } = await this.projects.listSelling(page, pageSize);
    return {
      items: await this.withInvestorCount(items.map((p) => p.toResponse())),
      page,
      pageSize,
      total,
    };
  }

  async getDetail(address: string): Promise<ProjectDetailResponse> {
    const project = await this.projects.findByAddress(address);
    if (!project) throw new NotFoundException("Project not found");
    const counts = await this.investments.countDistinctInvestorsByProjects([address]);
    return { ...project.toDetailResponse(), investorCount: counts.get(address.toLowerCase()) ?? 0 };
  }

  // Rellena investorCount (inversores distintos) en un lote de respuestas con una sola query.
  private async withInvestorCount(items: ProjectResponse[]): Promise<ProjectResponse[]> {
    const counts = await this.investments.countDistinctInvestorsByProjects(
      items.map((i) => i.address),
    );
    return items.map((i) => ({ ...i, investorCount: counts.get(i.address) ?? 0 }));
  }

  async getMilestones(address: string): Promise<MilestoneResponse[]> {
    const project = await this.projects.findByAddress(address);
    if (!project) throw new NotFoundException("Project not found");
    return project.milestones.map((m) => m.toResponse());
  }

  // Inversores distintos del proyecto = candidatos validos al rol de arbitro (hito 0).
  async getInvestors(address: string): Promise<string[]> {
    const project = await this.projects.findByAddress(address);
    if (!project) throw new NotFoundException("Project not found");
    return this.investments.listInvestorsByProject(address);
  }
}

export const projectService = new ProjectService();
