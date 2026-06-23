// Handlers de la etapa de venta y reparto (emitidos por FenrirProject, solo Inversion)
// y de los reclamos. Reflejan estado; SaleExecuted ademas emite el certificado de
// finalizacion (la via de exito en Inversion no pasa por ProjectCompleted).
import { claimRepository } from "../../persistence/repositories/claim.repository";
import { developerService } from "../../services/developer.service";
import { syncService } from "../sync.service";
import type { EventContext, HandlerMap } from "./types";
import { withRehydrate } from "./withRehydrate";

// Las ofertas reflejan solo su propia fila (no rehidratan el proyecto) -> no usan
// withRehydrate.
const onOfferChanged = async (ctx: EventContext): Promise<void> => {
  await syncService.hydrateSaleOffer(ctx.address, Number(ctx.args.offerId));
};

// Inserta el reclamo ANTES de rehidratar (mismo motivo que Invested: la fila historica
// debe persistirse aunque la rehidratacion falle) -> no usa withRehydrate.
const onRefundClaimed = async (ctx: EventContext): Promise<void> => {
  await claimRepository.insertClaim({
    projectAddress: ctx.address,
    investorWallet: String(ctx.args.investor),
    type: "Refund",
    amount: ctx.args.amount as bigint,
    txHash: ctx.meta.transactionHash,
    logIndex: ctx.meta.index,
    block: BigInt(ctx.meta.blockNumber),
  });
  await syncService.hydrateProject(ctx.address);
};

// Registro historico del reparto reclamado (no rehidrata el proyecto).
const onDistributionClaimed = async (ctx: EventContext): Promise<void> => {
  await claimRepository.insertClaim({
    projectAddress: ctx.address,
    investorWallet: String(ctx.args.investor),
    type: "Distribution",
    amount: ctx.args.amount as bigint,
    txHash: ctx.meta.transactionHash,
    logIndex: ctx.meta.index,
    block: BigInt(ctx.meta.blockNumber),
  });
};

export const saleHandlers: HandlerMap = {
  SaleStageOpened: withRehydrate(),
  SaleOfferSubmitted: onOfferChanged,
  SaleOfferApproved: onOfferChanged,
  SaleOfferRefunded: onOfferChanged,
  SaleExecuted: withRehydrate(async (ctx) => {
    await syncService.hydrateSaleOffer(ctx.address, Number(ctx.args.offerId));
    await developerService.recordCertificate(ctx.address, "Completion", BigInt(ctx.meta.blockNumber));
  }),
  RefundClaimed: onRefundClaimed,
  DistributionClaimed: onDistributionClaimed,
  CommissionClaimed: withRehydrate(),
};
