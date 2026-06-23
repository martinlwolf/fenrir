// Template Method (funcional) del esqueleto comun de los handlers de proyecto: ante un
// evento, releer el estado autoritativo del proyecto desde on-chain (hydrateProject) y,
// opcionalmente, ejecutar un efecto secundario especifico (registrar la verificacion de
// un reporte, emitir un certificado, reflejar una oferta...). La parte invariante
// (rehidratar) se factoriza aca una sola vez, en vez de repetirse en cada handler de
// milestone/project/sale (analista-patrones, hallazgo A).
//
// Solo aplica a handlers cuyo efecto corre DESPUES de rehidratar. Los handlers que
// insertan una fila hija ANTES de rehidratar (Invested, RefundClaimed) preservan ese
// orden a proposito y por eso no usan este helper.
import { syncService } from "../sync.service";
import type { EventContext, EventHandler } from "./types";

export const withRehydrate =
  (effect?: (ctx: EventContext) => Promise<void>): EventHandler =>
  async (ctx) => {
    await syncService.hydrateProject(ctx.address);
    if (effect) await effect(ctx);
  };
