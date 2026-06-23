// Handlers de eventos del ciclo de hitos de obra (emitidos por FenrirProject). Todos
// rehidratan el estado del proyecto; MilestoneDeclared ademas verifica el hash del
// reporte off-chain contra el reportHash on-chain (FR-009).
import { reportService } from "../../services/report.service";
import { withRehydrate } from "./withRehydrate";
import type { HandlerMap } from "./types";

export const milestoneHandlers: HandlerMap = {
  MilestoneDeclared: withRehydrate(async (ctx) => {
    await reportService.verifyOnChainDeclaration(
      ctx.address,
      Number(ctx.args.milestoneId),
      String(ctx.args.reportHash),
    );
  }),
  MilestoneVotingOpened: withRehydrate(),
  MilestoneVotingPaused: withRehydrate(),
  MilestoneApproved: withRehydrate(),
  MilestoneRejected: withRehydrate(),
  TrancheReleased: withRehydrate(),
  TrancheReleasePending: withRehydrate(),
};
