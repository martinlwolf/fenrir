// Handlers de la etapa de venta y reparto (emitidos por FenrirProject, solo Inversion)
// y de los reclamos. Reflejan estado; SaleExecuted ademas emite el certificado de
// finalizacion (la via de exito en Inversion no pasa por ProjectCompleted).
import { insertClaim } from "../../daos/claim.dao";
import { hydrateProject, hydrateSaleOffer } from "../../services/sync.service";
import { recordCertificate } from "../../services/developer.service";
import type { EventContext, HandlerMap } from "./types";

const rehydrate = async (ctx: EventContext): Promise<void> => {
  await hydrateProject(ctx.address);
};

const onOfferChanged = async (ctx: EventContext): Promise<void> => {
  await hydrateSaleOffer(ctx.address, Number(ctx.args.offerId));
};

const onSaleExecuted = async (ctx: EventContext): Promise<void> => {
  await hydrateProject(ctx.address);
  await hydrateSaleOffer(ctx.address, Number(ctx.args.offerId));
  await recordCertificate(ctx.address, "Completion", BigInt(ctx.meta.blockNumber));
};

const onRefundClaimed = async (ctx: EventContext): Promise<void> => {
  await insertClaim({
    projectAddress: ctx.address,
    investorWallet: String(ctx.args.investor),
    type: "Refund",
    amount: ctx.args.amount as bigint,
    txHash: ctx.meta.transactionHash,
    logIndex: ctx.meta.index,
    block: BigInt(ctx.meta.blockNumber),
  });
  await hydrateProject(ctx.address);
};

const onDistributionClaimed = async (ctx: EventContext): Promise<void> => {
  await insertClaim({
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
  SaleStageOpened: rehydrate,
  SaleOfferSubmitted: onOfferChanged,
  SaleOfferApproved: onOfferChanged,
  SaleOfferRefunded: onOfferChanged,
  SaleExecuted: onSaleExecuted,
  RefundClaimed: onRefundClaimed,
  DistributionClaimed: onDistributionClaimed,
  CommissionClaimed: rehydrate,
};
