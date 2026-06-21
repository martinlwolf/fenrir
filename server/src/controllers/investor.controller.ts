// Thin controller del inversor.
import type { Request, Response } from "express";
import { walletParamSchema } from "../schemas/params";
import * as investorService from "../services/investor.service";
import * as saleService from "../services/sale.service";

export async function investments(req: Request, res: Response): Promise<void> {
  const { wallet } = walletParamSchema.parse(req.params);
  res.json(await investorService.listInvestments(wallet));
}

export async function claimable(req: Request, res: Response): Promise<void> {
  const { wallet } = walletParamSchema.parse(req.params);
  res.json(await saleService.getClaimable(wallet));
}
