// Servicio de lectura de gobernanza: propuestas, poder de voto por wallet (leido
// on-chain con getPastVotes en el snapshot) y estado del arbitro.
import type {
  ArbiterResponse,
  ProposalResponse,
  VotingPowerResponse,
} from "@shared/schemas/proposal.schema";
import { NotFoundException } from "../exceptions/common.exception";
import { tokenContract } from "../models/onchain/provider";
import { APPROVAL_THRESHOLD_BPS, QUORUM_BPS } from "../models/Proposal";
import { buildViewer } from "../policy/Viewer";
import { proposalCapabilities, proposalDerived } from "../policy/ProposalPolicy";
import { ProjectRepository, projectRepository } from "../persistence/repositories/project.repository";
import { ProposalRepository, proposalRepository } from "../persistence/repositories/proposal.repository";
import { VoteRepository, voteRepository } from "../persistence/repositories/vote.repository";

export class GovernanceService {
  constructor(
    private readonly proposals: ProposalRepository = proposalRepository,
    private readonly projects: ProjectRepository = projectRepository,
    private readonly votes: VoteRepository = voteRepository,
  ) { }

  async listProposals(
    projectAddress: string,
    viewerWallet: string | null,
  ): Promise<ProposalResponse[]> {
    const project = await this.projects.findByAddress(projectAddress);
    if (!project) throw new NotFoundException("Project not found");

    const viewer = await buildViewer(
      {
        address: project.address,
        developerWallet: project.developerWallet,
        currentArbiter: project.currentArbiter,
        status: project.status,
      },
      viewerWallet,
    );

    const proposalList = await this.proposals.listByProject(projectAddress);

    return proposalList.map((p) => {
      const derived = proposalDerived({
        status: p.status,
        deadline: p.deadline,
        votesFor: p.votesFor,
        votesAgainst: p.votesAgainst,
        weightVoted: p.weightVoted,
        totalPowerAtSnapshot: p.totalPowerAtSnapshot,
        quorumBps: QUORUM_BPS,
        approvalThresholdBps: APPROVAL_THRESHOLD_BPS,
        quorumReached: p.quorumReached,
      });

      const caps = proposalCapabilities(derived, viewer);

      return {
        ...p.toResponse(),
        ...derived,
        quorumRemainingWei: derived.quorumRemainingWei.toString(),
        viewer: { canBreakTie: caps.canBreakTie },
      };
    });
  }

  async getProposal(
    projectAddress: string,
    governorProposalId: number,
    viewerWallet: string | null,
  ): Promise<ProposalResponse> {
    const project = await this.projects.findByAddress(projectAddress);
    if (!project) throw new NotFoundException("Project not found");

    const proposal = await this.proposals.findByProjectAndProposalId(
      projectAddress,
      governorProposalId,
    );
    if (!proposal) throw new NotFoundException("Proposal not found");

    const viewer = await buildViewer(
      {
        address: project.address,
        developerWallet: project.developerWallet,
        currentArbiter: project.currentArbiter,
        status: project.status,
      },
      viewerWallet,
    );

    const derived = proposalDerived({
      status: proposal.status,
      deadline: proposal.deadline,
      votesFor: proposal.votesFor,
      votesAgainst: proposal.votesAgainst,
      weightVoted: proposal.weightVoted,
      totalPowerAtSnapshot: proposal.totalPowerAtSnapshot,
      quorumBps: QUORUM_BPS,
      approvalThresholdBps: APPROVAL_THRESHOLD_BPS,
      quorumReached: proposal.quorumReached,
    });

    const caps = proposalCapabilities(derived, viewer);

    return {
      ...proposal.toResponse(),
      ...derived,
      quorumRemainingWei: derived.quorumRemainingWei.toString(),
      viewer: { canBreakTie: caps.canBreakTie },
    };
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

    // Para calcular canVote necesitamos el estado actual de la propuesta.
    const proposal = await this.proposals.findByProjectAndProposalId(
      projectAddress,
      governorProposalId,
    );
    // Si la propuesta no existe en el espejo, ya fallamos arriba en getMeta; aqui es seguro
    // asumir que existe. Si por alguna razon no se mapeo a modelo, canVote = false.
    let canVote = false;
    if (proposal) {
      const derived = proposalDerived({
        status: proposal.status,
        deadline: proposal.deadline,
        votesFor: proposal.votesFor,
        votesAgainst: proposal.votesAgainst,
        weightVoted: proposal.weightVoted,
        totalPowerAtSnapshot: proposal.totalPowerAtSnapshot,
        quorumBps: QUORUM_BPS,
        approvalThresholdBps: APPROVAL_THRESHOLD_BPS,
        quorumReached: proposal.quorumReached,
      });
      canVote = votingPower > 0n && !hasVoted && derived.active && !derived.expired;
    }

    return {
      wallet: wallet.toLowerCase(),
      proposalId: governorProposalId,
      snapshotBlock: meta.snapshotBlock.toString(),
      votingPower: votingPower.toString(),
      hasVoted,
      canVote,
    };
  }

  async getArbiter(projectAddress: string): Promise<ArbiterResponse> {
    const project = await this.projects.findByAddress(projectAddress);
    if (!project) throw new NotFoundException("Project not found");
    const electionInProgress = await this.proposals.hasActiveArbiterElection(projectAddress);

    // needsOpening: el proyecto esta en Building, sin arbitro y sin eleccion activa.
    // Indica que hay que llamar openArbiterElection() para iniciar el proceso de hito 0.
    const needsOpening =
      project.status === "Building" &&
      project.currentArbiter === null &&
      !electionInProgress;

    const detail = project.toResponse();
    return {
      projectAddress: detail.address,
      currentArbiter: detail.currentArbiter,
      electionInProgress,
      needsOpening,
    };
  }
}

export const governanceService = new GovernanceService();
