// Handlers de eventos de ciclo de vida del proyecto. Solo reflejan estado: ante cada
// evento releen el estado autoritativo del contrato (hydrateProject) y, donde
// corresponde, registran la fila hija (p.ej. la inversion). No deciden nada (FR-020).
import { insertInvestment } from "../../daos/investment.dao";
import { hydrateProject } from "../../services/sync.service";
import { recordCertificate } from "../../services/developer.service";
import type { EventContext, HandlerMap } from "./types";

// Emitido por FenrirFactory: nace un proyecto -> hidratar su estado completo.
const onProjectCreated = async (ctx: EventContext): Promise<void> => {
  const projectAddress = String(ctx.args.project);
  await hydrateProject(projectAddress, BigInt(ctx.meta.blockNumber));
};

// Emitido por una instancia de FenrirProject.
const onInvested = async (ctx: EventContext): Promise<void> => {
  await insertInvestment({
    projectAddress: ctx.address,
    investorWallet: String(ctx.args.investor),
    amount: ctx.args.amount as bigint,
    txHash: ctx.meta.transactionHash,
    logIndex: ctx.meta.index,
    block: BigInt(ctx.meta.blockNumber),
  });
  await hydrateProject(ctx.address);
};

const rehydrate = async (ctx: EventContext): Promise<void> => {
  await hydrateProject(ctx.address);
};

// Civico: el ultimo hito de obra completa el proyecto -> certificado de finalizacion.
const onProjectCompleted = async (ctx: EventContext): Promise<void> => {
  await hydrateProject(ctx.address);
  await recordCertificate(ctx.address, "Completion", BigInt(ctx.meta.blockNumber));
};

// Cualquier cancelacion -> certificado de proyecto fallido.
const onProjectCancelled = async (ctx: EventContext): Promise<void> => {
  await hydrateProject(ctx.address);
  await recordCertificate(ctx.address, "Failure", BigInt(ctx.meta.blockNumber));
};

export const projectHandlers: { factory: HandlerMap; project: HandlerMap } = {
  factory: {
    ProjectCreated: onProjectCreated,
  },
  project: {
    Invested: onInvested,
    ArbiterElectionStarted: rehydrate,
    FundingRoundClosed: rehydrate,
    ArbiterElected: rehydrate,
    ProjectCancelled: onProjectCancelled,
    ProjectCompleted: onProjectCompleted,
  },
};
