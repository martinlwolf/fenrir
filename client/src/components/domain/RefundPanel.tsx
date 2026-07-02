import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TxFeedback } from "./TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useWrite } from "@/hooks/useWrite";
import { useClaimable } from "@/hooks/useInvestments";
import { claimRefund } from "@/lib/chain/contracts";
import { formatWei } from "@/lib/format";
import type { ProjectStatusValue } from "@shared/constants/enums";

export function RefundPanel({
  projectAddress,
  projectStatus,
}: {
  projectAddress: string;
  projectStatus: ProjectStatusValue;
}) {
  const { address, isOnSepolia, connect, switchNetwork, hasWallet } = useWallet();
  const { data: claimable } = useClaimable(address);
  const { phase, error, run } = useWrite([
    ["claimable", address],
    ["project", projectAddress],
  ]);
  const busy = phase === "signing" || phase === "mining" || phase === "propagating";

  const refundItem = claimable?.items.find(
    (i) => i.projectAddress === projectAddress && i.type === "Refund",
  );

  // Solo aparece si el proyecto está cancelado y hay un reembolso reclamable para esta wallet.
  if (projectStatus !== "Cancelled" || !refundItem || BigInt(refundItem.amount) <= 0n) return null;

  return (
    <Card className="border-amber-300 dark:border-amber-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Reembolso disponible</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          El proyecto fue cancelado. Te corresponde un reembolso proporcional de{" "}
          <strong>{formatWei(refundItem.amount)}</strong> por tu FDT.
        </p>
        {!hasWallet ? (
          <p className="text-xs text-muted-foreground">Necesitás una wallet para reclamar.</p>
        ) : !address ? (
          <Button size="sm" onClick={() => void connect()}>
            Conectar wallet
          </Button>
        ) : !isOnSepolia ? (
          <Button size="sm" variant="destructive" onClick={() => void switchNetwork()}>
            Cambiar a Sepolia
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => void run(() => claimRefund(projectAddress))}
          >
            {busy ? "Procesando…" : "Reclamar reembolso"}
          </Button>
        )}
        <TxFeedback phase={phase} error={error} />
      </CardContent>
    </Card>
  );
}
