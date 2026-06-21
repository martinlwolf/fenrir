// Thin controller de venta y reparto.
import type { Request, Response } from "express";
import { addressParamSchema } from "../schemas/params";
import * as saleService from "../services/sale.service";

export async function offers(req: Request, res: Response): Promise<void> {
  const { address } = addressParamSchema.parse(req.params);
  res.json(await saleService.listOffers(address));
}

export async function distribution(req: Request, res: Response): Promise<void> {
  const { address } = addressParamSchema.parse(req.params);
  res.json(await saleService.getDistribution(address));
}
