// Handlers de eventos de gobernanza (emitidos por FenrirGovernor). Rehidratan la
// propuesta desde on-chain y, en los eventos que cambian el arbitro, tambien el
// proyecto. VoteCast ademas registra el voto individual.
import { projectRepository } from "../../persistence/repositories/project.repository";
import { proposalRepository } from "../../persistence/repositories/proposal.repository";
import { voteRepository } from "../../persistence/repositories/vote.repository";
import { syncService } from "../sync.service";
import type { EventContext, HandlerMap } from "./types";

const onProposalChanged = async (ctx: EventContext): Promise<void> => {
  await syncService.hydrateProposal(ctx.address, Number(ctx.args.proposalId));
};

const onVoteCast = async (ctx: EventContext): Promise<void> => {
  const governorProposalId = Number(ctx.args.proposalId);
  await syncService.hydrateProposal(ctx.address, governorProposalId);

  const projectAddress = await projectRepository.findAddressByGovernor(ctx.address);
  if (!projectAddress) return;
  const meta = await proposalRepository.getMeta(projectAddress, governorProposalId);
  if (!meta) return;

  // VoteCast solo trae voter + weight (no el sentido del voto ni el candidato); el
  // conteo agregado vive en la propia propuesta (votesFor/votesAgainst).
  await voteRepository.insertVote({
    proposalInternalId: meta.id,
    voterWallet: String(ctx.args.voter),
    weight: ctx.args.weight as bigint,
    support: null,
    candidate: null,
    txHash: ctx.meta.transactionHash,
    logIndex: ctx.meta.index,
    block: BigInt(ctx.meta.blockNumber),
  });
};

// ArbiterElected(arbiter, byRandom) / ArbiterVacated(formerArbiter): cambia el arbitro
// del proyecto -> rehidratar el proyecto para reflejar currentArbiter.
const onArbiterChanged = async (ctx: EventContext): Promise<void> => {
  const projectAddress = await projectRepository.findAddressByGovernor(ctx.address);
  if (projectAddress) await syncService.hydrateProject(projectAddress);
};

export const governanceHandlers: HandlerMap = {
  ProposalCreated: onProposalChanged,
  VoteCast: onVoteCast,
  ProposalExtended: onProposalChanged,
  ProposalAwaitingArbiter: onProposalChanged,
  ProposalResolved: onProposalChanged,
  ArbiterElected: onArbiterChanged,
  ArbiterVacated: onArbiterChanged,
};
