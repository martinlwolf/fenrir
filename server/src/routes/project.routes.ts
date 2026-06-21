// Rutas de proyectos (lectura, US1). Registra tambien sus paths en OpenAPI.
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import * as projectController from "../controllers/project.controller";
import { registerReadPath } from "../docs/openapi";

export const projectRouter = Router();

projectRouter.get("/projects", asyncHandler(projectController.list));
projectRouter.get("/projects/buyer-view", asyncHandler(projectController.buyerView));
projectRouter.get("/projects/:address", asyncHandler(projectController.detail));
projectRouter.get("/projects/:address/milestones", asyncHandler(projectController.milestones));

registerReadPath({
  method: "get",
  path: "/projects",
  summary: "Catalogo paginado de proyectos (filtros type/status)",
  tags: ["Projects"],
});
registerReadPath({
  method: "get",
  path: "/projects/buyer-view",
  summary: "Catalogo para rol comprador (solo etapa Selling)",
  tags: ["Projects"],
});
registerReadPath({
  method: "get",
  path: "/projects/{address}",
  summary: "Detalle de un proyecto (fondeo + hitos)",
  tags: ["Projects"],
});
registerReadPath({
  method: "get",
  path: "/projects/{address}/milestones",
  summary: "Hitos de un proyecto",
  tags: ["Projects"],
});
