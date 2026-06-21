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

export class ProjectService {
  constructor(private readonly projects: ProjectRepository = projectRepository) { }

  async list(query: ProjectListQuery): Promise<Paginated<ProjectResponse>> {
    const { items, total } = await this.projects.list({
      type: query.type,
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
    });
    return {
      items: items.map((p) => p.toResponse()),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  // Vista de comprador: solo proyectos en etapa de venta (FR-004, SC-003).
  async listBuyerView(page: number, pageSize: number): Promise<Paginated<ProjectResponse>> {
    const { items, total } = await this.projects.listSelling(page, pageSize);
    return { items: items.map((p) => p.toResponse()), page, pageSize, total };
  }

  async getDetail(address: string): Promise<ProjectDetailResponse> {
    const project = await this.projects.findByAddress(address);
    if (!project) throw new NotFoundException("Project not found");
    return project.toDetailResponse();
  }

  async getMilestones(address: string): Promise<MilestoneResponse[]> {
    const project = await this.projects.findByAddress(address);
    if (!project) throw new NotFoundException("Project not found");
    return project.milestones.map((m) => m.toResponse());
  }
}

export const projectService = new ProjectService();
