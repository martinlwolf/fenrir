// Handlers de eventos de ciclo de vida del proyecto. Solo reflejan estado: ante cada
// evento releen el estado autoritativo del contrato (hydrateProject) y, donde
// corresponde, registran la fila hija (p.ej. la inversion). No deciden nada (FR-020).
import { investmentRepository } from "../../persistence/repositories/investment.repository";
import { developerService } from "../../services/developer.service";
import { syncService } from "../sync.service";
import type { EventContext, HandlerMap } from "./types";
import { withRehydrate } from "./withRehydrate";

// Emitido por FenrirFactory: nace un proyecto -> hidratar su estado completo (con el
// bloque de creacion). Target y firma propios: no encaja en withRehydrate.
const onProjectCreated = async (ctx: EventContext): Promise<void> => {
  const projectAddress = String(ctx.args.project);
  await syncService.hydrateProject(projectAddress, BigInt(ctx.meta.blockNumber));
};

// Emitido por una instancia de FenrirProject. Inserta la inversion ANTES de rehidratar
// (orden deliberado: applyOnce ya marco el evento, asi que la fila hija debe persistirse
// aunque la rehidratacion falle) -> no usa withRehydrate.
const onInvested = async (ctx: EventContext): Promise<void> => {
  await investmentRepository.insertInvestment({
    projectAddress: ctx.address,
    investorWallet: String(ctx.args.investor),
    amount: ctx.args.amount as bigint,
    txHash: ctx.meta.transactionHash,
    logIndex: ctx.meta.index,
    block: BigInt(ctx.meta.blockNumber),
  });
  await syncService.hydrateProject(ctx.address);
};

export const projectHandlers: { factory: HandlerMap; project: HandlerMap } = {
  factory: {
    ProjectCreated: onProjectCreated,
  },
  project: {
    Invested: onInvested,
    ArbiterElectionStarted: withRehydrate(),
    FundingRoundClosed: withRehydrate(),
    ArbiterElected: withRehydrate(),
    // Cualquier cancelacion -> certificado de proyecto fallido.
    ProjectCancelled: withRehydrate((ctx) =>
      developerService.recordCertificate(ctx.address, "Failure", BigInt(ctx.meta.blockNumber)),
    ),
    // Civico: el ultimo hito de obra completa el proyecto -> certificado de finalizacion.
    ProjectCompleted: withRehydrate((ctx) =>
      developerService.recordCertificate(ctx.address, "Completion", BigInt(ctx.meta.blockNumber)),
    ),
  },
};
