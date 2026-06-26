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
import { submitOffer } from "@/lib/chain/contracts";
import { ethToWei } from "@/lib/format";

// Comprador: enviar una oferta depositando el monto (submitOffer payable) (FR-016).
export function MakeOfferDialog({ projectAddress }: { projectAddress: string }) {
  const { address, isOnSepolia, connect, switchNetwork, hasWallet } = useWallet();
  const { phase, error, run, reset } = useWrite([["offers", projectAddress]]);
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
    const ok = await run(() => submitOffer(projectAddress, wei));
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
        <Button>Hacer oferta</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ofertar por el inmueble</DialogTitle>
          <DialogDescription>
            Depositás el monto ofertado; si no resultás elegido, se reembolsa automáticamente.
          </DialogDescription>
        </DialogHeader>

        {!hasWallet ? (
          <p className="text-sm text-muted-foreground">Necesitás una wallet para ofertar.</p>
        ) : !address ? (
          <Button onClick={() => void connect()}>Conectar wallet</Button>
        ) : !isOnSepolia ? (
          <Button variant="destructive" onClick={() => void switchNetwork()}>
            Cambiar a Sepolia
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="offer-amount">Monto (ETH)</Label>
              <Input
                id="offer-amount"
                inputMode="decimal"
                placeholder="80"
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
          {address && isOnSepolia && (
            <Button onClick={() => void onSubmit()} disabled={busy || !amount}>
              {busy ? "Procesando…" : "Depositar y ofertar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
