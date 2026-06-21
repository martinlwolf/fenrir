// Handler de registro de developer (emitido por FenrirFactory).
import { upsertFromRegistration } from "../../daos/developer.dao";
import type { EventContext, HandlerMap } from "./types";

const onDeveloperRegistered = async (ctx: EventContext): Promise<void> => {
  await upsertFromRegistration({
    wallet: String(ctx.args.wallet),
    razonSocial: String(ctx.args.razonSocial),
    cuit: String(ctx.args.cuit),
    registeredAtBlock: BigInt(ctx.meta.blockNumber),
  });
};

export const developerHandlers: HandlerMap = {
  DeveloperRegistered: onDeveloperRegistered,
};
