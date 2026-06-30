import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState, ErrorState } from "@/components/domain/states";
import { PageHeader } from "@/components/domain/PageHeader";
import { CertificatePill } from "@/components/domain/CertificateBadge";
import { TxFeedback } from "@/components/domain/TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useInvestments, useClaimable } from "@/hooks/useInvestments";
import { useProject } from "@/hooks/useProject";
import { useWrite } from "@/hooks/useWrite";
import { claimDistribution, claimRefund } from "@/lib/chain/contracts";
import { formatWei, shortAddress } from "@/lib/format";
import { TransferFdtDialog } from "@/components/domain/TransferFdtDialog";
import type { InvestmentResponse } from "@shared/schemas/project.schema";
import type { ClaimTypeValue } from "@shared/constants/enums";

function ClaimButton({ projectAddress, type }: { projectAddress: string; type: ClaimTypeValue }) {
  const wallet = useWallet().address;
  const { phase, error, run } = useWrite([["claimable", wallet]]);
  const busy = phase === "signing" || phase === "mining" || phase === "propagating";
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        disabled={busy}
        onClick={() =>
          void run(() =>
            type === "Refund" ? claimRefund(projectAddress) : claimDistribution(projectAddress),
          )
        }
      >
        {busy ? "Procesando…" : type === "Refund" ? "Reclamar reembolso" : "Reclamar reparto"}
      </Button>
      <TxFeedback phase={phase} error={error} />
    </div>
  );
}

// Fila de inversión: muestra el monto y, resolviendo el tokenAddress del proyecto, permite
// transferir el FDT de esa participación a otra wallet.
function InvestmentRow({ inv }: { inv: InvestmentResponse }) {
  const { data: project } = useProject(inv.projectAddress);
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--fen-divider)] py-2.5 last:border-0">
      <Link
        to={`/projects/${inv.projectAddress}`}
        className="flex items-center gap-2 font-medium text-[var(--fen-ink)] hover:text-[var(--fen-accent-strong)]"
      >
        <CertificatePill kind="fdt" label={project?.tokenSymbol ?? "FDT"} />
        <span className="font-mono text-sm text-[var(--fen-body)]">
          {shortAddress(inv.projectAddress)}
        </span>
      </Link>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-[var(--fen-ink)]">{formatWei(inv.amount)}</span>
        {project?.tokenAddress && <TransferFdtDialog tokenAddress={project.tokenAddress} />}
      </div>
    </div>
  );
}

export function MyPortfolioPage() {
  const { address } = useWallet();
  const investments = useInvestments(address);
  const claimable = useClaimable(address);

  if (!address) {
    return (
      <EmptyState
        title="Conectá tu wallet"
        description="Necesitás conectar una wallet para ver tu participación."
      />
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Mi participación"
        title="Cartera de inversiones"
        description="Tus participaciones (FDT) en proyectos y lo que tenés disponible para reclamar."
      />

      <Card className="animate-fade-up">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Inversiones</CardTitle>
        </CardHeader>
        <CardContent>
          {investments.isLoading ? (
            <LoadingState />
          ) : investments.isError ? (
            <ErrorState onRetry={() => void investments.refetch()} />
          ) : !investments.data || investments.data.length === 0 ? (
            <EmptyState title="Todavía no invertiste" />
          ) : (
            <div className="space-y-2">
              {investments.data.map((inv) => (
                <InvestmentRow key={inv.projectAddress} inv={inv} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Para reclamar</CardTitle>
        </CardHeader>
        <CardContent>
          {claimable.isLoading ? (
            <LoadingState />
          ) : !claimable.data || claimable.data.items.length === 0 ? (
            <EmptyState title="Nada para reclamar por ahora" />
          ) : (
            <div className="space-y-3">
              {claimable.data.items.map((item) => (
                <div
                  key={`${item.projectAddress}-${item.type}`}
                  className="flex items-center justify-between gap-4 border-b py-2 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {item.type === "Refund" ? "Reembolso" : "Reparto"}
                    </Badge>
                    <Link to={`/projects/${item.projectAddress}`} className="hover:underline">
                      {shortAddress(item.projectAddress)}
                    </Link>
                    <span className="font-medium">{formatWei(item.amount)}</span>
                  </div>
                  <ClaimButton projectAddress={item.projectAddress} type={item.type} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
