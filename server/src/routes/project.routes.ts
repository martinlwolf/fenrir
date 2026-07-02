// Rutas de proyectos (lectura, US1). Registra tambien sus paths en OpenAPI.
import { Router } from "express";
import { registerReadPath } from "../config/docs/openapi";
import { projectController } from "../controllers/project.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { resolveViewer } from "../middlewares/resolveViewer";

export const projectRouter = Router();

// resolveViewer (opcional, no bloquea) resuelve la wallet consultante para que el service
// embeba viewer/capabilities en el DTO. Solo en las rutas que devuelven proyectos.
projectRouter.get("/projects", resolveViewer, asyncHandler(projectController.list));
projectRouter.get(
  "/projects/buyer-view",
  resolveViewer,
  asyncHandler(projectController.buyerView),
);
projectRouter.get("/projects/:address", resolveViewer, asyncHandler(projectController.detail));
projectRouter.get(
  "/projects/:address/milestones",
  resolveViewer,
  asyncHandler(projectController.milestones),
);
projectRouter.get("/projects/:address/investors", asyncHandler(projectController.investors));

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
registerReadPath({
  method: "get",
  path: "/projects/{address}/investors",
  summary: "Inversores del proyecto (candidatos a arbitro)",
  tags: ["Projects"],
});
