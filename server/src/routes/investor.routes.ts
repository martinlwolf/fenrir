// Rutas del inversor (historial + reclamable).
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler";
import * as investorController from "../controllers/investor.controller";
import { registerReadPath } from "../docs/openapi";

export const investorRouter = Router();

investorRouter.get("/investors/:wallet/investments", asyncHandler(investorController.investments));
investorRouter.get("/investors/:wallet/claimable", asyncHandler(investorController.claimable));

registerReadPath({
  method: "get",
  path: "/investors/{wallet}/investments",
  summary: "Historial de inversion de una wallet",
  tags: ["Investors"],
});
registerReadPath({
  method: "get",
  path: "/investors/{wallet}/claimable",
  summary: "Montos reclamables (refund/distribution) de una wallet",
  tags: ["Investors"],
});
