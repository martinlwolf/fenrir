import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TxFeedback } from "./TxFeedback";
import { useWallet } from "@/providers/WalletProvider";
import { useWrite } from "@/hooks/useWrite";
import {
  cancelExpiredFunding,
  cancelStalledMilestone,
  pokeFundingGates,
} from "@/lib/chain/contracts";
import type { ProjectDetailResponse } from "@shared/schemas/project.schema";

// Acciones de mantenimiento / casos borde que destraban un proyecto. El backend decide los
// estados derivados y las capabilities (project.maintenance); la UI solo ofrece el control en el
// contexto plausible y el contrato revalida cada precondición al firmar.
export function MaintenancePanel({ project }: { project: ProjectDetailResponse }) {
  const { address, isOnSepolia } = useWallet();
  const { phase, error, run } = useWrite([
    ["project", project.address],
    ["proposals", project.address],
  ]);
  const busy = phase === "signing" || phase === "mining" || phase === "propagating";

  const { fundingExpired, stalled, canCancelStalled } = project.maintenance;
  const building = project.status === "Building";

  const showCard = fundingExpired || building;
  if (!showCard) return null;

  const ready = !!address && isOnSepolia;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Mantenimiento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fundingExpired && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              El fondeo venció sin alcanzar el mínimo (FMPA). Se puede cancelar el proyecto para
              habilitar el reembolso total.
            </p>
            {ready && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void run(() => cancelExpiredFunding(project.address))}
              >
                Cancelar fondeo vencido
              </Button>
            )}
          </div>
        )}

        {building && (
          <div className="space-y-2">
            {stalled.active && (
              <div className="space-y-1 rounded-md bg-amber-50 px-2 py-1.5 dark:bg-amber-950/40">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  El proyecto está <strong>estancado</strong>: {stalled.reason}. Cualquier inversor
                  puede cancelarlo para habilitar el reembolso proporcional de las tranches no
                  aprobadas.
                </p>
                {ready && canCancelStalled.allowed ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => void run(() => cancelStalledMilestone(project.address))}
                  >
                    Cancelar proyecto estancado
                  </Button>
                ) : (
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                    {canCancelStalled.reason}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Destrabar la liberación de tranches pendientes o la apertura de votación.
              </p>
              {ready && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(() => pokeFundingGates(project.address))}
                >
                  Destrabar tranches
                </Button>
              )}
            </div>
          </div>
        )}

        <TxFeedback phase={phase} error={error} />
      </CardContent>
    </Card>
  );
}
