import { z } from "zod";
import { api } from "@/lib/api";
import {
  arbiterResponseSchema,
  proposalResponseSchema,
  votingPowerResponseSchema,
  type ArbiterResponse,
  type ProposalResponse,
  type VotingPowerResponse,
} from "@shared/schemas/proposal.schema";

export async function listProposals(address: string): Promise<ProposalResponse[]> {
  const { data } = await api.get(`/projects/${address}/proposals`);
  return z.array(proposalResponseSchema).parse(data);
}

export async function getProposal(
  address: string,
  proposalId: number,
): Promise<ProposalResponse> {
  const { data } = await api.get(`/projects/${address}/proposals/${proposalId}`);
  return proposalResponseSchema.parse(data);
}

export async function getVotingPower(
  address: string,
  proposalId: number,
  wallet: string,
): Promise<VotingPowerResponse> {
  const { data } = await api.get(
    `/projects/${address}/proposals/${proposalId}/voting-power`,
    { params: { wallet } },
  );
  return votingPowerResponseSchema.parse(data);
}

export async function getArbiter(address: string): Promise<ArbiterResponse> {
  const { data } = await api.get(`/projects/${address}/arbiter`);
  return arbiterResponseSchema.parse(data);
}
