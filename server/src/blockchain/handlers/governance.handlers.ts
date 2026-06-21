// Handlers de eventos de gobernanza (emitidos por FenrirGovernor). Rehidratan la
// propuesta desde on-chain y, en los eventos que cambian el arbitro, tambien el
// proyecto. VoteCast ademas registra el voto individual.
import { findAddressByGovernor } from "../../daos/project.dao";
import { getMeta } from "../../daos/proposal.dao";
import { insertVote } from "../../daos/vote.dao";
import { hydrateProject, hydrateProposal } from "../../services/sync.service";
import type { EventContext, HandlerMap } from "./types";

const onProposalChanged = async (ctx: EventContext): Promise<void> => {
  await hydrateProposal(ctx.address, Number(ctx.args.proposalId));
};

const onVoteCast = async (ctx: EventContext): Promise<void> => {
  const governorProposalId = Number(ctx.args.proposalId);
  await hydrateProposal(ctx.address, governorProposalId);

  const projectAddress = await findAddressByGovernor(ctx.address);
  if (!projectAddress) return;
  const meta = await getMeta(projectAddress, governorProposalId);
  if (!meta) return;

  // VoteCast solo trae voter + weight (no el sentido del voto ni el candidato); el
  // conteo agregado vive en la propia propuesta (votesFor/votesAgainst).
  await insertVote({
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
  const projectAddress = await findAddressByGovernor(ctx.address);
  if (projectAddress) await hydrateProject(projectAddress);
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
