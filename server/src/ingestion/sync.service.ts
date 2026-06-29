// Sincronizacion del espejo desde el estado on-chain. Ante cada evento relevante, en
// vez de recalcular campos a mano, releemos el estado autoritativo del contrato via
// llamadas view y lo persistimos. Asi el espejo siempre coincide con on-chain y el
// backend nunca "decide" una transicion (FR-020). Es la capa habilitada a hablar con el
// RPC (skill backend-architecture).
import { ZeroAddress, ZeroHash } from "ethers";
import { logger } from "../config/logger";
import {
  toMilestoneStatus,
  toOfferStatus,
  toProjectStatus,
  toProjectType,
  toProposalKind,
  toProposalResult,
  toProposalStatus,
  toVotingMode,
} from "../models/onchain/enums";
import { governorContract, projectContract } from "../models/onchain/provider";
import { MilestoneRepository, milestoneRepository } from "../persistence/repositories/milestone.repository";
import { ProjectRepository, projectRepository } from "../persistence/repositories/project.repository";
import { ProposalRepository, proposalRepository } from "../persistence/repositories/proposal.repository";
import { SaleOfferRepository, saleOfferRepository } from "../persistence/repositories/saleOffer.repository";

function nonZeroAddress(addr: string): string | null {
  return addr && addr.toLowerCase() !== ZeroAddress.toLowerCase() ? addr.toLowerCase() : null;
}

function nonZeroHash(h: string): string | null {
  return h && h.toLowerCase() !== ZeroHash.toLowerCase() ? h : null;
}

function deadlineToDate(raw: bigint): Date | null {
  return raw > 0n ? new Date(Number(raw) * 1000) : null;
}

export class SyncService {
  constructor(
    private readonly milestones: MilestoneRepository = milestoneRepository,
    private readonly projects: ProjectRepository = projectRepository,
    private readonly proposals: ProposalRepository = proposalRepository,
    private readonly offers: SaleOfferRepository = saleOfferRepository,
  ) { }

  // Relee y persiste el estado completo de un proyecto (+ sus hitos) desde on-chain.
  async hydrateProject(address: string, createdAtBlock?: bigint): Promise<void> {
    logger.debug({ address }, "hidratando proyecto desde on-chain");
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

    const status = toProjectStatus(statusRaw);
    await this.projects.upsertProjectRow({
      address,
      tokenAddress: tokenAddr,
      governorAddress: governorAddr,
      developerWallet: developerAddr,
      projectType: toProjectType(projectTypeRaw),
      votingMode: toVotingMode(votingModeRaw),
      status,
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

    // Lecturas on-chain de los hitos en paralelo (las round-trips RPC son el costo;
    // evita el N+1 secuencial). Los upserts se hacen despues, en orden, para no
    // presionar el pool de conexiones.
    const count = Number(milestonesCountRaw);
    const rawMilestones = await Promise.all(
      Array.from({ length: count }, (_, i) => project.milestones(i)),
    );
    for (let i = 0; i < count; i++) {
      const m = rawMilestones[i];
      await this.milestones.upsertMilestoneRow({
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

    logger.info(
      {
        address,
        status,
        currentMilestoneIndex: Number(currentMilestoneIndexRaw),
        totalRaised: totalRaised.toString(),
        currentArbiter: nonZeroAddress(arbiter),
      },
      "proyecto rehidratado desde on-chain",
    );
  }

  // Relee y persiste el estado de una propuesta desde el governor que la emitio.
  async hydrateProposal(governorAddress: string, governorProposalId: number): Promise<void> {
    const projectAddress = await this.projects.findAddressByGovernor(governorAddress);
    if (!projectAddress) {
      // governor de un proyecto aun no espejado: el ciclo lo recupera luego
      logger.warn(
        { governorAddress, governorProposalId },
        "propuesta de un governor sin proyecto espejado todavia: se reintenta en el proximo ciclo",
      );
      return;
    }

    logger.debug({ projectAddress, governorProposalId }, "hidratando propuesta desde on-chain");
    const governor = governorContract(governorAddress);
    const p = await governor.proposals(governorProposalId);

    const kind = toProposalKind(p.kind as bigint);
    const status = toProposalStatus(p.status as bigint);
    const electedArbiter =
      kind === "ArbiterElection" && status === "Resolved"
        ? nonZeroAddress(p.leadingCandidate as string)
        : null;

    await this.proposals.upsertProposalRow({
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
    logger.info(
      { projectAddress, governorProposalId, kind, status },
      "propuesta rehidratada desde on-chain",
    );
  }

  // Relee y persiste el estado de una oferta de venta desde el contrato del proyecto.
  async hydrateSaleOffer(projectAddress: string, offerId: number): Promise<void> {
    logger.debug({ projectAddress, offerId }, "hidratando oferta de venta desde on-chain");
    const project = projectContract(projectAddress);
    const o = await project.saleOffers(offerId);
    await this.offers.upsertOfferRow({
      projectAddress,
      offerId,
      buyerWallet: String(o.buyer),
      amount: o.amount as bigint,
      proposalId: Number(o.proposalId) > 0 ? Number(o.proposalId) : null,
      status: toOfferStatus(o.status as bigint),
    });
    logger.info(
      { projectAddress, offerId, status: toOfferStatus(o.status as bigint) },
      "oferta de venta rehidratada desde on-chain",
    );
  }
}

export const syncService = new SyncService();
