// Sincronizacion del espejo desde el estado on-chain. Ante cada evento relevante, en
// vez de recalcular campos a mano, releemos el estado autoritativo del contrato via
// llamadas view y lo persistimos. Asi el espejo siempre coincide con on-chain y el
// backend nunca "decide" una transicion (FR-020). Es un service: es la capa habilitada
// a hablar con el RPC (skill backend-architecture).
import { ZeroAddress, ZeroHash } from "ethers";
import { governorContract, projectContract } from "../blockchain/provider";
import {
  toMilestoneStatus,
  toOfferStatus,
  toProjectStatus,
  toProjectType,
  toProposalKind,
  toProposalResult,
  toProposalStatus,
  toVotingMode,
} from "../blockchain/enums";
import { upsertMilestoneRow } from "../daos/milestone.dao";
import { findAddressByGovernor, upsertProjectRow } from "../daos/project.dao";
import { upsertProposalRow } from "../daos/proposal.dao";
import { upsertOfferRow } from "../daos/saleOffer.dao";

function nonZeroAddress(addr: string): string | null {
  return addr && addr.toLowerCase() !== ZeroAddress.toLowerCase() ? addr.toLowerCase() : null;
}

function nonZeroHash(h: string): string | null {
  return h && h.toLowerCase() !== ZeroHash.toLowerCase() ? h : null;
}

function deadlineToDate(raw: bigint): Date | null {
  return raw > 0n ? new Date(Number(raw) * 1000) : null;
}

// Relee y persiste el estado completo de un proyecto (+ sus hitos) desde on-chain.
export async function hydrateProject(address: string, createdAtBlock?: bigint): Promise<void> {
  const project = projectContract(address);

  const [
    projectTypeRaw,
    statusRaw,
    fmpa,
    ff,
    fundingDeadlineRaw,
    estimatedSalePrice,
    totalRaised,
    totalReleased,
    penaltyBps,
    currentMilestoneIndexRaw,
    salePriceRaw,
    governorAddr,
    tokenAddr,
    milestonesCountRaw,
  ] = await Promise.all([
    project.projectType() as Promise<bigint>,
    project.status() as Promise<bigint>,
    project.fmpa() as Promise<bigint>,
    project.ff() as Promise<bigint>,
    project.fundingDeadline() as Promise<bigint>,
    project.estimatedSalePrice() as Promise<bigint>,
    project.totalRaised() as Promise<bigint>,
    project.totalReleasedToDeveloper() as Promise<bigint>,
    project.penaltyAccumulatedBps() as Promise<bigint>,
    project.currentMilestoneIndex() as Promise<bigint>,
    project.salePrice() as Promise<bigint>,
    project.governor() as Promise<string>,
    project.token() as Promise<string>,
    project.milestonesCount() as Promise<bigint>,
  ]);

  const developerAddr = (await project.developer()) as string;
  const governor = governorContract(governorAddr);
  const [votingModeRaw, arbiter] = await Promise.all([
    governor.votingMode() as Promise<bigint>,
    governor.arbiter() as Promise<string>,
  ]);

  await upsertProjectRow({
    address,
    tokenAddress: tokenAddr,
    governorAddress: governorAddr,
    developerWallet: developerAddr,
    projectType: toProjectType(projectTypeRaw),
    votingMode: toVotingMode(votingModeRaw),
    status: toProjectStatus(statusRaw),
    fmpa,
    ff,
    totalRaised,
    totalReleasedToDeveloper: totalReleased,
    estimatedSalePrice,
    salePrice: salePriceRaw > 0n ? salePriceRaw : null,
    fundingDeadline: new Date(Number(fundingDeadlineRaw) * 1000),
    penaltyAccumulatedBps: Number(penaltyBps),
    currentArbiter: nonZeroAddress(arbiter),
    currentMilestoneIndex: Number(currentMilestoneIndexRaw),
    createdAtBlock,
  });

  const count = Number(milestonesCountRaw);
  for (let i = 0; i < count; i++) {
    const m = await project.milestones(i);
    await upsertMilestoneRow({
      projectAddress: address,
      milestoneIndex: i,
      budget: m.budget as bigint,
      deadline: deadlineToDate(m.deadline as bigint),
      status: toMilestoneStatus(m.status as bigint),
      retryCount: Number(m.retryCount),
      trancheReleased: m.trancheReleased as boolean,
      reportHash: nonZeroHash(m.reportHash as string),
      reportUrl: (m.reportUrl as string) || null,
      proposalId: Number(m.proposalId) > 0 ? Number(m.proposalId) : null,
    });
  }
}

// Relee y persiste el estado de una propuesta desde el governor que la emitio.
export async function hydrateProposal(
  governorAddress: string,
  governorProposalId: number,
): Promise<void> {
  const projectAddress = await findAddressByGovernor(governorAddress);
  if (!projectAddress) return; // governor de un proyecto aun no espejado: el ciclo lo recupera luego

  const governor = governorContract(governorAddress);
  const p = await governor.proposals(governorProposalId);

  const kind = toProposalKind(p.kind as bigint);
  const status = toProposalStatus(p.status as bigint);
  const electedArbiter =
    kind === "ArbiterElection" && status === "Resolved"
      ? nonZeroAddress(p.leadingCandidate as string)
      : null;

  await upsertProposalRow({
    projectAddress,
    governorProposalId,
    kind,
    refId: Number(p.refId),
    snapshotBlock: p.snapshotBlock as bigint,
    totalPowerAtSnapshot: p.totalPowerAtSnapshot as bigint,
    deadline: new Date(Number(p.deadline as bigint) * 1000),
    extended: p.extended as boolean,
    votesFor: p.votesFor as bigint,
    votesAgainst: p.votesAgainst as bigint,
    weightVoted: p.weightVoted as bigint,
    status,
    result: toProposalResult(p.result as bigint),
    electedArbiter,
  });
}

// Relee y persiste el estado de una oferta de venta desde el contrato del proyecto.
export async function hydrateSaleOffer(projectAddress: string, offerId: number): Promise<void> {
  const project = projectContract(projectAddress);
  const o = await project.saleOffers(offerId);
  await upsertOfferRow({
    projectAddress,
    offerId,
    buyerWallet: String(o.buyer),
    amount: o.amount as bigint,
    proposalId: Number(o.proposalId) > 0 ? Number(o.proposalId) : null,
    status: toOfferStatus(o.status as bigint),
  });
}
