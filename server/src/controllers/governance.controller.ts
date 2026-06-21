// Thin controller de gobernanza.
import type { Request, Response } from "express";
import { z } from "zod";
import { addressSchema } from "@shared/schemas/common.schema";
import { addressParamSchema, proposalParamsSchema } from "../schemas/params";
import * as governanceService from "../services/governance.service";

const votingPowerQuerySchema = z.object({ wallet: addressSchema });

export async function listProposals(req: Request, res: Response): Promise<void> {
  const { address } = addressParamSchema.parse(req.params);
  res.json(await governanceService.listProposals(address));
}

export async function getProposal(req: Request, res: Response): Promise<void> {
  const { address, proposalId } = proposalParamsSchema.parse(req.params);
  res.json(await governanceService.getProposal(address, proposalId));
}

export async function votingPower(req: Request, res: Response): Promise<void> {
  const { address, proposalId } = proposalParamsSchema.parse(req.params);
  const { wallet } = votingPowerQuerySchema.parse(req.query);
  res.json(await governanceService.getVotingPower(address, proposalId, wallet));
}

export async function arbiter(req: Request, res: Response): Promise<void> {
  const { address } = addressParamSchema.parse(req.params);
  res.json(await governanceService.getArbiter(address));
}
