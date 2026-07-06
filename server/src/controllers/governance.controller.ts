// Thin controller de gobernanza.
import { addressSchema } from "@shared/schemas/common.schema";
import type { Request, Response } from "express";
import { z } from "zod";
import { addressParamSchema, proposalParamsSchema } from "../schemas/params";
import { GovernanceService, governanceService } from "../services/governance.service";

const votingPowerQuerySchema = z.object({ wallet: addressSchema });

export class GovernanceController {
  constructor(private readonly governance: GovernanceService = governanceService) { }

  listProposals = async (req: Request, res: Response): Promise<void> => {
    const { address } = addressParamSchema.parse(req.params);
    res.json(await this.governance.listProposals(address, req.viewerWallet ?? null));
  };

  getProposal = async (req: Request, res: Response): Promise<void> => {
    const { address, proposalId } = proposalParamsSchema.parse(req.params);
    res.json(await this.governance.getProposal(address, proposalId, req.viewerWallet ?? null));
  };

  votingPower = async (req: Request, res: Response): Promise<void> => {
    const { address, proposalId } = proposalParamsSchema.parse(req.params);
    const { wallet } = votingPowerQuerySchema.parse(req.query);
    res.json(await this.governance.getVotingPower(address, proposalId, wallet));
  };

  arbiter = async (req: Request, res: Response): Promise<void> => {
    const { address } = addressParamSchema.parse(req.params);
    res.json(await this.governance.getArbiter(address));
  };
}

export const governanceController = new GovernanceController();
