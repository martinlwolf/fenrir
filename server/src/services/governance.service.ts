// Servicio de lectura de gobernanza: propuestas, poder de voto por wallet (leido
// on-chain con getPastVotes en el snapshot) y estado del arbitro.
import type {
  ArbiterResponse,
  ProposalResponse,
  VotingPowerResponse,
} from "@shared/schemas/proposal.schema";
import { tokenContract } from "../blockchain/provider";
import * as proposalDao from "../daos/proposal.dao";
import * as projectDao from "../daos/project.dao";
import * as voteDao from "../daos/vote.dao";
import { NotFoundException } from "../exceptions/common";

export async function listProposals(projectAddress: string): Promise<ProposalResponse[]> {
  const proposals = await proposalDao.listByProject(projectAddress);
  return proposals.map((p) => p.toResponse());
}

export async function getProposal(
  projectAddress: string,
  governorProposalId: number,
): Promise<ProposalResponse> {
  const proposal = await proposalDao.findByProjectAndProposalId(projectAddress, governorProposalId);
  if (!proposal) throw new NotFoundException("Proposal not found");
  return proposal.toResponse();
}

// Poder de voto de una wallet en el snapshot de una propuesta. Se lee on-chain con
// getPastVotes (research.md 2): mas exacto que reconstruirlo de eventos.
export async function getVotingPower(
  projectAddress: string,
  governorProposalId: number,
  wallet: string,
): Promise<VotingPowerResponse> {
  const meta = await proposalDao.getMeta(projectAddress, governorProposalId);
  if (!meta) throw new NotFoundException("Proposal not found");
  const ctx = await projectDao.getVotingContext(projectAddress);
  if (!ctx) throw new NotFoundException("Project not found");

  const token = tokenContract(ctx.tokenAddress);
  const pastVotes = (await token.getPastVotes(wallet, meta.snapshotBlock)) as bigint;
  // En modo "1 wallet = 1 voto" el peso es 1 si tenia algun FDT en el snapshot.
  const votingPower = ctx.votingMode === "OneWalletOneVote" ? (pastVotes > 0n ? 1n : 0n) : pastVotes;

  const hasVoted = await voteDao.hasVoted(meta.id, wallet);

  return {
    wallet: wallet.toLowerCase(),
    proposalId: governorProposalId,
    snapshotBlock: meta.snapshotBlock.toString(),
    votingPower: votingPower.toString(),
    hasVoted,
  };
}

export async function getArbiter(projectAddress: string): Promise<ArbiterResponse> {
  const project = await projectDao.findByAddress(projectAddress);
  if (!project) throw new NotFoundException("Project not found");
  const electionInProgress = await proposalDao.hasActiveArbiterElection(projectAddress);

  const detail = project.toResponse();
  return {
    projectAddress: detail.address,
    currentArbiter: detail.currentArbiter,
    electionInProgress,
  };
}
