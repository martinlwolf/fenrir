// Rutas de venta y reparto (lectura, US5).
import { Router } from "express";
import { registerReadPath } from "../config/docs/openapi";
import { saleController } from "../controllers/sale.controller";
import { asyncHandler } from "../middlewares/asyncHandler";
import { resolveViewer } from "../middlewares/resolveViewer";

export const saleRouter = Router();

// resolveViewer: necesario para derivar viewer.usesDeveloperVote y display personalizado
// de cada oferta segun el rol del consultante. No bloquea: anonimo si falta la wallet.
saleRouter.get("/projects/:address/offers", resolveViewer, asyncHandler(saleController.offers));
saleRouter.get("/projects/:address/distribution", asyncHandler(saleController.distribution));

registerReadPath({
  method: "get",
  path: "/projects/{address}/offers",
  summary: "Ofertas de compra de un proyecto en venta",
  tags: ["Sale"],
});
registerReadPath({
  method: "get",
  path: "/projects/{address}/distribution",
  summary: "Precio final, pool de reparto y parte reclamable por inversor",
  tags: ["Sale"],
});
