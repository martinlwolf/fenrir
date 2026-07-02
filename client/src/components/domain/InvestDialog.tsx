import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TxFeedback } from "./TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useWrite } from "@/hooks/useWrite";
import { investInProject } from "@/lib/chain/contracts";
import { ethToWei } from "@/lib/format";
import type { Capability } from "@shared/schemas/common.schema";

// Invertir SepoliaETH en un proyecto en Funding. Firma directa contra el contrato
// (invest() payable). Si permitir invertir lo decide el backend via `invest` (capability del
// viewer); el front no reimplementa la regla. La validacion propia es solo de formato del monto,
// y el contrato valida el resto al firmar.
export function InvestDialog({
  projectAddress,
  invest,
}: {
  projectAddress: string;
  invest: Capability;
}) {
  const { address, isOnSepolia, hasWallet, connect, switchNetwork } = useWallet();
  const { phase, error, run, reset } = useWrite([["project", projectAddress], ["investments", address]]);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const busy = phase === "signing" || phase === "mining" || phase === "propagating";

  async function onSubmit() {
    setFormError(null);
    let wei: bigint;
    try {
      wei = ethToWei(amount);
      if (wei <= 0n) throw new Error();
    } catch {
      setFormError("Ingresá un monto válido en ETH.");
      return;
    }
    const ok = await run(() => investInProject(projectAddress, wei));
    if (ok) setTimeout(() => setOpen(false), 1200);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          reset();
          setAmount("");
          setFormError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Invertir</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invertir en el proyecto</DialogTitle>
          <DialogDescription>
            Aportás SepoliaETH y recibís FDT proporcional. Se firma en tu wallet.
          </DialogDescription>
        </DialogHeader>

        {!hasWallet ? (
          <p className="text-sm text-muted-foreground">
            Necesitás una wallet (MetaMask) para invertir.
          </p>
        ) : !address ? (
          <Button onClick={() => void connect()}>Conectar wallet</Button>
        ) : !isOnSepolia ? (
          <Button variant="destructive" onClick={() => void switchNetwork()}>
            Cambiar a Sepolia
          </Button>
        ) : !invest.allowed ? (
          // Wallet lista pero el backend no habilita invertir (ronda cerrada, es el developer,
          // etc.): mostramos el motivo que resolvio el backend, sin reimplementar la regla.
          <p className="text-sm text-muted-foreground">
            {invest.reason ?? "No podés invertir en este proyecto ahora."}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Monto (ETH)</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="0.5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={busy}
              />
              {formError && <p className="text-sm text-destructive">{formError}</p>}
            </div>
            <TxFeedback phase={phase} error={error} />
          </div>
        )}

        <DialogFooter>
          {address && isOnSepolia && invest.allowed && (
            <Button onClick={() => void onSubmit()} disabled={busy || !amount}>
              {busy ? "Procesando…" : "Confirmar inversión"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
