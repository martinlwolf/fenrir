// Servicio de lectura de proyectos. Orquesta DAOs y devuelve DTOs ya formateados.
import type { Paginated } from "@shared/types/api";
import type {
  MilestoneResponse,
  ProjectDetailResponse,
  ProjectListQuery,
  ProjectResponse,
} from "@shared/schemas/project.schema";
import * as projectDao from "../daos/project.dao";
import { NotFoundException } from "../exceptions/common";

export async function list(query: ProjectListQuery): Promise<Paginated<ProjectResponse>> {
  const { items, total } = await projectDao.list({
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
export async function listBuyerView(
  page: number,
  pageSize: number,
): Promise<Paginated<ProjectResponse>> {
  const { items, total } = await projectDao.listSelling(page, pageSize);
  return { items: items.map((p) => p.toResponse()), page, pageSize, total };
}

export async function getDetail(address: string): Promise<ProjectDetailResponse> {
  const project = await projectDao.findByAddress(address);
  if (!project) throw new NotFoundException("Project not found");
  return project.toDetailResponse();
}

export async function getMilestones(address: string): Promise<MilestoneResponse[]> {
  const project = await projectDao.findByAddress(address);
  if (!project) throw new NotFoundException("Project not found");
  return project.milestones.map((m) => m.toResponse());
}
