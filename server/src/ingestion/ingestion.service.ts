// Nucleo de ingestion idempotente. Todo handler de evento se ejecuta a traves de
// applyOnce: si el evento (txHash, logIndex) ya fue procesado, se ignora. Esto cubre
// eventos fuera de orden, duplicados por reconexion y reorgs cortos (FR-005, SC-005).
import { getCursor, markProcessed, setCursor } from "../daos/ingestion.dao";

// Forma minima de un log de ethers que necesitamos para deduplicar y trazar.
export interface OnChainEventMeta {
  transactionHash: string;
  index: number; // logIndex dentro del bloque
  blockNumber: number;
  eventName: string;
}

export async function applyOnce(
  meta: OnChainEventMeta,
  handler: () => Promise<void>,
): Promise<void> {
  const fresh = await markProcessed(meta.transactionHash, meta.index, meta.eventName);
  if (!fresh) return; // ya procesado: no-op idempotente
  await handler();
}

export function cursorId(scope: string): string {
  return `sepolia:${scope}`;
}

export async function loadCursor(scope: string, fallbackBlock: number): Promise<bigint> {
  const stored = await getCursor(cursorId(scope));
  return stored ?? BigInt(fallbackBlock);
}

export async function saveCursor(scope: string, block: bigint): Promise<void> {
  await setCursor(cursorId(scope), block);
}
