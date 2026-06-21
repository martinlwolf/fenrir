// Thin controller de proyectos: parsea/valida input HTTP, llama a un service, devuelve
// la respuesta. Sin reglas de negocio ni acceso a DAOs.
import type { Request, Response } from "express";
import { projectListQuerySchema } from "@shared/schemas/project.schema";
import { paginationQuerySchema } from "@shared/schemas/common.schema";
import { addressParamSchema } from "../schemas/params";
import * as projectService from "../services/project.service";

export async function list(req: Request, res: Response): Promise<void> {
  const query = projectListQuerySchema.parse(req.query);
  res.json(await projectService.list(query));
}

export async function buyerView(req: Request, res: Response): Promise<void> {
  const { page, pageSize } = paginationQuerySchema.parse(req.query);
  res.json(await projectService.listBuyerView(page, pageSize));
}

export async function detail(req: Request, res: Response): Promise<void> {
  const { address } = addressParamSchema.parse(req.params);
  res.json(await projectService.getDetail(address));
}

export async function milestones(req: Request, res: Response): Promise<void> {
  const { address } = addressParamSchema.parse(req.params);
  res.json(await projectService.getMilestones(address));
}
