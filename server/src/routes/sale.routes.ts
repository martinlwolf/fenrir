// Rutas de venta y reparto (lectura, US5).
import { Router } from "express";
import { registerReadPath } from "../config/docs/openapi";
import { saleController } from "../controllers/sale.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

export const saleRouter = Router();

saleRouter.get("/projects/:address/offers", asyncHandler(saleController.offers));
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
