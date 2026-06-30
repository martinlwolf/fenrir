// Acceso a proyectos. Unica via a /projects del backend (los componentes no usan Axios).
import { api } from "@/lib/api";
import {
  projectDetailResponseSchema,
  projectInvestorsResponseSchema,
  projectResponseSchema,
  type ProjectDetailResponse,
  type ProjectInvestorsResponse,
  type ProjectResponse,
} from "@shared/schemas/project.schema";
import type { ProjectStatusValue, ProjectTypeValue } from "@shared/constants/enums";
import type { Paginated } from "@shared/types/api";
import { z } from "zod";

export interface ProjectFilters {
  type?: ProjectTypeValue;
  status?: ProjectStatusValue;
  page?: number;
  pageSize?: number;
}

function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
  });
}

export async function listProjects(
  filters: ProjectFilters = {},
): Promise<Paginated<ProjectResponse>> {
  const { data } = await api.get("/projects", { params: filters });
  return paginatedSchema(projectResponseSchema).parse(data);
}

export async function listBuyerProjects(
  filters: Pick<ProjectFilters, "page" | "pageSize"> = {},
): Promise<Paginated<ProjectResponse>> {
  const { data } = await api.get("/projects/buyer-view", { params: filters });
  return paginatedSchema(projectResponseSchema).parse(data);
}

export async function getProject(address: string): Promise<ProjectDetailResponse> {
  const { data } = await api.get(`/projects/${address}`);
  return projectDetailResponseSchema.parse(data);
}

// Inversores del proyecto = candidatos validos a arbitro (hito 0).
export async function getProjectInvestors(
  address: string,
): Promise<ProjectInvestorsResponse> {
  const { data } = await api.get(`/projects/${address}/investors`);
  return projectInvestorsResponseSchema.parse(data);
}
