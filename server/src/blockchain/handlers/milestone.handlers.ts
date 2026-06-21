// Handlers de eventos del ciclo de hitos de obra (emitidos por FenrirProject). Todos
// rehidratan el estado del proyecto; MilestoneDeclared ademas verifica el hash del
// reporte off-chain contra el reportHash on-chain (FR-009).
import { hydrateProject } from "../../services/sync.service";
import { verifyOnChainDeclaration } from "../../services/report.service";
import type { EventContext, HandlerMap } from "./types";

const onMilestoneDeclared = async (ctx: EventContext): Promise<void> => {
  await hydrateProject(ctx.address);
  const milestoneIndex = Number(ctx.args.milestoneId);
  const reportHash = String(ctx.args.reportHash);
  await verifyOnChainDeclaration(ctx.address, milestoneIndex, reportHash);
};

const rehydrate = async (ctx: EventContext): Promise<void> => {
  await hydrateProject(ctx.address);
};

export const milestoneHandlers: HandlerMap = {
  MilestoneDeclared: onMilestoneDeclared,
  MilestoneVotingOpened: rehydrate,
  MilestoneVotingPaused: rehydrate,
  MilestoneApproved: rehydrate,
  MilestoneRejected: rehydrate,
  TrancheReleased: rehydrate,
  TrancheReleasePending: rehydrate,
};
