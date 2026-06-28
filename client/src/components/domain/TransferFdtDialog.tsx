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
import { transferFdt } from "@/lib/chain/contracts";
import { ethToWei } from "@/lib/format";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

// Transferir FDT a otra wallet. El FDT tiene 18 decimales y se mintea 1:1 con el wei
// invertido, así que la cantidad se ingresa como un decimal (igual que ETH). El contrato
// valida el balance; acá solo validamos formato.
export function TransferFdtDialog({ tokenAddress }: { tokenAddress: string }) {
  const { address, isOnSepolia } = useWallet();
  const { phase, error, run, reset } = useWrite([["investments", address]]);
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const busy = phase === "signing" || phase === "mining" || phase === "propagating";

  async function onSubmit() {
    setFormError(null);
    if (!ADDRESS_RE.test(to)) {
      setFormError("Ingresá una dirección de destino válida (0x…).");
      return;
    }
    let wei: bigint;
    try {
      wei = ethToWei(amount);
      if (wei <= 0n) throw new Error();
    } catch {
      setFormError("Ingresá una cantidad de FDT válida.");
      return;
    }
    const ok = await run(() => transferFdt(tokenAddress, to, wei));
    if (ok) setTimeout(() => setOpen(false), 1200);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          reset();
          setTo("");
          setAmount("");
          setFormError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!address || !isOnSepolia}>
          Transferir FDT
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir FDT</DialogTitle>
          <DialogDescription>
            Enviás parte de tu participación (FDT) a otra wallet. Se firma en tu wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="to">Destino</Label>
            <Input
              id="to"
              placeholder="0x…"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fdt-amount">Cantidad de FDT</Label>
            <Input
              id="fdt-amount"
              inputMode="decimal"
              placeholder="0.5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <TxFeedback phase={phase} error={error} />
        </div>

        <DialogFooter>
          <Button onClick={() => void onSubmit()} disabled={busy || !to || !amount}>
            {busy ? "Procesando…" : "Confirmar transferencia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
