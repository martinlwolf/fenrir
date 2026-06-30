// Thin controller de proyectos: parsea/valida input HTTP, llama a un service, devuelve
// la respuesta. Sin reglas de negocio ni acceso a DAOs.
import type { Request, Response } from "express";
import { projectListQuerySchema } from "@shared/schemas/project.schema";
import { paginationQuerySchema } from "@shared/schemas/common.schema";
import { addressParamSchema } from "../schemas/params";
import { ProjectService, projectService } from "../services/project.service";

export class ProjectController {
  constructor(private readonly projects: ProjectService = projectService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = projectListQuerySchema.parse(req.query);
    res.json(await this.projects.list(query));
  };

  buyerView = async (req: Request, res: Response): Promise<void> => {
    const { page, pageSize } = paginationQuerySchema.parse(req.query);
    res.json(await this.projects.listBuyerView(page, pageSize));
  };

  detail = async (req: Request, res: Response): Promise<void> => {
    const { address } = addressParamSchema.parse(req.params);
    res.json(await this.projects.getDetail(address));
  };

  milestones = async (req: Request, res: Response): Promise<void> => {
    const { address } = addressParamSchema.parse(req.params);
    res.json(await this.projects.getMilestones(address));
  };

  investors = async (req: Request, res: Response): Promise<void> => {
    const { address } = addressParamSchema.parse(req.params);
    res.json(await this.projects.getInvestors(address));
  };
}

export const projectController = new ProjectController();
