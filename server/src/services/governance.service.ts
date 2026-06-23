// Servicio de lectura de gobernanza: propuestas, poder de voto por wallet (leido
// on-chain con getPastVotes en el snapshot) y estado del arbitro.
import type {
  ArbiterResponse,
  ProposalResponse,
  VotingPowerResponse,
} from "@shared/schemas/proposal.schema";
import { NotFoundException } from "../exceptions/common.exception";
import { tokenContract } from "../models/onchain/provider";
import { ProjectRepository, projectRepository } from "../persistence/repositories/project.repository";
import { ProposalRepository, proposalRepository } from "../persistence/repositories/proposal.repository";
import { VoteRepository, voteRepository } from "../persistence/repositories/vote.repository";

export class GovernanceService {
  constructor(
    private readonly proposals: ProposalRepository = proposalRepository,
    private readonly projects: ProjectRepository = projectRepository,
    private readonly votes: VoteRepository = voteRepository,
  ) { }

  async listProposals(projectAddress: string): Promise<ProposalResponse[]> {
    const proposals = await this.proposals.listByProject(projectAddress);
    return proposals.map((p) => p.toResponse());
  }

  async getProposal(
    projectAddress: string,
    governorProposalId: number,
  ): Promise<ProposalResponse> {
    const proposal = await this.proposals.findByProjectAndProposalId(
      projectAddress,
      governorProposalId,
    );
    if (!proposal) throw new NotFoundException("Proposal not found");
    return proposal.toResponse();
  }

  // Poder de voto de una wallet en el snapshot de una propuesta. Se lee on-chain con
  // getPastVotes (research.md 2): mas exacto que reconstruirlo de eventos.
  async getVotingPower(
    projectAddress: string,
    governorProposalId: number,
    wallet: string,
  ): Promise<VotingPowerResponse> {
    const meta = await this.proposals.getMeta(projectAddress, governorProposalId);
    if (!meta) throw new NotFoundException("Proposal not found");
    const ctx = await this.projects.getVotingContext(projectAddress);
    if (!ctx) throw new NotFoundException("Project not found");

    const token = tokenContract(ctx.tokenAddress);
    const pastVotes = (await token.getPastVotes(wallet, meta.snapshotBlock)) as bigint;
    // En modo "1 wallet = 1 voto" el peso es 1 si tenia algun FDT en el snapshot.
    const votingPower =
      ctx.votingMode === "OneWalletOneVote" ? (pastVotes > 0n ? 1n : 0n) : pastVotes;

    const hasVoted = await this.votes.hasVoted(meta.id, wallet);

    return {
      wallet: wallet.toLowerCase(),
      proposalId: governorProposalId,
      snapshotBlock: meta.snapshotBlock.toString(),
      votingPower: votingPower.toString(),
      hasVoted,
    };
  }

  async getArbiter(projectAddress: string): Promise<ArbiterResponse> {
    const project = await this.projects.findByAddress(projectAddress);
    if (!project) throw new NotFoundException("Project not found");
    const electionInProgress = await this.proposals.hasActiveArbiterElection(projectAddress);

    const detail = project.toResponse();
    return {
      projectAddress: detail.address,
      currentArbiter: detail.currentArbiter,
      electionInProgress,
    };
  }
}

export const governanceService = new GovernanceService();
