// Thin controller del inversor.
import type { Request, Response } from "express";
import { walletParamSchema } from "../schemas/params";
import { InvestorService, investorService } from "../services/investor.service";
import { SaleService, saleService } from "../services/sale.service";

export class InvestorController {
  constructor(
    private readonly investors: InvestorService = investorService,
    private readonly sales: SaleService = saleService,
  ) {}

  investments = async (req: Request, res: Response): Promise<void> => {
    const { wallet } = walletParamSchema.parse(req.params);
    res.json(await this.investors.listInvestments(wallet));
  };

  claimable = async (req: Request, res: Response): Promise<void> => {
    const { wallet } = walletParamSchema.parse(req.params);
    res.json(await this.sales.getClaimable(wallet));
  };
}

export const investorController = new InvestorController();
