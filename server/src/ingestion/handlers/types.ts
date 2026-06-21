// Tipos compartidos por los handlers de eventos. Cada handler recibe los args
// parseados del evento + metadata de trazabilidad on-chain, y solo persiste lo que
// el evento comunica (FR-020: el backend no recalcula reglas de negocio).
import type { Result } from "ethers";
import type { OnChainEventMeta } from "../../services/ingestion.service";

export interface EventContext {
  args: Result;
  // Direccion del contrato que emitio el evento.
  address: string;
  meta: OnChainEventMeta;
}

export type EventHandler = (ctx: EventContext) => Promise<void>;
export type HandlerMap = Record<string, EventHandler>;
