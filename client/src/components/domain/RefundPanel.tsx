import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TxFeedback } from "./TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useWrite } from "@/hooks/useWrite";
import { useRefundInfo } from "@/hooks/useRefundInfo";
import { claimRefund } from "@/lib/chain/contracts";
import { formatWei } from "@/lib/format";

// Reembolso de un proyecto cancelado. Lee el estado DIRECTO de on-chain (status + balance FDT +
// refundPool), no del backend espejo, así el botón aparece aunque el ingestion no haya espejado
// la cancelación. La precondición real la valida igual el contrato en claimRefund().
export function RefundPanel({ projectAddress }: { projectAddress: string }) {
  const { address, isOnSepolia, connect, switchNetwork, hasWallet } = useWallet();
  const { data } = useRefundInfo(projectAddress, address);
  const { phase, error, run } = useWrite([
    ["refund-info", projectAddress, address],
    ["claimable", address],
    ["project", projectAddress],
  ]);
  const busy = phase === "signing" || phase === "mining" || phase === "propagating";

  // Solo aparece si on-chain hay algo para reclamar para esta wallet.
  if (!data?.cancelled || data.claimable <= 0n) return null;

  return (
    <Card className="border-amber-300 dark:border-amber-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Reembolso disponible</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          El proyecto fue cancelado. Te corresponde un reembolso proporcional de{" "}
          <strong>{formatWei(data.claimable.toString())}</strong> por tu FDT.
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
