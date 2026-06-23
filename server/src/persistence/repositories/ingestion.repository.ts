// Repositorio del estado de ingestion: cursor de bloque + registro de eventos ya procesados
// (dedup). Unica capa que toca Prisma para estas tablas.
import type { PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

export class IngestionRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async getCursor(id: string): Promise<bigint | null> {
    const row = await this.db.ingestionCursor.findUnique({ where: { id } });
    return row ? row.lastProcessedBlock : null;
  }

  async setCursor(id: string, block: bigint): Promise<void> {
    await this.db.ingestionCursor.upsert({
      where: { id },
      create: { id, lastProcessedBlock: block },
      update: { lastProcessedBlock: block },
    });
  }

  // Marca un evento como procesado. Devuelve true si se registro por primera vez,
  // false si ya existia (evento duplicado / reorg). La unicidad de (txHash, logIndex)
  // garantiza idempotencia incluso ante condiciones de carrera.
  async markProcessed(txHash: string, logIndex: number, eventName: string): Promise<boolean> {
    try {
      await this.db.processedEvent.create({ data: { txHash, logIndex, eventName } });
      return true;
    } catch {
      // Violacion de PK compuesta => ya estaba procesado.
      return false;
    }
  }
}

export const ingestionRepository = new IngestionRepository();
