// Nucleo de ingestion idempotente. Todo handler de evento se ejecuta a traves de
// applyOnce: si el evento (txHash, logIndex) ya fue procesado, se ignora. Esto cubre
// eventos fuera de orden, duplicados por reconexion y reorgs cortos (FR-005, SC-005).
import { IngestionRepository, ingestionRepository } from "../persistence/repositories/ingestion.repository";

// Forma minima de un log de ethers que necesitamos para deduplicar y trazar.
export interface OnChainEventMeta {
  transactionHash: string;
  index: number; // logIndex dentro del bloque
  blockNumber: number;
  eventName: string;
}

export class IngestionService {
  constructor(private readonly ingestion: IngestionRepository = ingestionRepository) { }

  async applyOnce(meta: OnChainEventMeta, handler: () => Promise<void>): Promise<void> {
    const fresh = await this.ingestion.markProcessed(
      meta.transactionHash,
      meta.index,
      meta.eventName,
    );
    if (!fresh) return; // ya procesado: no-op idempotente
    await handler();
  }

  cursorId(scope: string): string {
    return `sepolia:${scope}`;
  }

  async loadCursor(scope: string, fallbackBlock: number): Promise<bigint> {
    const stored = await this.ingestion.getCursor(this.cursorId(scope));
    return stored ?? BigInt(fallbackBlock);
  }

  async saveCursor(scope: string, block: bigint): Promise<void> {
    await this.ingestion.setCursor(this.cursorId(scope), block);
  }
}

export const ingestionService = new IngestionService();
