// Hook unico para las escrituras on-chain. Llama una funcion de dominio de lib/chain,
// sigue las fases (signing -> mining -> propagating -> confirmed | failed), invalida las
// queries afectadas y maneja el rechazo/fallo de la firma (FR-020, FR-021, D4).
import * as React from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { TransactionResponse } from "ethers";

export type TxPhase = "idle" | "signing" | "mining" | "propagating" | "confirmed" | "failed";

interface UseWriteResult {
  phase: TxPhase;
  error: string | null;
  txHash: string | null;
  /** Ejecuta la accion on-chain; devuelve true si quedo confirmada. */
  run: (action: () => Promise<TransactionResponse>) => Promise<boolean>;
  reset: () => void;
}

export function useWrite(invalidateKeys: QueryKey[] = []): UseWriteResult {
  const queryClient = useQueryClient();
  const [phase, setPhase] = React.useState<TxPhase>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [txHash, setTxHash] = React.useState<string | null>(null);

  const reset = React.useCallback(() => {
    setPhase("idle");
    setError(null);
    setTxHash(null);
  }, []);

  const run = React.useCallback(
    async (action: () => Promise<TransactionResponse>) => {
      setError(null);
      setPhase("signing");
      try {
        const tx = await action();
        setTxHash(tx.hash);
        setPhase("mining");
        await tx.wait(1);
        // Minada: el backend aun puede tardar en espejar el evento (D4).
        setPhase("propagating");
        await Promise.all(
          invalidateKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })),
        );
        setPhase("confirmed");
        return true;
      } catch (err: unknown) {
        // Rechazo del usuario o reversion: volver a un estado limpio (FR-021).
        setPhase("failed");
        setError(messageFromError(err));
        return false;
      }
    },
    [invalidateKeys, queryClient],
  );

  return { phase, error, txHash, run, reset };
}

function messageFromError(err: unknown): string {
  const e = err as { code?: string | number; shortMessage?: string; message?: string };
  if (e?.code === "ACTION_REJECTED" || e?.code === 4001) {
    return "Rechazaste la firma en la wallet.";
  }
  return e?.shortMessage ?? e?.message ?? "La transacción falló.";
}
