// DAO del estado de ingestion: cursor de bloque + registro de eventos ya procesados
// (dedup). Unica capa que toca Prisma para estas tablas.
import { prisma } from "./prisma";

export async function getCursor(id: string): Promise<bigint | null> {
  const row = await prisma.ingestionCursor.findUnique({ where: { id } });
  return row ? row.lastProcessedBlock : null;
}

export async function setCursor(id: string, block: bigint): Promise<void> {
  await prisma.ingestionCursor.upsert({
    where: { id },
    create: { id, lastProcessedBlock: block },
    update: { lastProcessedBlock: block },
  });
}

// Marca un evento como procesado. Devuelve true si se registro por primera vez,
// false si ya existia (evento duplicado / reorg). La unicidad de (txHash, logIndex)
// garantiza idempotencia incluso ante condiciones de carrera.
export async function markProcessed(
  txHash: string,
  logIndex: number,
  eventName: string,
): Promise<boolean> {
  try {
    await prisma.processedEvent.create({ data: { txHash, logIndex, eventName } });
    return true;
  } catch {
    // Violacion de PK compuesta => ya estaba procesado.
    return false;
  }
}
