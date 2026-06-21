// Test de ingestion idempotente (FR-005, SC-005): applyOnce ejecuta el handler una
// sola vez por evento (txHash, logIndex), aunque el evento se reprocese. Se mockea el
// DAO para no depender de una base de datos.
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock del DAO de ingestion: markProcessed devuelve true la primera vez y false luego.
vi.mock("../daos/ingestion.dao", () => {
  const seen = new Set<string>();
  return {
    markProcessed: vi.fn(async (txHash: string, logIndex: number) => {
      const key = `${txHash}:${logIndex}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
    getCursor: vi.fn(async () => null),
    setCursor: vi.fn(async () => undefined),
  };
});

import { applyOnce, type OnChainEventMeta } from "../services/ingestion.service";

const meta: OnChainEventMeta = {
  transactionHash: "0xabc",
  index: 0,
  blockNumber: 100,
  eventName: "Invested",
};

describe("applyOnce (ingestion idempotente)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ejecuta el handler la primera vez", async () => {
    const handler = vi.fn(async () => undefined);
    await applyOnce(meta, handler);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("NO vuelve a ejecutar el handler para el mismo (txHash, logIndex)", async () => {
    const handler = vi.fn(async () => undefined);
    await applyOnce(meta, handler); // reprocesado
    expect(handler).toHaveBeenCalledTimes(0);
  });

  it("ejecuta el handler para un evento distinto (otro logIndex)", async () => {
    const handler = vi.fn(async () => undefined);
    await applyOnce({ ...meta, index: 1 }, handler);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
