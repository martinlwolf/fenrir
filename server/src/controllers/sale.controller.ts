// Thin controller de venta y reparto.
import type { Request, Response } from "express";
import { addressParamSchema } from "../schemas/params";
import { SaleService, saleService } from "../services/sale.service";

export class SaleController {
  constructor(private readonly sales: SaleService = saleService) {}

  offers = async (req: Request, res: Response): Promise<void> => {
    const { address } = addressParamSchema.parse(req.params);
    res.json(await this.sales.listOffers(address));
  };

  distribution = async (req: Request, res: Response): Promise<void> => {
    const { address } = addressParamSchema.parse(req.params);
    res.json(await this.sales.getDistribution(address));
  };
}

export const saleController = new SaleController();
