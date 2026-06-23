// Rutas de gobernanza (lectura, US3).
import { Router } from "express";
import { registerReadPath } from "../config/docs/openapi";
import { governanceController } from "../controllers/governance.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

export const governanceRouter = Router();

governanceRouter.get("/projects/:address/proposals", asyncHandler(governanceController.listProposals));
governanceRouter.get(
  "/projects/:address/proposals/:proposalId/voting-power",
  asyncHandler(governanceController.votingPower),
);
governanceRouter.get(
  "/projects/:address/proposals/:proposalId",
  asyncHandler(governanceController.getProposal),
);
governanceRouter.get("/projects/:address/arbiter", asyncHandler(governanceController.arbiter));

registerReadPath({
  method: "get",
  path: "/projects/{address}/proposals",
  summary: "Propuestas de gobernanza de un proyecto",
  tags: ["Governance"],
});
registerReadPath({
  method: "get",
  path: "/projects/{address}/proposals/{proposalId}",
  summary: "Detalle de una propuesta",
  tags: ["Governance"],
});
registerReadPath({
  method: "get",
  path: "/projects/{address}/proposals/{proposalId}/voting-power",
  summary: "Poder de voto de una wallet en el snapshot + si ya voto",
  tags: ["Governance"],
});
registerReadPath({
  method: "get",
  path: "/projects/{address}/arbiter",
  summary: "Estado del arbitro del proyecto",
  tags: ["Governance"],
});
